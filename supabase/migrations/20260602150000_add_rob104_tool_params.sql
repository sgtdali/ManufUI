INSERT INTO public.manuf_schedule_params (key, label, value, unit, is_custom) VALUES
  ('rob104_tool_interval',        'ROB104 Takım değişim aralığı',   5,  'adet', false),
  ('rob104_tool_change_duration', 'ROB104 Takım değiştirme süresi', 10, 'dk',   false)
ON CONFLICT (key) DO NOTHING;
