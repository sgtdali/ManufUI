CREATE TABLE IF NOT EXISTS public.manuf_wip_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarih date NOT NULL,
  kaynak_hucresi text NOT NULL,
  hedef_hucresi text NOT NULL,
  hesaplanan_adet integer,
  gercek_adet integer,
  override_edildi boolean DEFAULT false,
  notlar text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(tarih, kaynak_hucresi, hedef_hucresi)
);

ALTER TABLE public.manuf_wip_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON public.manuf_wip_stock
  FOR ALL USING (true) WITH CHECK (true);
