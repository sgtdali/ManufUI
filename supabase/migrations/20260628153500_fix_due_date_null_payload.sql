-- Migration: Fix due_date null serialization in trigger payload
-- Date: 2026-06-28
-- Author: Antigravity

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

  -- Sadece şu durumlarda tetiklensin:
  -- 1. INSERT (Yeni aksiyon açıldığında ve sorumlusu boş değilse)
  -- 2. UPDATE (Sorumlu değiştiğinde ve yeni sorumlu boş değilse)
  IF (TG_OP = 'INSERT' AND NEW.assignee_email IS NOT NULL AND NEW.assignee_email <> '') OR
     (TG_OP = 'UPDATE' AND OLD.assignee_email IS DISTINCT FROM NEW.assignee_email AND NEW.assignee_email IS NOT NULL AND NEW.assignee_email <> '') THEN
    
    subject_text := 'Yeni Görev Atandı: ' || coalesce(NEW.title, '');
    body_text := 'Merhaba, size yeni bir aksiyon maddesi atandı. Hücre: ' || coalesce(NEW.cell, '-') || ', Termin: ' || coalesce(NEW.due_date::text, 'Yok') || ', Detay: ' || coalesce(NEW.title, '');

    -- Teams'e gidecek kart içeriği
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

    -- Power Automate'in kolayca okuyabileceği üst veri paketi
    -- 'due_date' null ise direkt json'da null olacak (boş string "" yerine), böylece Planner hata vermeyecek.
    payload := jsonb_build_object(
      'email', coalesce(NEW.assignee_email, ''),
      'name', coalesce(NEW.assignee, ''),
      'subject', subject_text,
      'body_text', body_text,
      'due_date', NEW.due_date,
      'card', card_payload
    );

    -- Power Automate'e isteği asenkron gönder
    PERFORM net.http_post(
      url := teams_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := payload
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
