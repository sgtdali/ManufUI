import type { WizardState } from "./constants";

export function generatePreviewSQL(w: WizardState): string {
  const funcName = `auto_${w.automationId || "ornek"}_func`;
  const triggerName = `auto_${w.automationId || "ornek"}_trigger`;
  const cols = w.selectedColumns.length > 0 ? w.selectedColumns.join(", ") : "*";

  let dateFilter = "";
  if (w.triggerType === "cron" && w.dateFilterColumn) {
    const rangeMap: Record<string, string> = {
      today: `WHERE ${w.dateFilterColumn} >= CURRENT_DATE`,
      yesterday: `WHERE ${w.dateFilterColumn} >= CURRENT_DATE - 1 AND ${w.dateFilterColumn} < CURRENT_DATE`,
      last_7_days: `WHERE ${w.dateFilterColumn} >= CURRENT_DATE - 7`,
      last_30_days: `WHERE ${w.dateFilterColumn} >= CURRENT_DATE - 30`,
    };
    dateFilter = rangeMap[w.dateFilterRange] ? "\n    " + rangeMap[w.dateFilterRange] : "";
  }

  let payloadBlock: string;
  if (w.payloadFormat === "teams_adaptive_card") {
    const facts = w.selectedColumns.length > 0
      ? w.selectedColumns
          .map((c) =>
            w.triggerType === "trigger"
              ? `          jsonb_build_object('title', '${c}', 'value', coalesce(NEW.${c}::text, '-'))`
              : `          jsonb_build_object('title', '${c}', 'value', coalesce(r.${c}::text, '-'))`
          )
          .join(",\n")
      : "          -- Sutun seciniz";

    if (w.triggerType === "trigger") {
      payloadBlock = `  _payload := jsonb_build_object(
    'type', 'message',
    'attachments', jsonb_build_array(
      jsonb_build_object(
        'contentType', 'application/vnd.microsoft.card.adaptive',
        'content', jsonb_build_object(
          'type', 'AdaptiveCard', 'version', '1.4',
          'body', jsonb_build_array(
            jsonb_build_object('type', 'TextBlock', 'text', '${w.cardTitle || "Bildirim"}', 'weight', 'Bolder', 'size', 'Medium', 'color', '${w.cardColor}'),
            jsonb_build_object('type', 'FactSet', 'facts', jsonb_build_array(
${facts}
            ))
          )
        )
      )
    )
  );`;
    } else {
      payloadBlock = `  -- Veri sorgusu + Adaptive Card olusturma
  SELECT jsonb_build_object(...) INTO _payload;`;
    }
  } else {
    if (w.triggerType === "trigger") {
      const fields = w.selectedColumns.map((c) => `    '${c}', NEW.${c}`).join(",\n");
      payloadBlock = `  _payload := jsonb_build_object(
    'automation_id', '${w.automationId || "ornek"}',
    'event', TG_OP,
    'timestamp', now()::text,
${fields || "    -- Sutun seciniz"}
  );`;
    } else {
      payloadBlock = `  _payload := jsonb_build_object(
    'automation_id', '${w.automationId || "ornek"}',
    'timestamp', now()::text,
    'row_count', coalesce(jsonb_array_length(_rows), 0),
    'data', coalesce(_rows, '[]'::jsonb)
  );`;
    }
  }

  if (w.triggerType === "cron") {
    return `-- Cron Fonksiyonu: ${w.automationName || funcName}
CREATE OR REPLACE FUNCTION ${funcName}()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $fn$
DECLARE
  _webhook_url TEXT;
  _payload JSONB;
  _rows JSONB;
BEGIN
  SELECT webhook_url INTO _webhook_url
  FROM manuf_automations WHERE id = '${w.automationId || "ornek"}' AND is_active = true;
  IF _webhook_url IS NULL THEN RETURN; END IF;

  SELECT jsonb_agg(row_to_json(t)) INTO _rows
  FROM (SELECT ${cols} FROM ${w.sourceTable || "tablo_adi"}${dateFilter}) t;
  IF _rows IS NULL THEN _rows := '[]'::jsonb; END IF;

${payloadBlock}

  PERFORM net.http_post(
    url := _webhook_url,
    body := _payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
END; $fn$;

-- Cron zamanlama
SELECT cron.schedule('${w.automationId || "ornek"}', '${w.cronSchedule}', 'SELECT ${funcName}()');`;
  } else {
    const events = w.triggerEvents.join(" OR ");
    return `-- Trigger Fonksiyonu: ${w.automationName || funcName}
CREATE OR REPLACE FUNCTION ${funcName}()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $fn$
DECLARE
  _webhook_url TEXT;
  _payload JSONB;
BEGIN
  SELECT webhook_url INTO _webhook_url
  FROM manuf_automations WHERE id = '${w.automationId || "ornek"}' AND is_active = true;
  IF _webhook_url IS NULL THEN RETURN NEW; END IF;

${payloadBlock}

  PERFORM net.http_post(
    url := _webhook_url,
    body := _payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END; $fn$;

-- Trigger olustur
DROP TRIGGER IF EXISTS ${triggerName} ON ${w.sourceTable || "tablo_adi"};
CREATE TRIGGER ${triggerName}
  AFTER ${events} ON ${w.sourceTable || "tablo_adi"}
  FOR EACH ROW EXECUTE FUNCTION ${funcName}();`;
  }
}
