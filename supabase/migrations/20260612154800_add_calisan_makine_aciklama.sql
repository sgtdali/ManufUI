-- Add Çalışan Makinesi Açıklaması field for ETM Hücresi
ALTER TABLE "public"."manuf_production_rows" 
ADD COLUMN IF NOT EXISTS "calisan_makine_aciklama" text;
