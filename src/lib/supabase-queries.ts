import { supabase } from "@/integrations/supabase/client";

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  sort_order: number;
  active: boolean;
};

export type OrderItem = {
  id?: string;
  order_id?: string;
  menu_item_id?: string | null;
  name: string;
  category: string;
  quantity: number;
  unit?: string;
  sort_order: number;
};

export type Order = {
  id: string;
  order_number: number;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  function_name: string | null;
  function_date: string | null;
  delivery_time: string | null;
  guest_count: number | null;
  plate_rate: number | null;
  breakfast_rate: number | null;
  lunch_rate: number | null;
  dinner_rate: number | null;
  tiffin_rate: number | null;
  servers_charge: number | null;
  transport_charge: number | null;
  gst: number | null;
  discount: number | null;
  total: number | null;
  advance: number | null;
  balance: number | null;
  remarks: string | null;
  status: string;
  order_details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type BusinessSettings = {
  id: number;
  business_name: string;
  tagline: string | null;
  phone: string | null;
  address: string | null;
  gst_number: string | null;
  footer: string | null;
  terms: string | null;
};

export const CATEGORIES = [
  "Breakfast",
  "Rice",
  "Curries",
  "Sweets",
  "Snacks",
  "Ice Cream",
  "Drinks",
] as const;

export async function fetchMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("active", true)
    .order("category")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as MenuItem[];
}

export async function fetchSettings(): Promise<BusinessSettings> {
  const { data, error } = await supabase
    .from("business_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data as BusinessSettings;
}

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Order[];
}

export async function fetchOrder(
  id: string,
): Promise<{ order: Order; items: OrderItem[] }> {
  const [{ data: order, error: e1 }, { data: items, error: e2 }] =
    await Promise.all([
      supabase.from("orders").select("*").eq("id", id).single(),
      supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id)
        .order("sort_order"),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return { order: order as Order, items: (items ?? []) as OrderItem[] };
}

export async function fetchCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}
