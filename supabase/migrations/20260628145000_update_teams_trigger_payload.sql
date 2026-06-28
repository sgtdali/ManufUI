-- Migration: Update Teams trigger payload to support dynamic routing (Email + Teams)
-- Date: 2026-06-28
-- Author: Antigravity

CREATE OR REPLACE FUNCTION notify_teams_on_action_item()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
  card_payload jsonb;
  teams_url text;
  event_title text;
  event_color text;
  is_enabled boolean := true;
  subject_text text;
  body_text text;
BEGIN
  -- Get webhook from automations table
  SELECT webhook_url, is_active INTO teams_url, is_enabled FROM manuf_automations WHERE id = 'action_item_trigger';
  
  -- If automation is disabled or webhook is not set, exit
  IF NOT is_enabled OR teams_url IS NULL OR teams_url = '' THEN
    RETURN NEW;
  END IF;

  -- Determine event title, subject, body and card accent color based on action type
  IF (TG_OP = 'INSERT') THEN
    event_title := '📌 Yeni Aksiyon Maddesi';
    event_color := 'Good'; -- Greenish border
    subject_text := 'Yeni Görev Atandı: ' || coalesce(NEW.title, '');
    body_text := 'Merhaba, size yeni bir aksiyon maddesi atandı. Hücre: ' || coalesce(NEW.cell, '-') || ', Termin: ' || coalesce(NEW.due_date::text, 'Yok') || ', Detay: ' || coalesce(NEW.title, '');
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Only trigger notification when status transitions to 'Tamamlandı'
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Tamamlandı') THEN
      event_title := '✅ Aksiyon Tamamlandı!';
      event_color := 'Accent'; -- Blueish border
      subject_text := 'Aksiyon Tamamlandı: ' || coalesce(NEW.title, '');
      body_text := 'Merhaba, atadığınız aksiyon tamamlandı olarak işaretlendi. Hücre: ' || coalesce(NEW.cell, '-') || ', Sorumlu: ' || coalesce(NEW.assignee, '-') || ', Detay: ' || coalesce(NEW.title, '');
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Build the Adaptive Card payload conforming to Microsoft Teams schema
  card_payload := jsonb_build_object(
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
