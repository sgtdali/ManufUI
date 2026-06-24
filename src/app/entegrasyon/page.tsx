"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Settings, 
  Send, 
  Save, 
  Clock, 
  Link2, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  Copy, 
  Check,
  Lock,
  KeyRound,
  Database,
  ArrowRight,
  Sparkles,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { 
  getManufAutomations, 
  saveManufAutomation, 
  triggerCronAutomation,
  type ManufAutomation 
} from "../actions";

export default function EntegrasyonPage() {
  const [isReadOnly, setIsReadOnly] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [dbMigrated, setDbMigrated] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Automations list state
  const [automations, setAutomations] = useState<ManufAutomation[]>([]);
  
  // Editing state per automation ID
  const [editingUrls, setEditingUrls] = useState<Record<string, string>>({});
  const [editingSchedules, setEditingSchedules] = useState<Record<string, string>>({});
  const [editingDescriptions, setEditingDescriptions] = useState<Record<string, string>>({});
  
  // Action status indicators
  const [savingId, setSavingId] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  // Auth checking
  const checkAuth = () => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };
    const auth = getCookie('password_auth');
    const readOnly = auth !== 'rmk_hf901';
    setIsReadOnly(readOnly);
    return !readOnly;
  };

  useEffect(() => {
    const authorized = checkAuth();
    if (authorized) {
      loadAutomations();
    } else {
      setLoading(false);
    }
  }, []);

  const loadAutomations = async () => {
    setLoading(true);
    try {
      const res = await getManufAutomations();
      if (res.success && res.data) {
        setAutomations(res.data);
        
        // Populate inputs
        const urls: Record<string, string> = {};
        const schedules: Record<string, string> = {};
        const descriptions: Record<string, string> = {};
        
        res.data.forEach((item) => {
          urls[item.id] = item.webhook_url || "";
          schedules[item.id] = item.schedule || "";
          descriptions[item.id] = item.description || "";
        });
        
        setEditingUrls(urls);
        setEditingSchedules(schedules);
        setEditingDescriptions(descriptions);
        setDbMigrated(true);
      } else {
        if (res.error && (res.error.includes("relation") || res.error.includes("cache") || res.error.includes("does not exist"))) {
          setDbMigrated(false);
          toast.warning("Veritabanı tablosu bulunamadı, lütfen önce göç (migration) işlemini yapın.");
        } else {
          toast.error(`Otomasyonlar yüklenemedi: ${res.error}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (password === "rmk_hf901") {
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `password_auth=rmk_hf901; path=/; max-age=2592000; expires=${expiryDate}; SameSite=Lax`;
      toast.success("Giriş başarılı!");
      setIsReadOnly(false);
      loadAutomations();
    } else {
      toast.error("Hatalı şifre girdiniz!");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  const handleSaveAutomation = async (id: string, type: "cron" | "trigger") => {
    setSavingId(id);
    try {
      const updates: {
        webhook_url: string;
        description: string;
        schedule?: string;
      } = {
        webhook_url: editingUrls[id],
        description: editingDescriptions[id]
      };

      if (type === "cron") {
        updates.schedule = editingSchedules[id];
      }

      const res = await saveManufAutomation(id, updates);
      if (res.success) {
        toast.success("Değişiklikler başarıyla kaydedildi!");
        // Refresh data
        await loadAutomations();
      } else {
        toast.error(`Kaydetme başarısız: ${res.error}`);
      }
    } catch (err: any) {
      toast.error("Hata oluştu.");
    } finally {
      setSavingId(null);
    }
  };

  const handleTriggerNow = async (id: string) => {
    setTriggeringId(id);
    toast.info("Zamanlanmış görev tetikleniyor...");
    try {
      const res = await triggerCronAutomation(id);
      if (res.success) {
        toast.success("Zamanlanmış görev başarıyla tetiklendi!");
      } else {
        toast.error(`Tetikleme başarısız: ${res.error}`);
      }
    } catch (err: any) {
      toast.error("Hata oluştu.");
    } finally {
      setTriggeringId(null);
    }
  };

  const sqlQuery = `-- Supabase SQL Editor'de çalıştırın:
-- 1. Otomasyon tablosunu oluşturun
CREATE TABLE IF NOT EXISTS manuf_automations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                -- 'cron' veya 'trigger'
  name TEXT NOT NULL,                -- Görünür adı
  schedule TEXT,                     -- Cron zamanlaması (eğer cron ise)
  source_event TEXT,                 -- Kaynak tablo ve event (eğer trigger ise)
  target_function TEXT NOT NULL,     -- pgSQL hedef fonksiyon adı
  webhook_url TEXT,                  -- Dış webhook bağlantı URL'i
  description TEXT,                  -- Açıklama/notlar
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS politikası oluşturun
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

-- 2. Varsayılan otomasyon kayıtlarını ekleyin
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

-- 3. notify_teams_on_action_item() trigger fonksiyonunu güncelleyin
CREATE OR REPLACE FUNCTION notify_teams_on_action_item()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
  teams_url text;
  event_title text;
  event_color text;
  is_enabled boolean := true;
BEGIN
  -- Webhook URL bilgisini otomasyon tablosundan çek
  SELECT webhook_url, is_active INTO teams_url, is_enabled FROM manuf_automations WHERE id = 'action_item_trigger';
  
  IF NOT is_enabled OR teams_url IS NULL OR teams_url = '' THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'INSERT') THEN
    event_title := '📌 Yeni Aksiyon Maddesi';
    event_color := 'Good';
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Tamamlandı') THEN
      event_title := '✅ Aksiyon Tamamlandı!';
      event_color := 'Accent';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

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

  PERFORM net.http_post(
    url := teams_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Günlük e-posta raporu fonksiyonunu güncelleyin
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
  -- Webhook URL bilgisini otomasyon tablosundan çek
  SELECT webhook_url, is_active INTO webhook_url, is_enabled FROM manuf_automations WHERE id = 'daily_report_cron';
  SELECT value INTO teams_webhook_url FROM manuf_settings WHERE key = 'teams_production_webhook';
  
  IF NOT is_enabled THEN
    RETURN;
  END IF;

  IF webhook_url IS NULL OR webhook_url = '' THEN
    webhook_url := default_webhook_url;
  END IF;

  yesterday := (now() at time zone 'Europe/Istanbul' - interval '1 day')::date;
  formatted_date := to_char(yesterday, 'DD.MM.YYYY');
  
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

  PERFORM net.http_post(
    url := webhook_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  );
  
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

-- 5. update_manuf_cron_schedule() zamanlama fonksiyonunu güncelleyin
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
$func$ LANGUAGE plpgsql SECURITY DEFINER;`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    toast.success("SQL sorgusu kopyalandı!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isReadOnly === null || (loading && isReadOnly === false)) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm font-medium">Otomasyonlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (isReadOnly) {
    return (
      <main className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px] pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-md px-6">
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-8 shadow-2xl flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center mb-6">
              <Lock className="h-6 w-6 text-indigo-400" />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-white text-center">
              Entegrasyon Paneli Yetkilendirme
            </h1>
            <p className="text-xs text-zinc-400 mt-2 text-center">
              Bu kritik yönetim sayfasına erişmek için şifrenizi girin.
            </p>

            <div className="w-full mt-8 relative">
              <span className="absolute left-3.5 top-3 text-zinc-500">
                <KeyRound className="h-4 w-4" />
              </span>
              <input
                type="password"
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyPress}
                className="h-10 w-full rounded-lg bg-zinc-800/30 border border-zinc-800 text-sm text-white pl-10 pr-4 outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/70 transition-all placeholder-zinc-500"
                autoFocus
              />
            </div>

            <button
              onClick={handleLogin}
              className="w-full mt-6 h-10 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-sm font-semibold text-white shadow-lg active:scale-[0.98] transition-all cursor-pointer"
            >
              Giriş Yetkisini Doğrula
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 pb-16 font-sans antialiased">
      <header className="bg-zinc-900/40 border-b border-zinc-800/80 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboardy"
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-all"
              title="Dashboard'a Dön"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="h-6 w-[1px] bg-zinc-800" />
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-500" />
              <h1 className="text-base font-bold tracking-tight text-white">
                Otomasyon & Entegrasyon Eşleştirme Paneli
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#10b981] bg-[#10b981]/10 px-2.5 py-1 rounded-full border border-[#10b981]/20 flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-[#10b981] rounded-full animate-pulse" />
              Sistem Aktif
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {!dbMigrated && (
          <section className="bg-amber-955/10 border border-amber-900/60 rounded-2xl p-6 mb-8 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-amber-900/30 rounded-xl text-amber-500 border border-amber-800/40">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-amber-400">Veritabanı Kurulumu Gerekli</h2>
                <p className="text-xs text-amber-300 mt-1 leading-relaxed">
                  İlişkileri ve webhook bağlantılarını saklayacağımız <strong>manuf_automations</strong> tablosu veritabanınızda bulunamadı. Panelin aktif olması için lütfen aşağıdaki SQL sorgusunu <strong>Supabase SQL Editor</strong> ekranında çalıştırın.
                </p>

                <div className="mt-4 bg-zinc-900/80 text-zinc-300 rounded-xl p-4 font-mono text-xs relative max-h-64 overflow-y-auto border border-zinc-800 shadow-inner">
                  <button 
                    onClick={copySql}
                    className="absolute right-3 top-3 p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-all cursor-pointer"
                    title="Kopyala"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <pre className="whitespace-pre-wrap select-all">{sqlQuery}</pre>
                </div>
                
                <button
                  onClick={loadAutomations}
                  type="button"
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow-sm cursor-pointer transition-all active:scale-[0.98]"
                >
                  Kurulumu Tamamladım, Yeniden Kontrol Et
                </button>
              </div>
            </div>
          </section>
        )}

        {dbMigrated && automations.length === 0 && (
          <div className="text-center py-12 bg-zinc-900/40 rounded-2xl border border-zinc-800 border-dashed">
            <Info className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-xs text-zinc-500">Tanımlı herhangi bir otomasyon veya entegrasyon bulunamadı.</p>
          </div>
        )}

        {dbMigrated && automations.length > 0 && (
          <div className="space-y-8">
            {automations.map((item) => {
              const isCron = item.type === "cron";
              const isSaving = savingId === item.id;
              const isTriggering = triggeringId === item.id;
              
              return (
                <div 
                  key={item.id}
                  className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden"
                >
                  {/* Decorative background glow for type indicator */}
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-[0.03] ${isCron ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                  
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-800/60 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${isCron ? 'bg-indigo-950/30 border-indigo-800/40 text-indigo-400' : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400'}`}>
                        {isCron ? <Clock className="h-5 w-5" /> : <Database className="h-5 w-5" />}
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white tracking-wide">{item.name}</h2>
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">{item.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${isCron ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                        {isCron ? 'Zamanlanmış Görev (Cron)' : 'Veritabanı Tetikleyicisi (Trigger)'}
                      </span>
                    </div>
                  </div>

                  {/* Flowchart Diagram (Mapping Relationship) */}
                  <div className="mb-6 bg-zinc-955/40 border border-zinc-900 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Node 1: Trigger Source */}
                    <div className="flex items-center gap-3 w-full md:w-auto min-w-[200px]">
                      <div className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400 shrink-0">
                        {isCron ? <Clock className="h-4.5 w-4.5" /> : <Database className="h-4.5 w-4.5" />}
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Tetikleyici</span>
                        <span className="text-xs font-semibold text-zinc-300 font-mono">
                          {isCron ? `Cron: ${editingSchedules[item.id] || item.schedule}` : item.source_event}
                        </span>
                        {isCron && (
                          <span className="text-[9px] text-zinc-500 block mt-0.5">
                            (Her gün TRT 08:00'de)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Connecting Arrow 1 */}
                    <div className="hidden md:flex text-zinc-700 animate-pulse">
                      <ArrowRight className="h-5 w-5" />
                    </div>

                    {/* Node 2: Function Target */}
                    <div className="flex items-center gap-3 w-full md:w-auto min-w-[220px]">
                      <div className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500 shrink-0">
                        <Terminal className="h-4.5 w-4.5" />
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Hedef Fonksiyon</span>
                        <span className="text-xs font-semibold text-zinc-300 font-mono">{item.target_function}</span>
                        <span className="text-[9px] text-zinc-500 block mt-0.5">PostgreSQL pgSQL</span>
                      </div>
                    </div>

                    {/* Connecting Arrow 2 */}
                    <div className="hidden md:flex text-zinc-700 animate-pulse">
                      <ArrowRight className="h-5 w-5" />
                    </div>

                    {/* Node 3: Webhook Output */}
                    <div className="flex items-center gap-3 w-full md:w-auto min-w-[200px]">
                      <div className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-500 shrink-0">
                        <Link2 className="h-4.5 w-4.5" />
                      </div>
                      <div className="text-left max-w-[200px] truncate">
                        <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Webhook URL</span>
                        <span className="text-xs font-semibold text-zinc-300 font-mono truncate block">
                          {editingUrls[item.id] ? editingUrls[item.id].slice(0, 30) + '...' : 'Yapılandırılmamış'}
                        </span>
                        <span className="text-[9px] text-zinc-500 block mt-0.5">Dış Servis Akışı</span>
                      </div>
                    </div>
                  </div>

                  {/* Form inputs */}
                  <div className="space-y-4">
                    {/* Webhook input */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                        Webhook Bağlantı URL (Alıcı Servis)
                      </label>
                      <input 
                        type="url"
                        value={editingUrls[item.id] || ""}
                        onChange={(e) => setEditingUrls({ ...editingUrls, [item.id]: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs font-medium text-white outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/70 transition-all font-mono"
                      />
                    </div>

                    {/* Cron schedule input (if type is cron) */}
                    {isCron && (
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">
                          Cron Zaman Sıklığı
                        </label>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <input 
                            type="text"
                            value={editingSchedules[item.id] || ""}
                            onChange={(e) => setEditingSchedules({ ...editingSchedules, [item.id]: e.target.value })}
                            placeholder="0 5 * * *"
                            className="w-full sm:w-48 px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/70 transition-all font-mono"
                          />
                          <span className="text-[10px] text-zinc-500 font-medium">
                            (Varsayılan: <code>0 5 * * *</code> = Her sabah UTC 05:00 / TRT 08:00 zamanlaması)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Description Textarea */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                        Açıklama / Notlar
                      </label>
                      <textarea
                        value={editingDescriptions[item.id] || ""}
                        onChange={(e) => setEditingDescriptions({ ...editingDescriptions, [item.id]: e.target.value })}
                        rows={2}
                        placeholder="Bu entegrasyonun amacını, bağlandığı sistemi ve iş mantığını buraya yazabilirsiniz..."
                        className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/70 transition-all leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-6 pt-4 border-t border-zinc-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-indigo-400 shrink-0" />
                      Son Güncellenme: {new Date(item.updated_at).toLocaleString('tr-TR')}
                    </span>
                    
                    <div className="flex items-center justify-end gap-3">
                      {isCron && (
                        <button
                          type="button"
                          disabled={isTriggering || isSaving}
                          onClick={() => handleTriggerNow(item.id)}
                          className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" />
                          {isTriggering ? "Tetikleniyor..." : "Şimdi Gönder (Test)"}
                        </button>
                      )}
                      
                      <button
                        type="button"
                        disabled={isSaving || isTriggering}
                        onClick={() => handleSaveAutomation(item.id, item.type)}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        {isSaving ? "Kaydediliyor..." : "Ayarları Kaydet"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
