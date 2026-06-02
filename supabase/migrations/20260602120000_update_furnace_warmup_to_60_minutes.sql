update manuf_schedule_params
set
  value = 60,
  updated_at = now()
where key = 'normalization_warmup_minutes';
