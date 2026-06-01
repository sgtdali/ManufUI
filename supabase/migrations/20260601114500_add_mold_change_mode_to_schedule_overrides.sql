ALTER TABLE public.manuf_schedule_overrides
ADD COLUMN IF NOT EXISTS postpone_male_change boolean,
ADD COLUMN IF NOT EXISTS postpone_female_change boolean,
ADD COLUMN IF NOT EXISTS mold_change_mode text,
ADD COLUMN IF NOT EXISTS manual_mold_type text,
ADD COLUMN IF NOT EXISTS manual_mold_change_after_pieces integer;

