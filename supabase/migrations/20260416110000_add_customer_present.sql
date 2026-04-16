alter table public.manuf_production_rows
add column if not exists musteri_var boolean not null default false;

comment on column public.manuf_production_rows.musteri_var is
'Saatlik/satir bazli musteri var bilgisi.';
