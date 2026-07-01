-- Add cutoff_dates column to manuf_forecast_config
ALTER TABLE manuf_forecast_config ADD COLUMN IF NOT EXISTS cutoff_dates JSONB DEFAULT '{}'::jsonb;

-- Seed default value for Pres Hücresi cutoff date as '2026-07-09'
UPDATE manuf_forecast_config
SET cutoff_dates = '{"Pres Hücresi": "2026-07-09"}'::jsonb
WHERE id = 'default';
