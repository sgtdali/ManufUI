ALTER TABLE public.manuf_schedule_overrides 
ADD COLUMN IF NOT EXISTS mold_maintenance_start text;
