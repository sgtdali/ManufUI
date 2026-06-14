-- Create manuf_suggestions table
CREATE TABLE manuf_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bolum TEXT NOT NULL,
  onerisi TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and create allow_all policy
ALTER TABLE manuf_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON manuf_suggestions FOR ALL TO public USING (true) WITH CHECK (true);
