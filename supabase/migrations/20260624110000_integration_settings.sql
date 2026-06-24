-- Migration: Integration Mapping and Automation Dashboard Setup
-- Date: 2026-06-24
-- Author: Antigravity

-- Create manuf_automations table to store mappings and custom descriptions
CREATE TABLE IF NOT EXISTS manuf_automations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                -- 'cron' or 'trigger'
  name TEXT NOT NULL,                -- User-friendly name
  schedule TEXT,                     -- Cron schedule (if type is cron)
  source_event TEXT,                 -- Source table & event (if type is trigger)
  target_function TEXT NOT NULL,     -- pgSQL function name
  webhook_url TEXT,                  -- External webhook URL
  description TEXT,                  -- Editable notes/descriptions
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS and create allow_all policy
ALTER TABLE manuf_automations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'manuf_automations' AND policyname = 'allow_all'
  ) THEN
    CREATE POLICY allow_all ON manuf_automations FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Populate default automations
INSERT INTO manuf_automations (id, type, name, schedule, source_event, target_function, webhook_url, description)
VALUES 
  (
    'daily_report_cron', 
    'cron', 
    'Günlük Rapor E-posta Gönderimi', 
    '0 5 * * *', 
    NULL,
    'send_daily_production_email_func()', 
    'https://defaultf7bf3ca5444c4640b15d4ad9a8bc7f.82.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ef4954bd464e47709bfab718b0cdd5fc/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=PUrYTmfy1aEy1ivALvBaGGeD08FBwSYsN_Ur8PNXPyc',
    'Her sabah saat 08:00''de dünün üretim özetini Power Automate e-posta akışına gönderir.'
  ),
  (
    'action_item_trigger', 
    'trigger', 
    'Teams Aksiyon Bildirimleri', 
    NULL, 
    'manuf_action_items (INSERT/UPDATE)',
    'notify_teams_on_action_item()', 
    'https://defaultf7bf3ca5444c4640b15d4ad9a8bc7f.82.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/8d45236face2416cb3cbd4162c44757d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=OoR5t6WOta7PXyTH8Eb7vZB-yGGRcvHeecddHZkr3ys',
    'Aksiyon takip tablosunda yeni aksiyon maddesi açıldığında veya tamamlandı durumuna geçtiğinde Teams kanalına Adaptive Card formatında bildirim gönderir.'
  )
ON CONFLICT (id) DO UPDATE SET
  target_function = EXCLUDED.target_function,
  source_event = EXCLUDED.source_event,
  name = EXCLUDED.name;

-- Recreate notify_teams_on_action_item to read webhook dynamically
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

-- Recreate the daily production email database function with dynamic webhook lookup
CREATE OR REPLACE FUNCTION send_daily_production_email_func()
RETURNS void AS $$
DECLARE
  yesterday date;
  formatted_date text;
  html_body text;
  text_body text;
  payload jsonb;
  teams_payload jsonb;
  webhook_url text;
  teams_webhook_url text;
  is_enabled boolean := true;
  default_webhook_url text := 'https://defaultf7bf3ca5444c4640b15d4ad9a8bc7f.82.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ef4954bd464e47709bfab718b0cdd5fc/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=PUrYTmfy1aEy1ivALvBaGGeD08FBwSYsN_Ur8PNXPyc';
  
  -- Quantities for each cell
  qty_pres int := 0;
  qty_etm int := 0;
  qty_rob108 int := 0;
  qty_flowform int := 0;
  qty_rob104 int := 0;
  qty_n602_n603 int := 0;
  qty_rob109 int := 0;
  qty_quench int := 0;
  qty_rob110_111 int := 0;
  qty_fosfat int := 0;
  qty_boya int := 0;
  
  rec record;
