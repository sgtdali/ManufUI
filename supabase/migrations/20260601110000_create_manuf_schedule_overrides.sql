CREATE TABLE IF NOT EXISTS public.manuf_schedule_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarih date NOT NULL,
  bolum text NOT NULL,
  pressed integer,
  overtime_minutes integer,
  force_workday boolean,
  shift_start text,
  shift_end text,
  furnace_start text,
  die_cooling_minutes integer,
  custom_gantt_items jsonb DEFAULT '[]'::jsonb NOT NULL,
  dependencies jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(tarih, bolum)
);

ALTER TABLE public.manuf_schedule_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON public.manuf_schedule_overrides
  FOR ALL USING (true) WITH CHECK (true);
