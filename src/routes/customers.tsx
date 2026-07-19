import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { fetchCustomers, fetchOrders } from "@/lib/supabase-queries";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/order-utils";
import { useState } from "react";
import { Search, User } from "lucide-react";

export const Route = createFileRoute("/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });
  const [q, setQ] = useState("");

  const stats = customers.map((c) => {
    const myOrders = orders.filter(
      (o) => o.customer_id === c.id || o.customer_phone === c.phone,
    );
    const revenue = myOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const avgPlates =
      myOrders.length > 0
        ? Math.round(
            myOrders.reduce((s, o) => s + Number(o.guest_count ?? 0), 0) /
              myOrders.length,
          )
        : 0;
    return { c, count: myOrders.length, revenue, avgPlates, last: myOrders[0] };
  });

  const filtered = stats.filter(({ c }) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      c.name.toLowerCase().includes(s) ||
      (c.phone ?? "").includes(s) ||
      (c.address ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <AppLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-bold md:text-3xl">Customers</h1>
        <p className="text-sm text-muted-foreground">
          {customers.length} customers
        </p>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search by name, phone, address"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card py-16 text-center text-sm text-muted-foreground">
          No customers yet — they are added automatically when you save orders.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ c, count, revenue, avgPlates, last }) => (
            <div
              key={c.id}
              className="rounded-2xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.phone || "—"}
                  </div>
                </div>
              </div>
              {c.address && (
                <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {c.address}
                </div>
              )}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-muted p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Orders
                  </div>
                  <div className="text-base font-bold">{count}</div>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Revenue
                  </div>
                  <div className="text-sm font-bold text-brand">
                    {formatINR(revenue)}
                  </div>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Avg Plates
                  </div>
                  <div className="text-base font-bold">{avgPlates}</div>
                </div>
              </div>
              {last && (
                <Link
                  to="/orders/$id"
                  params={{ id: last.id }}
                  className="mt-3 block text-center text-xs font-semibold text-brand hover:underline"
                >
                  View latest order →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
