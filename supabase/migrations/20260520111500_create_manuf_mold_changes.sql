create table if not exists public.manuf_mold_changes (
  id uuid not null default gen_random_uuid(),
  tarih date not null,
  mold_type text not null check (mold_type in ('male', 'female')),
  description text,
  created_at timestamp with time zone not null default now(),

  constraint manuf_mold_changes_pkey primary key (id),
  constraint manuf_mold_changes_tarih_type_unique unique (tarih, mold_type)
);

comment on table public.manuf_mold_changes is 'Preslerin manuel girilen kalıp değişim tarihleri.';
comment on column public.manuf_mold_changes.id is 'Benzersiz kayıt ID.';
comment on column public.manuf_mold_changes.tarih is 'Kalıbın değiştirildiği tarih.';
comment on column public.manuf_mold_changes.mold_type is 'Değiştirilen kalıp türü (male: Erkek Kalıp, female: Dişi Kalıp).';
comment on column public.manuf_mold_changes.description is 'Kalıp değişimi ile ilgili isteğe bağlı açıklama.';
comment on column public.manuf_mold_changes.created_at is 'Kaydın oluşturulma tarihi.';

-- Enable Row Level Security
alter table public.manuf_mold_changes enable row level security;

-- Drop policy if exists and create new one
drop policy if exists manuf_public_all on public.manuf_mold_changes;
create policy manuf_public_all on public.manuf_mold_changes
  for all using (true) with check (true);
