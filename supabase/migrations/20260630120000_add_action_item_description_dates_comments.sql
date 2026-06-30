alter table public.manuf_action_items
  add column if not exists description text,
  add column if not exists start_date date default current_date;

create table if not exists public.manuf_action_item_comments (
  id uuid default gen_random_uuid() primary key,
  action_item_id uuid not null references public.manuf_action_items(id) on delete cascade,
  author text not null,
  comment text not null,
  created_at timestamptz default now()
);

create index if not exists idx_manuf_action_item_comments_action_item on public.manuf_action_item_comments(action_item_id);

alter table public.manuf_action_item_comments enable row level security;

drop policy if exists manuf_public_all on public.manuf_action_item_comments;
create policy manuf_public_all on public.manuf_action_item_comments
  for all using (true) with check (true);
