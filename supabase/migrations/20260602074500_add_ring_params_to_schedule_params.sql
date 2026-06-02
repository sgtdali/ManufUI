-- Add ring_interval and ring_change_minutes to manuf_schedule_params
INSERT INTO public.manuf_schedule_params (key, label, value, unit, is_custom) VALUES
  ('ring_interval',        'HIP Ring ömrü',             1300,  'adet', false),
  ('ring_change_minutes',  'HIP Ring değişim süresi',    570,   'dk',   false)
ON CONFLICT (key) DO NOTHING;
