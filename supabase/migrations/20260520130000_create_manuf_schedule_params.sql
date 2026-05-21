CREATE TABLE IF NOT EXISTS public.manuf_schedule_params (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  value numeric NOT NULL,
  unit text,
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.manuf_schedule_params ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON public.manuf_schedule_params
  FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.manuf_schedule_params (key, label, value, unit, is_custom) VALUES
  ('normalization_warmup_minutes',  'Fırın ısınma süresi',              120,  'dk',   false),
  ('pre_press_heat_minutes',        'Pres öncesi parça ısınma süresi',   30,   'dk',   false),
  ('press_cycle_minutes',           'Pres çevrim süresi',                 3,   'dk',   false),
  ('normalization_process_minutes', 'Normalizasyon işlem süresi',        270,  'dk',   false),
  ('male_die_interval',             'Erkek kalıp ömrü',                  500,  'adet', false),
  ('female_die_interval',           'Dişi kalıp ömrü',                  1300,  'adet', false),
  ('male_die_change_minutes',       'Erkek kalıp değişim süresi',        285,  'dk',   false),
  ('female_die_change_minutes',     'Dişi kalıp değişim süresi',        1140,  'dk',   false)
ON CONFLICT (key) DO NOTHING;
