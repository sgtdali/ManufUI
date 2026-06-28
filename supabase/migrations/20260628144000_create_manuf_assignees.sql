-- Migration: Create manuf_assignees table and add assignee_email to action items
-- Date: 2026-06-28
-- Author: Antigravity

-- 1. Create manuf_assignees table
CREATE TABLE IF NOT EXISTS public.manuf_assignees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  title text,
  department text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.manuf_assignees ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all public read/write access (matching other tables)
DROP POLICY IF EXISTS manuf_public_all ON public.manuf_assignees;
CREATE POLICY manuf_public_all ON public.manuf_assignees
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Add assignee_email column to manuf_action_items table
ALTER TABLE public.manuf_action_items 
  ADD COLUMN IF NOT EXISTS assignee_email text;

-- 3. Recreate notify_teams_on_action_item database function to include assignee_email
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

-- Re-establish the trigger just in case
DROP TRIGGER IF EXISTS trigger_notify_teams_on_action_item ON manuf_action_items;
CREATE TRIGGER trigger_notify_teams_on_action_item
AFTER INSERT OR UPDATE ON manuf_action_items
FOR EACH ROW
EXECUTE FUNCTION notify_teams_on_action_item();
