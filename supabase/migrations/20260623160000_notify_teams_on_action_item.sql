-- Migration: Teams Workflow Integration for Action Items
-- Date: 2026-06-23
-- Author: Antigravity

-- -------------------------------------------------------------
-- TEAMS INTEGRATION DOCUMENTATION
-- -------------------------------------------------------------
-- This integration automatically sends notifications to Microsoft Teams when action items
-- are created or marked as completed.
--
-- Teams Workflow Configuration:
-- - App: Teams Workflows (İş Akışları)
-- - Template: "Bir kanala web kancası uyarıları gönder" (Post webhook warnings to a channel)
-- - Trigger: "When a Teams webhook request is received" (manual trigger)
-- - Recipient: Ensar Gül (Configured in the "Post card in a chat or channel 1" action)
-- - Post as: Flow bot (Akış botu)
-- - Post in: Chat with Flow bot (Akış botu ile sohbet edin)
-- - Webhook URL: https://defaultf7bf3ca5444c4640b15d4ad9a8bc7f.82.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/8d45236face2416cb3cbd4162c44757d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=OoR5t6WOta7PXyTH8Eb7vZB-yGGRcvHeecddHZkr3ys
-- -------------------------------------------------------------

-- Enable pg_net extension if it is not already enabled (used for HTTP POST requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create or replace function to notify Teams
CREATE OR REPLACE FUNCTION notify_teams_on_action_item()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
  teams_url text := 'https://defaultf7bf3ca5444c4640b15d4ad9a8bc7f.82.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/8d45236face2416cb3cbd4162c44757d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=OoR5t6WOta7PXyTH8Eb7vZB-yGGRcvHeecddHZkr3ys';
  event_title text;
  event_color text;
BEGIN
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

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS trigger_notify_teams_on_action_item ON manuf_action_items;

CREATE TRIGGER trigger_notify_teams_on_action_item
AFTER INSERT OR UPDATE ON manuf_action_items
FOR EACH ROW
EXECUTE FUNCTION notify_teams_on_action_item();
