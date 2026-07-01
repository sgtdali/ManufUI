-- Create manuf_forecast_config table
CREATE TABLE IF NOT EXISTS manuf_forecast_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  selected_slots JSONB DEFAULT NULL,
  interventions JSONB DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial default row
INSERT INTO manuf_forecast_config (id, selected_slots, interventions)
VALUES ('default', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS and create allow_all policy
ALTER TABLE manuf_forecast_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON manuf_forecast_config FOR ALL TO public USING (true) WITH CHECK (true);
