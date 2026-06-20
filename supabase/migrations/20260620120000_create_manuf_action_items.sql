create table if not exists manuf_action_items (
  id uuid default gen_random_uuid() primary key,
  parent_id uuid references manuf_action_items(id) on delete cascade,
  cell text not null,
  title text not null,
  assignee text not null,
  due_date date,
  priority text not null default 'Orta' check (priority in ('Yüksek', 'Orta', 'Düşük')),
  status text not null default 'Açık' check (status in ('Açık', 'Devam Ediyor', 'Tamamlandı')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_manuf_action_items_parent on manuf_action_items(parent_id);
create index idx_manuf_action_items_cell on manuf_action_items(cell);
create index idx_manuf_action_items_status on manuf_action_items(status);
