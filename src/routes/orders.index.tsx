import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { fetchOrders } from "@/lib/supabase-queries";
import { formatINR } from "@/lib/order-utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Search, PlusCircle } from "lucide-react";

export const Route = createFileRoute("/orders/")({
  component: OrdersList,
});

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Preparing: "bg-blue-100 text-blue-800",
  Ready: "bg-purple-100 text-purple-800",
  Delivered: "bg-emerald-100 text-emerald-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-rose-100 text-rose-800",
};

function OrdersList() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("All");

  const filtered = orders.filter((o) => {
    if (status !== "All" && o.status !== status) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (o.customer_name ?? "").toLowerCase().includes(s) ||
      (o.customer_phone ?? "").includes(s) ||
      (o.function_name ?? "").toLowerCase().includes(s) ||
      (o.function_date ?? "").includes(s) ||
      String(o.order_number).includes(s)
    );
  });

  return (
    <AppLayout>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {orders.length} total orders
          </p>
        </div>
        <Link
          to="/orders/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground"
        >
          <PlusCircle className="h-4 w-4" /> New Order
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by name, phone, date, order #"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {["All", "Pending", "Preparing", "Ready", "Delivered", "Completed", "Cancelled"].map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${status === s ? "bg-brand text-brand-foreground" : "bg-secondary text-secondary-foreground hover:bg-brand-soft"}`}
              >
                {s}
              </button>
            ),
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">No orders yet.</p>
          <Link
            to="/orders/new"
            className="mt-3 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground"
          >
            Create your first order
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="hidden grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground md:grid">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Customer</div>
            <div className="col-span-2">Function</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1">Plates</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1 text-right">Status</div>
          </div>
          {filtered.map((o) => (
            <Link
              key={o.id}
              to="/orders/$id"
              params={{ id: o.id }}
              className="grid grid-cols-1 gap-1 border-b px-4 py-3 text-sm transition-colors hover:bg-brand-soft/50 md:grid-cols-12 md:gap-2 md:items-center"
            >
              <div className="col-span-1 font-mono text-xs text-muted-foreground md:text-sm">
                #{o.order_number}
              </div>
              <div className="col-span-3">
                <div className="font-semibold">{o.customer_name || "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {o.customer_phone}
                </div>
              </div>
              <div className="col-span-2 text-muted-foreground md:text-foreground">
                {o.function_name}
              </div>
              <div className="col-span-2 text-muted-foreground md:text-foreground">
                {o.function_date}
              </div>
              <div className="col-span-1 font-semibold">
                {o.guest_count ?? 0}
              </div>
              <div className="col-span-2 text-right font-bold text-brand">
                {formatINR(o.total)}
              </div>
              <div className="col-span-1 text-right">
                <Badge
                  className={`${STATUS_COLORS[o.status] ?? "bg-muted"} border-0 font-semibold`}
                  variant="secondary"
                >
                  {o.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
