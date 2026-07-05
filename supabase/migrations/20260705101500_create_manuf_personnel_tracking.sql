-- Table: public.manuf_personnel_tracking
create table if not exists public.manuf_personnel_tracking (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  location text not null,
  arrival_date date not null,
  return_date date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.manuf_personnel_tracking enable row level security;

-- Create policy for public access (all actions enabled)
create policy public_all on public.manuf_personnel_tracking
  for all using (true) with check (true);

-- Indexes for performance
create index if not exists idx_manuf_personnel_tracking_name on public.manuf_personnel_tracking(name);
create index if not exists idx_manuf_personnel_tracking_location on public.manuf_personnel_tracking(location);
create index if not exists idx_manuf_personnel_tracking_arrival on public.manuf_personnel_tracking(arrival_date);
