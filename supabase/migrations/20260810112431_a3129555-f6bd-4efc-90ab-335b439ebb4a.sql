-- Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner','staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'owner'));

DROP POLICY IF EXISTS "Owners manage roles" ON public.user_roles;
CREATE POLICY "Owners manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));

-- Lock down business data to authenticated users
DROP POLICY IF EXISTS "Open access orders" ON public.orders;
CREATE POLICY "Authenticated manage orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.orders FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;

DROP POLICY IF EXISTS "Open access order_items" ON public.order_items;
CREATE POLICY "Authenticated manage order_items" ON public.order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.order_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;

DROP POLICY IF EXISTS "Open access order_files" ON public.order_files;
CREATE POLICY "Authenticated manage order_files" ON public.order_files FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.order_files FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_files TO authenticated;

DROP POLICY IF EXISTS "Open access menu_items" ON public.menu_items;
CREATE POLICY "Authenticated read menu_items" ON public.menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners manage menu_items" ON public.menu_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));
REVOKE ALL ON public.menu_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;

DROP POLICY IF EXISTS "Open access customers" ON public.customers;
CREATE POLICY "Authenticated read customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update customers" ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Owners delete customers" ON public.customers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'owner'));
REVOKE ALL ON public.customers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;

DROP POLICY IF EXISTS "Open access settings" ON public.business_settings;
CREATE POLICY "Authenticated read settings" ON public.business_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners manage settings" ON public.business_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));
REVOKE ALL ON public.business_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_settings TO authenticated;