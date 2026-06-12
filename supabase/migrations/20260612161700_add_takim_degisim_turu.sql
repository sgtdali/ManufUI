-- Add Takım Değişimi Türü field for ETM Hücresi
ALTER TABLE "public"."manuf_production_rows" 
ADD COLUMN IF NOT EXISTS "takim_degisim_turu" text;
