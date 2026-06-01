-- Alter check constraint on manuf_mold_changes to allow 'ring' type
alter table public.manuf_mold_changes drop constraint if exists manuf_mold_changes_mold_type_check;
alter table public.manuf_mold_changes add constraint manuf_mold_changes_mold_type_check check (mold_type in ('male', 'female', 'ring'));
