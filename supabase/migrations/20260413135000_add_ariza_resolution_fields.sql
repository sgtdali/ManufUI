alter table public.manuf_production_rows
  add column if not exists ariza_giderildi boolean not null default false,
  add column if not exists ariza_giderilme_aciklama text,
  add column if not exists ariza_giderildi_at timestamp with time zone;

comment on column public.manuf_production_rows.ariza_giderildi is
  'Arıza kaydının giderildi olarak işaretlenip işaretlenmediği.';

comment on column public.manuf_production_rows.ariza_giderilme_aciklama is
  'Arızanın nasıl giderildiğine dair zorunlu açıklama.';

comment on column public.manuf_production_rows.ariza_giderildi_at is
  'Arızanın giderildi olarak işaretlendiği zaman.';
