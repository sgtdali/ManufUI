-- Add Çalışan Makinesi Sayısı field for ETM Hücresi
ALTER TABLE "public"."manuf_production_rows" 
ADD COLUMN IF NOT EXISTS "calisan_makine_sayisi" integer;
