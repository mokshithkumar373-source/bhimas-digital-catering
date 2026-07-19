import type { Order, OrderItem } from "./supabase-queries";

export function calcTotals(o: Partial<Order>) {
  const plates = Number(o.guest_count ?? 0);
  const rate = Number(o.plate_rate ?? 0);
  const plateAmount = plates * rate;
  const extras =
    Number(o.servers_charge ?? 0) +
    Number(o.transport_charge ?? 0) +
    Number(o.gst ?? 0);
  const discount = Number(o.discount ?? 0);
  const total = Math.max(0, plateAmount + extras - discount);
  const advance = Number(o.advance ?? 0);
  const balance = total - advance;
  return { plateAmount, total, balance };
}

export function formatINR(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function groupItemsByCategory(items: OrderItem[]) {
  const map = new Map<string, OrderItem[]>();
  for (const it of items) {
    if (!map.has(it.category)) map.set(it.category, []);
    map.get(it.category)!.push(it);
  }
  return map;
}
