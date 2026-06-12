-- Add Kalıp Demontaj and Kalıp Montaj fields for Pres Hücresi
ALTER TABLE "public"."manuf_production_rows" 
ADD COLUMN IF NOT EXISTS "kalip_demontaj" integer,
ADD COLUMN IF NOT EXISTS "kalip_demontaj_turu" text,
ADD COLUMN IF NOT EXISTS "kalip_montaj" integer,
ADD COLUMN IF NOT EXISTS "kalip_montaj_turu" text;
