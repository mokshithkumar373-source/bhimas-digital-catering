-- 1. Create update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Create Customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO anon, authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.customers;
DROP POLICY IF EXISTS "Allow anon full access" ON public.customers;
CREATE POLICY "Open access customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_customers_updated ON public.customers;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS customers_phone_idx ON public.customers(phone);

-- 3. Create Menu items table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO anon, authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.menu_items;
DROP POLICY IF EXISTS "Allow anon full access" ON public.menu_items;
CREATE POLICY "Open access menu_items" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_menu_items_updated ON public.menu_items;
CREATE TRIGGER trg_menu_items_updated BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS menu_items_category_idx ON public.menu_items(category);

-- 4. Create Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  function_name TEXT,
  function_date DATE,
  delivery_time TEXT,
  guest_count INT DEFAULT 0,
  plate_rate NUMERIC(10,2) DEFAULT 0,
  breakfast_rate NUMERIC(10,2) DEFAULT 0,
  lunch_rate NUMERIC(10,2) DEFAULT 0,
  dinner_rate NUMERIC(10,2) DEFAULT 0,
  tiffin_rate NUMERIC(10,2) DEFAULT 0,
  servers_charge NUMERIC(10,2) DEFAULT 0,
  transport_charge NUMERIC(10,2) DEFAULT 0,
  gst NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  advance NUMERIC(12,2) DEFAULT 0,
  balance NUMERIC(12,2) DEFAULT 0,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  order_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.orders;
DROP POLICY IF EXISTS "Allow anon full access" ON public.orders;
CREATE POLICY "Open access orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_orders_updated ON public.orders;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS orders_function_date_idx ON public.orders(function_date);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON public.orders(customer_id);

-- 5. Create Order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'nos',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO anon, authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.order_items;
DROP POLICY IF EXISTS "Allow anon full access" ON public.order_items;
CREATE POLICY "Open access order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items(order_id);

-- 6. Create Business settings table
CREATE TABLE IF NOT EXISTS public.business_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT 'Bhimas Catering',
  tagline TEXT DEFAULT 'తణుకు',
  phone TEXT DEFAULT '90000 74444',
  address TEXT,
  gst_number TEXT,
  footer TEXT DEFAULT 'మేము ఇచ్చేవి :- పేపర్ ప్లేట్లు మరియు పేపర్ రోలు మాత్రమే',
  terms TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_settings TO anon, authenticated;
GRANT ALL ON public.business_settings TO service_role;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access settings" ON public.business_settings;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.business_settings;
DROP POLICY IF EXISTS "Allow anon full access" ON public.business_settings;
CREATE POLICY "Open access settings" ON public.business_settings FOR ALL USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_settings_updated ON public.business_settings;
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default business settings row
INSERT INTO public.business_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Seed default menu items
INSERT INTO public.menu_items (name, category, sort_order) VALUES
('Idly','Breakfast',1),('Vada','Breakfast',2),('Puri','Breakfast',3),('Dosa','Breakfast',4),('Upma','Breakfast',5),('Pongal','Breakfast',6),('Poori Curry','Breakfast',7),
('White Rice','Rice',1),('Veg Biryani','Rice',2),('Pulihora','Rice',3),('Jeera Rice','Rice',4),('Fried Rice','Rice',5),('Bagara Rice','Rice',6),
('Paneer Butter Masala','Curries',1),('Paneer Curry','Curries',2),('Brinjal Curry','Curries',3),('Aloo Curry','Curries',4),('Mixed Veg Curry','Curries',5),('Capsicum Curry','Curries',6),('Mushroom Curry','Curries',7),('Dal Fry','Curries',8),('Sambar','Curries',9),('Rasam','Curries',10),
('Rasgulla','Sweets',1),('Gulab Jamun','Sweets',2),('Kaju Sweet','Sweets',3),('Pootharekulu','Sweets',4),('Boondi Laddu','Sweets',5),('Double Ka Meetha','Sweets',6),('Kesari','Sweets',7),('Badusha','Sweets',8),('Mysore Pak','Sweets',9),
('Mirchi Bajji','Snacks',1),('Veg Cutlet','Snacks',2),('Pakodi','Snacks',3),('Samosa','Snacks',4),('Punugulu','Snacks',5),
('Vanilla Ice Cream','Ice Cream',1),('Chocolate Ice Cream','Ice Cream',2),('Strawberry Ice Cream','Ice Cream',3),('Butterscotch Ice Cream','Ice Cream',4),('Kulfi','Ice Cream',5),
('Water Bottle','Drinks',1),('Cool Drinks','Drinks',2),('Badam Milk','Drinks',3),('Tea','Drinks',4),('Coffee','Drinks',5),('Fruit Juice','Drinks',6)
ON CONFLICT DO NOTHING;

-- 7. Create Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  role TEXT NOT NULL DEFAULT 'Staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access profiles" ON public.profiles;
CREATE POLICY "Open access profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Create Settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT 'Bhimas Catering',
  phone TEXT DEFAULT '90000 74444',
  address TEXT,
  logo_url TEXT,
  gst_number TEXT,
  footer_text TEXT DEFAULT 'We Provide : Paper Plates & Paper Rolls',
  terms_conditions TEXT,
  paper_header TEXT,
  paper_footer TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access settings_table" ON public.settings;
CREATE POLICY "Open access settings_table" ON public.settings FOR ALL USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS trg_settings_table_updated ON public.settings;
CREATE TRIGGER trg_settings_table_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 9. Add Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access categories" ON public.categories;
CREATE POLICY "Open access categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- Populate default categories
INSERT INTO public.categories (name) VALUES
('Breakfast'), ('Lunch'), ('Dinner'), ('Night Tiffin'), ('Sweets'), ('Curries'), ('Rice'), ('Snacks'), ('Drinks')
ON CONFLICT (name) DO NOTHING;

-- 10. Add Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO anon, authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access payments" ON public.payments;
CREATE POLICY "Open access payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

-- 11. Add Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  category TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon, authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access expenses" ON public.expenses;
CREATE POLICY "Open access expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- 12. Add Dashboard Stats table
CREATE TABLE IF NOT EXISTS public.dashboard_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_stats TO anon, authenticated;
GRANT ALL ON public.dashboard_stats TO service_role;
ALTER TABLE public.dashboard_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access dashboard_stats" ON public.dashboard_stats;
CREATE POLICY "Open access dashboard_stats" ON public.dashboard_stats FOR ALL USING (true) WITH CHECK (true);

-- 13. Add Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon, authenticated;
GRANT ALL ON public.users TO service_role;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open access users" ON public.users;
CREATE POLICY "Open access users" ON public.users FOR ALL USING (true) WITH CHECK (true);
