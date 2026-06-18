-- Create manuf_final_olcum_measurements table
CREATE TABLE manuf_final_olcum_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarih DATE NOT NULL,
  sorumlu TEXT NOT NULL DEFAULT 'Zeynep Ece Toker',
  sira_no INTEGER NOT NULL, -- 1 to 6
  olculen_adet INTEGER,
  red_adet INTEGER,
  rework_adet INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_final_olcum_tarih_sira_no UNIQUE (tarih, sira_no)
);

ALTER TABLE manuf_final_olcum_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON manuf_final_olcum_measurements FOR ALL TO public USING (true) WITH CHECK (true);

-- Create manuf_final_olcum_rejects table
CREATE TABLE manuf_final_olcum_rejects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarih DATE NOT NULL,
  sira_no INTEGER NOT NULL, -- 1 to N
  parca_no TEXT NOT NULL,
  red_sebebi TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_final_reject_tarih_sira_no UNIQUE (tarih, sira_no)
);

ALTER TABLE manuf_final_olcum_rejects ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON manuf_final_olcum_rejects FOR ALL TO public USING (true) WITH CHECK (true);

-- Create manuf_final_olcum_reworks table
CREATE TABLE manuf_final_olcum_reworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarih DATE NOT NULL,
  sira_no INTEGER NOT NULL, -- 1 to M
  parca_no TEXT NOT NULL,
  rework_nedeni TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_final_rework_tarih_sira_no UNIQUE (tarih, sira_no)
);

ALTER TABLE manuf_final_olcum_reworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON manuf_final_olcum_reworks FOR ALL TO public USING (true) WITH CHECK (true);
