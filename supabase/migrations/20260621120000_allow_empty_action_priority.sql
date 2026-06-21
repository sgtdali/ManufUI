alter table public.manuf_action_items
  alter column priority drop default,
  alter column priority drop not null;

alter table public.manuf_action_items
  drop constraint if exists manuf_action_items_priority_check;

alter table public.manuf_action_items
  add constraint manuf_action_items_priority_check
  check (priority is null or priority in ('Yüksek', 'Orta', 'Düşük'));
