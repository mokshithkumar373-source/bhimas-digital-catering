CREATE TABLE IF NOT EXISTS public.order_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_files TO anon;
GRANT ALL ON public.order_files TO service_role;

ALTER TABLE public.order_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open access order_files" ON public.order_files FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Open read order exports" ON storage.objects FOR SELECT USING (bucket_id = 'order-exports');
CREATE POLICY "Open write order exports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'order-exports');
CREATE POLICY "Open update order exports" ON storage.objects FOR UPDATE USING (bucket_id = 'order-exports');