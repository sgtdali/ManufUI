-- Migration: Add planner_task_id to manuf_action_items and update trigger payload
-- Date: 2026-06-28
-- Author: Antigravity

-- 1. Add planner_task_id column to manuf_action_items table if not exists
ALTER TABLE public.manuf_action_items 
  ADD COLUMN IF NOT EXISTS planner_task_id text;

-- 2. Update notify_assignee_on_task_assignment trigger function to support sync
CREATE OR REPLACE FUNCTION notify_assignee_on_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
  card_payload jsonb;
  teams_url text;
  is_enabled boolean := true;
  subject_text text;
  body_text text;
  v_event_type text;
BEGIN
  -- Get webhook from automations table
  SELECT webhook_url, is_active INTO teams_url, is_enabled FROM manuf_automations WHERE id = 'action_item_assignee_trigger';
  
  -- If automation is disabled or webhook is not set, exit
  IF NOT is_enabled OR teams_url IS NULL OR teams_url = '' THEN
    RETURN NEW;
  END IF;

  -- Sadece şu durumlarda tetiklensin:
  -- 1. INSERT (Yeni aksiyon açıldığında ve sorumlusu boş değilse)
  -- 2. UPDATE (Sorumlu değiştiğinde/atandığında veya başlık/termin değiştiğinde ve sorumlusu varsa)
  IF (TG_OP = 'INSERT' AND NEW.assignee_email IS NOT NULL AND NEW.assignee_email <> '') OR
     (TG_OP = 'UPDATE' AND 
       (
         OLD.assignee_email IS DISTINCT FROM NEW.assignee_email OR 
         OLD.title IS DISTINCT FROM NEW.title OR 
         OLD.due_date IS DISTINCT FROM NEW.due_date
       ) AND 
       NEW.assignee_email IS NOT NULL AND NEW.assignee_email <> ''
     ) THEN
    
    -- Event type is CREATE if planner_task_id is null, otherwise UPDATE
    IF NEW.planner_task_id IS NULL OR NEW.planner_task_id = '' THEN
      v_event_type := 'CREATE';
      subject_text := 'Yeni Görev Atandı: ' || coalesce(NEW.title, '');
      body_text := 'Merhaba, size yeni bir aksiyon maddesi atandı. Hücre: ' || coalesce(NEW.cell, '-') || ', Termin: ' || coalesce(NEW.due_date::text, 'Yok') || ', Detay: ' || coalesce(NEW.title, '');
    ELSE
      v_event_type := 'UPDATE';
      subject_text := 'Görev Güncellendi: ' || coalesce(NEW.title, '');
      body_text := 'Merhaba, size atanan aksiyon maddesi güncellendi. Hücre: ' || coalesce(NEW.cell, '-') || ', Termin: ' || coalesce(NEW.due_date::text, 'Yok') || ', Yeni Detay: ' || coalesce(NEW.title, '');
    END IF;

    -- Teams'e gidecek kart içeriği
    card_payload := jsonb_build_object(
      'type', 'AdaptiveCard',
      '$schema', 'http://adaptivecards.io/schemas/adaptive-card.json',
      'version', '1.2',
      'body', jsonb_build_array(
        jsonb_build_object(
          'type', 'TextBlock',
          'text', CASE WHEN v_event_type = 'CREATE' THEN '📌 Size Yeni Görev Atandı' ELSE '🔄 Göreviniz Güncellendi' END,
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
    payload := jsonb_build_object(
      'action_item_id', NEW.id::text,
      'planner_task_id', coalesce(NEW.planner_task_id, ''),
      'event_type', v_event_type,
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
