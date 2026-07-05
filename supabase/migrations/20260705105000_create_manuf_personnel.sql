-- Migration: Create public.manuf_personnel table and seed with personnel list
-- Date: 2026-07-05

CREATE TABLE IF NOT EXISTS public.manuf_personnel (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.manuf_personnel ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all public read/write access
DROP POLICY IF EXISTS manuf_public_all ON public.manuf_personnel;
CREATE POLICY manuf_public_all ON public.manuf_personnel
  FOR ALL USING (true) WITH CHECK (true);

-- Seed with requested names (no emails/titles/departments needed)
INSERT INTO public.manuf_personnel (name) VALUES
  ('CENGİZ ÜSTÜN'),
  ('ÇAĞRI CAN ÇOLAK'),
  ('DOĞAN EROL'),
  ('MUHSİN UYSAL'),
  ('MÜCAHİT TOPTAŞ'),
  ('OKAN CEYHAN'),
  ('ÖZGÜR KALAYCI'),
  ('SUAT TUNÇ'),
  ('ŞENEL ÇELİK'),
  ('TANER ÇELİK'),
  ('VOLKAN MADEN'),
  ('YASİN DURSUN'),
  ('BARIŞ ŞAHİNOĞLU'),
  ('MEHMET DOĞANAY'),
  ('TAYFUN VURAL'),
  ('SAMET KALIN'),
  ('YÜCEL KIROĞLU'),
  ('MUSA AKYOL'),
  ('AHMET KÜRŞAT ŞİMŞEK'),
  ('AHMET ÇEPEL'),
  ('HAKAN YAŞAR'),
  ('MEHMET AKİF AYTEKİN'),
  ('HARUN YEŞİLBAŞ'),
  ('YİĞİT ACARKAN'),
  ('ŞABAN TAPAN'),
  ('KAAN ÇAĞLAYAN'),
  ('HASAN BASRİ GÜNYOL'),
  ('MUHAMMET ELTAŞ'),
  ('SERDAR ŞAHİN'),
  ('OLGUN BÖLÜK'),
  ('AHMET GÜLER'),
  ('CİHAN ERGİN'),
  ('ALPER ÖZCAN'),
  ('ZEYNEP ECE TOKER'),
  ('CANSEL ÇAYLIOĞLU'),
  ('AHMET HAKAN AKIN'),
  ('ERSİN ÖZKAN'),
  ('HALİT ÇELİK'),
  ('ULAŞ ÇELİK'),
  ('KADİR YÜKSELEN'),
  ('BARIŞ EROĞLU'),
  ('EMİR'),
  ('AHMET HİLMİ KÖK'),
  ('SEÇKİN AYBERK'),
  ('GÖKALP ATMACA'),
  ('CİHAT BIÇKI')
ON CONFLICT (name) DO NOTHING;
