-- Create manuf_ff_preform_reworks table
CREATE TABLE manuf_ff_preform_reworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarih DATE NOT NULL,
  sira_no INTEGER NOT NULL, -- 1 to M
  parca_no TEXT NOT NULL,
  rework_nedeni TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_ff_rework_tarih_sira_no UNIQUE (tarih, sira_no)
);

-- Enable RLS and allow all policy
ALTER TABLE manuf_ff_preform_reworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON manuf_ff_preform_reworks FOR ALL TO public USING (true) WITH CHECK (true);
