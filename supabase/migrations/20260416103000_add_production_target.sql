alter table public.manuf_production_rows
add column if not exists hedef_uretim_adeti integer;

comment on column public.manuf_production_rows.hedef_uretim_adeti is
'Saatlik/satir bazli hedef uretim adedi. Hedef gerceklesenden buyukse eksik adedin dakika karsiligi durus kolonlarinda aciklanir.';