BEGIN
  -- Get webhook from settings/automations table
  SELECT webhook_url, is_active INTO webhook_url, is_enabled FROM manuf_automations WHERE id = 'daily_report_cron';
  SELECT value INTO teams_webhook_url FROM manuf_settings WHERE key = 'teams_production_webhook';
  
  -- Exit if disabled
  IF NOT is_enabled THEN
    RETURN;
  END IF;

  -- Fallback to default if empty
  IF webhook_url IS NULL OR webhook_url = '' THEN
    webhook_url := default_webhook_url;
  END IF;

  -- Get yesterday's date in Turkey timezone (UTC+3)
  yesterday := (now() at time zone 'Europe/Istanbul' - interval '1 day')::date;
  formatted_date := to_char(yesterday, 'DD.MM.YYYY');
  
  -- Query sums from the tables
  FOR rec IN 
    SELECT r.bolum, SUM(coalesce(row.uretim_adeti, 0))::int as produced
    FROM manuf_production_records r
    LEFT JOIN manuf_production_rows row ON row.record_id = r.id
    WHERE r.tarih = yesterday
    GROUP BY r.bolum
  LOOP
    IF rec.bolum = 'Pres Hücresi' THEN qty_pres := rec.produced;
    ELSIF rec.bolum = 'ETM Hücresi' THEN qty_etm := rec.produced;
    ELSIF rec.bolum = 'ROB108 Hücresi' THEN qty_rob108 := rec.produced;
    ELSIF rec.bolum = 'Flowform Hücresi' THEN qty_flowform := rec.produced;
    ELSIF rec.bolum = 'ROB104 Hücresi' THEN qty_rob104 := rec.produced;
    ELSIF rec.bolum = 'N602 Hücresi' OR rec.bolum = 'N603 Hücresi' THEN 
      qty_n602_n603 := qty_n602_n603 + rec.produced;
    ELSIF rec.bolum = 'ROB109 Hücresi' THEN qty_rob109 := rec.produced;
    ELSIF rec.bolum = 'Quench Hücresi' THEN qty_quench := rec.produced;
    ELSIF rec.bolum = 'ROB110-111 Hücresi' THEN qty_rob110_111 := rec.produced;
    ELSIF rec.bolum = 'Fosfat Hücresi' THEN qty_fosfat := rec.produced;
    ELSIF rec.bolum = 'Boya Hücresi' THEN qty_boya := rec.produced;
    END IF;
  END LOOP;

  -- Build HTML body
  html_body := '
    <div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">
      <div style="border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #1e1b4b; margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.025em;">Repkon HF901 Günlük Üretim Raporu</h2>
        <p style="color: #6366f1; font-size: 13px; font-weight: 600; margin: 4px 0 0 0;">Tarih: ' || formatted_date || '</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <th style="padding: 10px 16px; color: #475569; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Hücre Adı</th>
            <th style="padding: 10px 16px; color: #475569; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; text-align: right;">Üretim Adeti</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e4e4e7;"><td style="padding: 12px 16px; color: #27272a; font-weight: 500; font-size: 14px;">Pres Hücresi</td><td style="padding: 12px 16px; color: #0f172a; text-align: right; font-weight: 700; font-size: 14px;">' || qty_pres::text || ' adet</td></tr>
          <tr style="border-bottom: 1px solid #e4e4e7;"><td style="padding: 12px 16px; color: #27272a; font-weight: 500; font-size: 14px;">ETM Hücresi</td><td style="padding: 12px 16px; color: #0f172a; text-align: right; font-weight: 700; font-size: 14px;">' || qty_etm::text || ' adet</td></tr>
          <tr style="border-bottom: 1px solid #e4e4e7;"><td style="padding: 12px 16px; color: #27272a; font-weight: 500; font-size: 14px;">ROB108 Hücresi</td><td style="padding: 12px 16px; color: #0f172a; text-align: right; font-weight: 700; font-size: 14px;">' || qty_rob108::text || ' adet</td></tr>
          <tr style="border-bottom: 1px solid #e4e4e7;"><td style="padding: 12px 16px; color: #27272a; font-weight: 500; font-size: 14px;">Flowform Hücresi</td><td style="padding: 12px 16px; color: #0f172a; text-align: right; font-weight: 700; font-size: 14px;">' || qty_flowform::text || ' adet</td></tr>
          <tr style="border-bottom: 1px solid #e4e4e7;"><td style="padding: 12px 16px; color: #27272a; font-weight: 500; font-size: 14px;">ROB104 Hücresi</td><td style="padding: 12px 16px; color: #0f172a; text-align: right; font-weight: 700; font-size: 14px;">' || qty_rob104::text || ' adet</td></tr>
          <tr style="border-bottom: 1px solid #e4e4e7;"><td style="padding: 12px 16px; color: #27272a; font-weight: 500; font-size: 14px;">N602-N603 Hücresi</td><td style="padding: 12px 16px; color: #0f172a; text-align: right; font-weight: 700; font-size: 14px;">' || qty_n602_n603::text || ' adet</td></tr>
          <tr style="border-bottom: 1px solid #e4e4e7;"><td style="padding: 12px 16px; color: #27272a; font-weight: 500; font-size: 14px;">ROB109 Hücresi</td><td style="padding: 12px 16px; color: #0f172a; text-align: right; font-weight: 700; font-size: 14px;">' || qty_rob109::text || ' adet</td></tr>
          <tr style="border-bottom: 1px solid #e4e4e7;"><td style="padding: 12px 16px; color: #27272a; font-weight: 500; font-size: 14px;">Quench Hücresi</td><td style="padding: 12px 16px; color: #0f172a; text-align: right; font-weight: 700; font-size: 14px;">' || qty_quench::text || ' adet</td></tr>
          <tr style="border-bottom: 1px solid #e4e4e7;"><td style="padding: 12px 16px; color: #27272a; font-weight: 500; font-size: 14px;">ROB110-111 Hücresi</td><td style="padding: 12px 16px; color: #0f172a; text-align: right; font-weight: 700; font-size: 14px;">' || qty_rob110_111::text || ' adet</td></tr>
          <tr style="border-bottom: 1px solid #e4e4e7;"><td style="padding: 12px 16px; color: #27272a; font-weight: 500; font-size: 14px;">Fosfat Hücresi</td><td style="padding: 12px 16px; color: #0f172a; text-align: right; font-weight: 700; font-size: 14px;">' || qty_fosfat::text || ' adet</td></tr>
          <tr style="border-bottom: 1px solid #e4e4e7;"><td style="padding: 12px 16px; color: #27272a; font-weight: 500; font-size: 14px;">Boya Hücresi</td><td style="padding: 12px 16px; color: #0f172a; text-align: right; font-weight: 700; font-size: 14px;">' || qty_boya::text || ' adet</td></tr>
        </tbody>
      </table>
      
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">Bu e-posta Supabase Cron Job ve ManufUI Performans Paneli üzerinden otomatik olarak tetiklenmiştir.</p>
      </div>
    </div>
  ';

  -- Build plain text body
  text_body := 'Repkon HF901 Günlük Üretim Raporu' || chr(10) ||
               'Tarih: ' || formatted_date || chr(10) || chr(10) ||
               'Pres Hücresi: ' || qty_pres || ' adet' || chr(10) ||
               'ETM Hücresi: ' || qty_etm || ' adet' || chr(10) ||
               'ROB108 Hücresi: ' || qty_rob108 || ' adet' || chr(10) ||
               'Flowform Hücresi: ' || qty_flowform || ' adet' || chr(10) ||
               'ROB104 Hücresi: ' || qty_rob104 || ' adet' || chr(10) ||
               'N602-N603 Hücresi: ' || qty_n602_n603 || ' adet' || chr(10) ||
               'ROB109 Hücresi: ' || qty_rob109 || ' adet' || chr(10) ||
               'Quench Hücresi: ' || qty_quench || ' adet' || chr(10) ||
               'ROB110-111 Hücresi: ' || qty_rob110_111 || ' adet' || chr(10) ||
               'Fosfat Hücresi: ' || qty_fosfat || ' adet' || chr(10) ||
               'Boya Hücresi: ' || qty_boya || ' adet' || chr(10) || chr(10) ||
               'Bu e-posta Supabase Cron Job ve ManufUI Performans Paneli üzerinden otomatik olarak tetiklenmiştir.';

  -- Build JSON payload
  payload := jsonb_build_object(
    'subject', 'Repkon HF901 - Günlük Üretim Raporu (' || formatted_date || ')',
    'body', html_body,
    'html', html_body,
    'message', html_body,
    'email_body', html_body,
    'content', html_body,
    'text', text_body,
    'data', jsonb_build_array(
      jsonb_build_object('cell', 'Pres Hücresi', 'produced', qty_pres),
      jsonb_build_object('cell', 'ETM Hücresi', 'produced', qty_etm),
      jsonb_build_object('cell', 'ROB108 Hücresi', 'produced', qty_rob108),
      jsonb_build_object('cell', 'Flowform Hücresi', 'produced', qty_flowform),
      jsonb_build_object('cell', 'ROB104 Hücresi', 'produced', qty_rob104),
      jsonb_build_object('cell', 'N602-N603 Hücresi', 'produced', qty_n602_n603),
      jsonb_build_object('cell', 'ROB109 Hücresi', 'produced', qty_rob109),
      jsonb_build_object('cell', 'Quench Hücresi', 'produced', qty_quench),
      jsonb_build_object('cell', 'ROB110-111 Hücresi', 'produced', qty_rob110_111),
      jsonb_build_object('cell', 'Fosfat Hücresi', 'produced', qty_fosfat),
      jsonb_build_object('cell', 'Boya Hücresi', 'produced', qty_boya)
    )
  );

  -- Perform the asynchronous HTTP POST request to the Webhook URL
  PERFORM net.http_post(
    url := webhook_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  );
  
  -- Send to Teams webhook too if configured
  IF teams_webhook_url IS NOT NULL AND teams_webhook_url <> '' THEN
    teams_payload := jsonb_build_object(
      'type', 'AdaptiveCard',
      '$schema', 'http://adaptivecards.io/schemas/adaptive-card.json',
      'version', '1.2',
      'body', jsonb_build_array(
        jsonb_build_object(
          'type', 'TextBlock',
          'text', '📊 Repkon HF901 - Günlük Üretim Raporu',
          'weight', 'Bolder',
          'size', 'Medium',
          'color', 'Accent'
        ),
        jsonb_build_object(
          'type', 'TextBlock',
          'text', 'Tarih: ' || formatted_date,
          'isSubtle', true,
          'spacing', 'None'
        ),
        jsonb_build_object(
          'type', 'FactSet',
          'facts', jsonb_build_array(
            jsonb_build_object('title', 'Pres Hücresi:', 'value', qty_pres::text || ' adet'),
            jsonb_build_object('title', 'ETM Hücresi:', 'value', qty_etm::text || ' adet'),
            jsonb_build_object('title', 'ROB108 Hücresi:', 'value', qty_rob108::text || ' adet'),
            jsonb_build_object('title', 'Flowform Hücresi:', 'value', qty_flowform::text || ' adet'),
            jsonb_build_object('title', 'ROB104 Hücresi:', 'value', qty_rob104::text || ' adet'),
            jsonb_build_object('title', 'N602-N603 Hücresi:', 'value', qty_n602_n603::text || ' adet'),
            jsonb_build_object('title', 'ROB109 Hücresi:', 'value', qty_rob109::text || ' adet'),
            jsonb_build_object('title', 'Quench Hücresi:', 'value', qty_quench::text || ' adet'),
            jsonb_build_object('title', 'ROB110-111 Hücresi:', 'value', qty_rob110_111::text || ' adet'),
            jsonb_build_object('title', 'Fosfat Hücresi:', 'value', qty_fosfat::text || ' adet'),
            jsonb_build_object('title', 'Boya Hücresi:', 'value', qty_boya::text || ' adet')
          )
        )
      )
    );

    PERFORM net.http_post(
      url := teams_webhook_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := teams_payload
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Helper function to reschedule cron with named dollar-quotes ($func$) to prevent syntax errors
CREATE OR REPLACE FUNCTION update_manuf_cron_schedule(new_schedule text)
RETURNS void AS $func$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-daily-production-email-job') THEN
    PERFORM cron.unschedule('send-daily-production-email-job');
  END IF;
  
  PERFORM cron.schedule(
    'send-daily-production-email-job',
    new_schedule,
    $$ SELECT send_daily_production_email_func(); $$
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;
