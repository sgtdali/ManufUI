ALTER TABLE public.manuf_schedule_overrides
ADD COLUMN IF NOT EXISTS female_change_minutes integer,
ADD COLUMN IF NOT EXISTS male_change_minutes integer,
ADD COLUMN IF NOT EXISTS ring_change_minutes integer;
