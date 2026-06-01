ALTER TABLE public.manuf_schedule_overrides
ADD COLUMN IF NOT EXISTS disabled_operations jsonb DEFAULT '[]'::jsonb NOT NULL;

