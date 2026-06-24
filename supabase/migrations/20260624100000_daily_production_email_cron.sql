-- Migration: Daily Production Email Cron Job
-- Date: 2026-06-24
-- Author: Antigravity

-- Enable pg_net extension (used for HTTP POST requests) if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enable pg_cron extension (used for scheduling jobs) if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the database function to send daily production email
CREATE OR REPLACE FUNCTION send_daily_production_email_func()
RETURNS void AS $$
DECLARE
  yesterday date;
  formatted_date text;
  html_body text;
  text_body text;
  payload jsonb;
  webhook_url text := 'https://defaultf7bf3ca5444c4640b15d4ad9a8bc7f.82.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ef4954bd464e47709bfab718b0cdd5fc/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=PUrYTmfy1aEy1ivALvBaGGeD08FBwSYsN_Ur8PNXPyc';
  
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
END;
$$ LANGUAGE plpgsql;

-- Unschedule first if it exists to prevent duplicates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-daily-production-email-job') THEN
    PERFORM cron.unschedule('send-daily-production-email-job');
  END IF;
END $$;

-- Schedule the job to run every day at 05:00 UTC (08:00 TRT)
SELECT cron.schedule(
  'send-daily-production-email-job',
  '0 5 * * *',
  $$ SELECT send_daily_production_email_func(); $$
);
