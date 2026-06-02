-- Add ROB108 simulation parameters to manuf_schedule_params
INSERT INTO public.manuf_schedule_params (key, label, value, unit, is_custom) VALUES
  ('rob108_tool_interval',        'ROB108 Takım değişim aralığı',   5,   'adet', false),
  ('rob108_tool_change_duration', 'ROB108 Takım değişim süresi',   10,   'dk',   false),
  ('rob108_palet_size',           'ROB108 Palet kapasitesi',        20,   'adet', false),
  ('rob108_palet_change_duration','ROB108 Palet değişim süresi',   10,   'dk',   false),
  ('rob108_cycle_minutes',        'ROB108 Torna çevrim süresi',    15,   'dk',   false),
  ('rob104_cycle_minutes',        'ROB104 Torna çevrim süresi',     6,   'dk',   false)
ON CONFLICT (key) DO NOTHING;
