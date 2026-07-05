-- Migration: Seed manuf_personnel_tracking from Excel matrix (with nullable dates)
-- Date: 2026-07-05

-- Make dates nullable so we do not have to force guess values
ALTER TABLE public.manuf_personnel_tracking 
  ALTER COLUMN arrival_date DROP NOT NULL,
  ALTER COLUMN return_date DROP NOT NULL;

TRUNCATE TABLE public.manuf_personnel_tracking;

INSERT INTO public.manuf_personnel_tracking (name, location, arrival_date, return_date) VALUES
  ('CENGİZ ÜSTÜN', 'NCMS Otel', NULL, '2026-07-13'),
  ('ÇAĞRI CAN ÇOLAK', 'NCMS Otel', NULL, '2026-08-13'),
  ('DOĞAN EROL', 'NCMS Otel', NULL, '2026-07-11'),
  ('MUHSİN UYSAL', 'NCMS Otel', NULL, '2026-07-22'),
  ('MÜCAHİT TOPTAŞ', 'NCMS Otel', NULL, '2026-08-13'),
  ('OKAN CEYHAN', 'NCMS Otel', NULL, '2026-08-13'),
  ('ÖZGÜR KALAYCI', 'NCMS Otel', NULL, '2026-07-10'),
  ('SUAT TUNÇ', 'NCMS Otel', NULL, '2026-07-11'),
  ('ŞENEL ÇELİK', 'NCMS Otel', NULL, '2026-07-11'),
  ('TANER ÇELİK', 'NCMS Otel', NULL, '2026-07-16'),
  ('VOLKAN MADEN', 'NCMS Otel', NULL, '2026-07-13'),
  ('YASİN DURSUN', 'NCMS Otel', NULL, '2026-07-10'),
  ('BARIŞ ŞAHİNOĞLU', 'NCMS Otel', NULL, '2026-07-16'),
  ('MEHMET DOĞANAY', 'NCMS Otel', NULL, '2026-07-13'),
  ('TAYFUN VURAL', 'NCMS Otel', NULL, '2026-07-13'),
  ('SAMET KALIN', 'Dış Otel', NULL, '2026-07-07'),
  ('YÜCEL KIROĞLU', 'NCMS Otel', NULL, '2026-07-22'),
  ('MUSA AKYOL', 'NCMS Otel', NULL, '2026-07-10'),
  ('AHMET KÜRŞAT ŞİMŞEK', 'NCMS Otel', NULL, '2026-07-07'),
  ('AHMET ÇEPEL', 'NCMS Otel', NULL, '2026-07-22'),
  ('HAKAN YAŞAR', 'NCMS Otel', NULL, '2026-07-13'),
  ('MEHMET AKİF AYTEKİN', 'NCMS Otel', NULL, '2026-07-10'),
  ('HARUN YEŞİLBAŞ', 'Dış Otel', NULL, '2026-07-07'),
  ('YİĞİT ACARKAN', 'Dış Otel', NULL, '2026-07-10'),
  ('ŞABAN TAPAN', 'Dış Otel', NULL, NULL),
  ('KAAN ÇAĞLAYAN', 'Dış Otel', NULL, '2026-07-07'),
  ('HASAN BASRİ GÜNYOL', 'NCMS Otel', NULL, '2026-07-13'),
  ('MUHAMMET ELTAŞ', 'NCMS Otel', NULL, '2026-07-22'),
  ('SERDAR ŞAHİN', 'NCMS Otel', NULL, NULL),
  ('OLGUN BÖLÜK', 'Dış Otel', NULL, NULL),
  ('AHMET GÜLER', 'Dış Otel', NULL, NULL),
  ('CİHAN ERGİN', 'Dış Otel', NULL, '2026-07-22'),
  ('ALPER ÖZCAN', 'Dış Otel', NULL, '2026-07-22'),
  ('ZEYNEP ECE TOKER', 'NCMS Otel', NULL, '2026-07-07'),
  ('CANSEL ÇAYLIOĞLU', 'NCMS Otel', NULL, '2026-07-07'),
  ('AHMET HAKAN AKIN', 'NCMS Otel', NULL, '2026-07-22'),
  ('ERSİN ÖZKAN', 'NCMS Otel', NULL, '2026-07-10'),
  ('HALİT ÇELİK', 'NCMS Otel', NULL, '2026-07-22'),
  ('ULAŞ ÇELİK', 'Dış Otel', NULL, '2026-07-13'),
  ('KADİR YÜKSELEN', 'NCMS Otel', NULL, '2026-07-29'),
  ('BARIŞ EROĞLU', 'NCMS Otel', '2026-07-10', NULL),
  ('EMİR', 'NCMS Otel', '2026-07-10', NULL),
  ('AHMET HİLMİ KÖK', 'NCMS Otel', '2026-07-08', NULL),
  ('SEÇKİN AYBERK', 'NCMS Otel', '2026-07-08', NULL),
  ('GÖKALP ATMACA', 'NCMS Otel', '2026-07-08', NULL),
  ('CİHAT BIÇKI', 'NCMS Otel', '2026-07-20', NULL);
