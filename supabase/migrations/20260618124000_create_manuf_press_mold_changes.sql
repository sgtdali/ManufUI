-- Create public.manuf_press_mold_changes table
create table if not exists public.manuf_press_mold_changes (
  id uuid not null default gen_random_uuid(),
  tarih date not null,
  zaman_dilimi text not null,
  sira_no integer not null, -- 1 to 9 (corresponds to ZamanDilimi sira_no)
  sokulen_kalip text,
  takilan_kalip text,
  description text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint manuf_press_mold_changes_pkey primary key (id),
  constraint manuf_press_mold_changes_tarih_sira_no_unique unique (tarih, sira_no)
);

comment on table public.manuf_press_mold_changes is 'Pres hücresi kalıp değişim logları ve üretim takibi.';

-- Enable Row Level Security
alter table public.manuf_press_mold_changes enable row level security;

-- Create allow all policy for public
drop policy if exists allow_all on public.manuf_press_mold_changes;
create policy allow_all on public.manuf_press_mold_changes
  for all using (true) with check (true);
