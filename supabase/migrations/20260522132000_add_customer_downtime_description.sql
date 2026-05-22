alter table public.manuf_production_rows
add column if not exists musteri_durus_aciklama text;

comment on column public.manuf_production_rows.musteri_durus_aciklama is
'Müşteri kaynaklı duruş açıklaması.';
