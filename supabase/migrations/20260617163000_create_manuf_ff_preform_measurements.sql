-- Create manuf_ff_preform_measurements table
CREATE TABLE manuf_ff_preform_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarih DATE NOT NULL,
  sorumlu TEXT NOT NULL DEFAULT 'Zeynep Ece Toker',
  sira_no INTEGER NOT NULL, -- 1 to 6
  olculen_adet INTEGER,
  red_adet INTEGER,
  rework_adet INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_ff_preform_tarih_sira_no UNIQUE (tarih, sira_no)
);

-- Enable RLS and allow all policy
ALTER TABLE manuf_ff_preform_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON manuf_ff_preform_measurements FOR ALL TO public USING (true) WITH CHECK (true);
