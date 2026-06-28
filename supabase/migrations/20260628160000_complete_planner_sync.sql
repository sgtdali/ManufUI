-- Migration: Complete Planner Sync - Status sync + reverse sync support
-- Date: 2026-06-28
-- Author: Antigravity

-- 1. Update notify_assignee_on_task_assignment to also handle status changes (Tamamlandı → Planner)
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
  v_card_title text;
  v_card_color text;
BEGIN
  -- Get webhook from automations table
  SELECT webhook_url, is_active INTO teams_url, is_enabled FROM manuf_automations WHERE id = 'action_item_assignee_trigger';

  -- If automation is disabled or webhook is not set, exit
  IF NOT is_enabled OR teams_url IS NULL OR teams_url = '' THEN
    RETURN NEW;
  END IF;

  -- Determine event type and whether to fire
  -- Case 1: New task with assignee (CREATE)
  IF (TG_OP = 'INSERT' AND NEW.assignee_email IS NOT NULL AND NEW.assignee_email <> '') THEN
    v_event_type := 'CREATE';
    subject_text := 'Yeni Görev Atandı: ' || coalesce(NEW.title, '');
    body_text := 'Merhaba, size yeni bir aksiyon maddesi atandı. Hücre: ' || coalesce(NEW.cell, '-') || ', Termin: ' || coalesce(NEW.due_date::text, 'Yok') || ', Detay: ' || coalesce(NEW.title, '');
    v_card_title := '📌 Size Yeni Görev Atandı';
    v_card_color := 'Good';

  -- Case 2: Status changed to Tamamlandı and has planner_task_id (COMPLETE)
  ELSIF (TG_OP = 'UPDATE' AND
         OLD.status IS DISTINCT FROM NEW.status AND
         NEW.status = 'Tamamlandı' AND
         NEW.planner_task_id IS NOT NULL AND NEW.planner_task_id <> '') THEN
    v_event_type := 'COMPLETE';
    subject_text := 'Görev Tamamlandı: ' || coalesce(NEW.title, '');
    body_text := 'Görev "' || coalesce(NEW.title, '') || '" tamamlandı olarak işaretlendi. Hücre: ' || coalesce(NEW.cell, '-') || ', Sorumlu: ' || coalesce(NEW.assignee, '-');
    v_card_title := '✅ Görev Tamamlandı';
    v_card_color := 'Accent';

  -- Case 3: Status changed to Devam Ediyor and has planner_task_id (IN_PROGRESS)
  ELSIF (TG_OP = 'UPDATE' AND
         OLD.status IS DISTINCT FROM NEW.status AND
         NEW.status = 'Devam Ediyor' AND
         NEW.planner_task_id IS NOT NULL AND NEW.planner_task_id <> '') THEN
    v_event_type := 'STATUS_UPDATE';
    subject_text := 'Görev Devam Ediyor: ' || coalesce(NEW.title, '');
    body_text := 'Görev "' || coalesce(NEW.title, '') || '" devam ediyor olarak güncellendi. Hücre: ' || coalesce(NEW.cell, '-');
    v_card_title := '🔄 Görev Güncellendi';
    v_card_color := 'Good';

  -- Case 4: Assignee/title/due_date changed and has assignee (UPDATE)
  ELSIF (TG_OP = 'UPDATE' AND
         (
           OLD.assignee_email IS DISTINCT FROM NEW.assignee_email OR
           OLD.title IS DISTINCT FROM NEW.title OR
           OLD.due_date IS DISTINCT FROM NEW.due_date
         ) AND
         NEW.assignee_email IS NOT NULL AND NEW.assignee_email <> '') THEN
    IF NEW.planner_task_id IS NULL OR NEW.planner_task_id = '' THEN
      v_event_type := 'CREATE';
      subject_text := 'Yeni Görev Atandı: ' || coalesce(NEW.title, '');
      body_text := 'Merhaba, size yeni bir aksiyon maddesi atandı. Hücre: ' || coalesce(NEW.cell, '-') || ', Termin: ' || coalesce(NEW.due_date::text, 'Yok') || ', Detay: ' || coalesce(NEW.title, '');
      v_card_title := '📌 Size Yeni Görev Atandı';
      v_card_color := 'Good';
    ELSE
      v_event_type := 'UPDATE';
      subject_text := 'Görev Güncellendi: ' || coalesce(NEW.title, '');
      body_text := 'Merhaba, size atanan aksiyon maddesi güncellendi. Hücre: ' || coalesce(NEW.cell, '-') || ', Termin: ' || coalesce(NEW.due_date::text, 'Yok') || ', Yeni Detay: ' || coalesce(NEW.title, '');
      v_card_title := '🔄 Göreviniz Güncellendi';
      v_card_color := 'Good';
    END IF;

  ELSE
    RETURN NEW;
  END IF;

  -- Teams Adaptive Card
  card_payload := jsonb_build_object(
    'type', 'AdaptiveCard',
    '$schema', 'http://adaptivecards.io/schemas/adaptive-card.json',
    'version', '1.2',
    'body', jsonb_build_array(
      jsonb_build_object(
        'type', 'TextBlock',
        'text', v_card_title,
        'weight', 'Bolder',
        'size', 'Medium',
        'color', v_card_color
      ),
      jsonb_build_object(
        'type', 'FactSet',
        'facts', jsonb_build_array(
          jsonb_build_object('title', 'Hücre:', 'value', coalesce(NEW.cell, '-')),
          jsonb_build_object('title', 'Aksiyon:', 'value', coalesce(NEW.title, '-')),
          jsonb_build_object('title', 'Sorumlu:', 'value', coalesce(NEW.assignee, '-')),
          jsonb_build_object('title', 'Durum:', 'value', coalesce(NEW.status, '-')),
          jsonb_build_object('title', 'Termin:', 'value', coalesce(NEW.due_date::text, '-'))
        )
      )
    )
  );

  -- Power Automate payload
  payload := jsonb_build_object(
    'action_item_id', NEW.id::text,
    'planner_task_id', coalesce(NEW.planner_task_id, ''),
    'event_type', v_event_type,
    'status', NEW.status,
    'email', coalesce(NEW.assignee_email, ''),
    'name', coalesce(NEW.assignee, ''),
    'subject', subject_text,
    'body_text', body_text,
    'due_date', NEW.due_date,
    'cell', coalesce(NEW.cell, ''),
    'title', coalesce(NEW.title, ''),
    'card', card_payload
  );

  PERFORM net.http_post(
    url := teams_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Register the Planner sync automation entries if not exist
INSERT INTO manuf_automations (id, type, name, source_event, target_function, webhook_url, description, is_active)
VALUES (
  'planner_callback',
  'trigger',
  'Planner Görev ID Geri Yazımı',
  'Power Automate → /api/planner-callback',
  'API Route (POST)',
  '',
  'Power Automate Planner görevi oluşturduktan sonra planner_task_id değerini geri yazmak için kullanılan callback endpoint.',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO manuf_automations (id, type, name, source_event, target_function, webhook_url, description, is_active)
VALUES (
  'planner_reverse_sync',
  'trigger',
  'Planner → ManufUI Durum Senkronizasyonu',
  'Power Automate → /api/planner-sync',
  'API Route (POST)',
  '',
  'Planner''da tamamlanan görevlerin ManufUI''daki durumunu otomatik güncelleyen ters yön senkronizasyon endpoint.',
  true
)
ON CONFLICT (id) DO NOTHING;
