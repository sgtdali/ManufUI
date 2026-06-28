-- Migration: Add Assignee Task Assignment Trigger and Restore General Trigger
-- Date: 2026-06-28
-- Author: Antigravity

-- 1. Restore the general trigger function to its original state (sending only card to action_item_trigger webhook)
CREATE OR REPLACE FUNCTION notify_teams_on_action_item()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
  teams_url text;
  event_title text;
  event_color text;
  is_enabled boolean := true;
BEGIN
  -- Get webhook from automations table
  SELECT webhook_url, is_active INTO teams_url, is_enabled FROM manuf_automations WHERE id = 'action_item_trigger';
  
  -- If automation is disabled or webhook is not set, exit
  IF NOT is_enabled OR teams_url IS NULL OR teams_url = '' THEN
    RETURN NEW;
  END IF;

  -- Determine event title and card accent color based on action type
  IF (TG_OP = 'INSERT') THEN
    event_title := '📌 Yeni Aksiyon Maddesi';
    event_color := 'Good'; -- Greenish border
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Only trigger notification when status transitions to 'Tamamlandı'
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Tamamlandı') THEN
      event_title := '✅ Aksiyon Tamamlandı!';
      event_color := 'Accent'; -- Blueish border
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Build the Adaptive Card payload conforming to Microsoft Teams schema
  payload := jsonb_build_object(
    'type', 'AdaptiveCard',
    '$schema', 'http://adaptivecards.io/schemas/adaptive-card.json',
    'version', '1.2',
    'body', jsonb_build_array(
      jsonb_build_object(
        'type', 'TextBlock',
        'text', event_title,
        'weight', 'Bolder',
        'size', 'Medium',
        'color', event_color
      ),
      jsonb_build_object(
        'type', 'FactSet',
        'facts', jsonb_build_array(
          jsonb_build_object('title', 'Hücre:', 'value', coalesce(NEW.cell, '-')),
          jsonb_build_object('title', 'Aksiyon:', 'value', coalesce(NEW.title, '-')),
          jsonb_build_object('title', 'Sorumlu:', 'value', coalesce(NEW.assignee, '-')),
          jsonb_build_object('title', 'E-posta:', 'value', coalesce(NEW.assignee_email, '-')),
          jsonb_build_object('title', 'Termin:', 'value', coalesce(NEW.due_date::text, '-'))
        )
      )
    )
  );

  -- Perform the asynchronous HTTP POST request to the Teams Webhook URL
  PERFORM net.http_post(
    url := teams_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Restore the original webhook URL for action_item_trigger
UPDATE manuf_automations
SET webhook_url = 'https://defaultf7bf3ca5444c4640b15d4ad9a8bc7f.82.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/8d45236face2416cb3cbd4162c44757d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=OoR5t6WOta7PXyTH8Eb7vZB-yGGRcvHeecddHZkr3ys'
WHERE id = 'action_item_trigger';

-- 3. Register the new assignee notification automation in manuf_automations
INSERT INTO manuf_automations (id, type, name, source_event, target_function, webhook_url, description, is_active)
VALUES (
  'action_item_assignee_trigger',
  'trigger',
  'Sorumlu Görev Atama Bildirimi',
  'manuf_action_items (INSERT/UPDATE - Sorumlu Değiştiğinde)',
  'notify_assignee_on_task_assignment()',
  'https://defaultf7bf3ca5444c4640b15d4ad9a8bc7f.82.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/22ed5ef2ee7b4ddfb9bd7d033081774d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=bc0w09CCx433hwMl1xDJAJ-CZ-V_0s6ySoB5fVIHx74',
  'Aksiyon takip sayfasında bir kişiye yeni görev atandığında veya görev sorumlusu değiştirildiğinde o kişiye Teams ve E-posta bildirimi gönderir.',
  true
)
ON CONFLICT (id) DO UPDATE SET
  webhook_url = EXCLUDED.webhook_url,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- 4. Create new trigger function to notify specific assignee on assignment
CREATE OR REPLACE FUNCTION notify_assignee_on_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
  card_payload jsonb;
  teams_url text;
  is_enabled boolean := true;
  subject_text text;
  body_text text;
BEGIN
  -- Get webhook from automations table
  SELECT webhook_url, is_active INTO teams_url, is_enabled FROM manuf_automations WHERE id = 'action_item_assignee_trigger';
  
  -- If automation is disabled or webhook is not set, exit
  IF NOT is_enabled OR teams_url IS NULL OR teams_url = '' THEN
    RETURN NEW;
  END IF;

  -- Check if this is an assignment event:
  -- 1. INSERT: assignee_email is provided
  -- 2. UPDATE: assignee_email is changed and is not null
  IF (TG_OP = 'INSERT' AND NEW.assignee_email IS NOT NULL AND NEW.assignee_email <> '') OR
     (TG_OP = 'UPDATE' AND OLD.assignee_email IS DISTINCT FROM NEW.assignee_email AND NEW.assignee_email IS NOT NULL AND NEW.assignee_email <> '') THEN
    
    subject_text := 'Yeni Görev Atandı: ' || coalesce(NEW.title, '');
    body_text := 'Merhaba, size yeni bir aksiyon maddesi atandı. Hücre: ' || coalesce(NEW.cell, '-') || ', Termin: ' || coalesce(NEW.due_date::text, 'Yok') || ', Detay: ' || coalesce(NEW.title, '');

    -- Build the Adaptive Card payload conforming to Microsoft Teams schema
    card_payload := jsonb_build_object(
      'type', 'AdaptiveCard',
      '$schema', 'http://adaptivecards.io/schemas/adaptive-card.json',
      'version', '1.2',
      'body', jsonb_build_array(
        jsonb_build_object(
          'type', 'TextBlock',
          'text', '📌 Size Yeni Görev Atandı',
          'weight', 'Bolder',
          'size', 'Medium',
          'color', 'Good'
        ),
        jsonb_build_object(
          'type', 'FactSet',
          'facts', jsonb_build_array(
            jsonb_build_object('title', 'Hücre:', 'value', coalesce(NEW.cell, '-')),
            jsonb_build_object('title', 'Aksiyon:', 'value', coalesce(NEW.title, '-')),
            jsonb_build_object('title', 'Sorumlu:', 'value', coalesce(NEW.assignee, '-')),
            jsonb_build_object('title', 'E-posta:', 'value', coalesce(NEW.assignee_email, '-')),
            jsonb_build_object('title', 'Termin:', 'value', coalesce(NEW.due_date::text, '-'))
          )
        )
      )
    );

    -- Build top-level payload for Power Automate (contains email and subject separately)
    payload := jsonb_build_object(
      'email', coalesce(NEW.assignee_email, ''),
      'name', coalesce(NEW.assignee, ''),
      'subject', subject_text,
      'body_text', body_text,
      'card', card_payload
    );

    -- Perform the asynchronous HTTP POST request to the Teams Webhook URL
    PERFORM net.http_post(
      url := teams_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := payload
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for assignee notification on action items
DROP TRIGGER IF EXISTS trigger_notify_assignee_on_task_assignment ON manuf_action_items;
CREATE TRIGGER trigger_notify_assignee_on_task_assignment
AFTER INSERT OR UPDATE ON manuf_action_items
FOR EACH ROW
EXECUTE FUNCTION notify_assignee_on_task_assignment();
