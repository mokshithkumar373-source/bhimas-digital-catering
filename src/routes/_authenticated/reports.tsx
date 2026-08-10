import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { fetchOrders } from "@/lib/supabase-queries";
import { formatINR } from "@/lib/order-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });
  const { data: itemsData = [] } = useQuery({
    queryKey: ["order-items-all"],
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("*");
      return data ?? [];
    },
  });

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const startWeek = new Date(now);
  startWeek.setDate(now.getDate() - 6);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startYear = new Date(now.getFullYear(), 0, 1);

  const sum = (list: typeof orders) => list.reduce((s, o) => s + Number(o.total ?? 0), 0);

  const inRange = (d: string | null, from: Date) => !!d && new Date(d) >= from;

  const daily = sum(orders.filter((o) => o.function_date === today));
  const weekly = sum(orders.filter((o) => inRange(o.function_date, startWeek)));
  const monthly = sum(orders.filter((o) => inRange(o.function_date, startMonth)));
  const yearly = sum(orders.filter((o) => inRange(o.function_date, startYear)));

  // Top items
  const itemCount = new Map<string, { qty: number; category: string }>();
  itemsData.forEach((it) => {
    const cur = itemCount.get(it.name) ?? { qty: 0, category: it.category };
    cur.qty += Number(it.quantity);
    itemCount.set(it.name, cur);
  });
  const topItems = [...itemCount.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
  const topCurry = topItems.find(([, v]) => v.category === "Curries");
  const topSweet = topItems.find(([, v]) => v.category === "Sweets");

  // Top customers
  const custRev = new Map<string, number>();
  orders.forEach((o) => {
    const k = o.customer_name || "Unknown";
    custRev.set(k, (custRev.get(k) ?? 0) + Number(o.total ?? 0));
  });
  const topCustomers = [...custRev.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <AppLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-bold md:text-3xl">Reports</h1>
        <p className="text-sm text-muted-foreground">Revenue and menu insights</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SumCard label="Daily" value={formatINR(daily)} />
        <SumCard label="Weekly" value={formatINR(weekly)} />
        <SumCard label="Monthly" value={formatINR(monthly)} />
        <SumCard label="Yearly" value={formatINR(yearly)} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Menu Items</CardTitle>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {topItems.map(([name, v], i) => (
                  <li
                    key={name}
                    className="flex items-center justify-between border-b py-1.5 last:border-0"
                  >
                    <span>
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                        {i + 1}
                      </span>
                      {name}
                      <span className="ml-2 text-xs text-muted-foreground">{v.category}</span>
                    </span>
                    <span className="font-bold">{v.qty}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {topCustomers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {topCustomers.map(([name, rev], i) => (
                  <li
                    key={name}
                    className="flex items-center justify-between border-b py-1.5 last:border-0"
                  >
                    <span>
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                        {i + 1}
                      </span>
                      {name}
                    </span>
                    <span className="font-bold text-brand">{formatINR(rev)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Ordered Curry</CardTitle>
          </CardHeader>
          <CardContent>
            {topCurry ? (
              <div>
                <div className="text-2xl font-bold">{topCurry[0]}</div>
                <div className="text-sm text-muted-foreground">Ordered {topCurry[1].qty} times</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Ordered Sweet</CardTitle>
          </CardHeader>
          <CardContent>
            {topSweet ? (
              <div>
                <div className="text-2xl font-bold">{topSweet[0]}</div>
                <div className="text-sm text-muted-foreground">Ordered {topSweet[1].qty} times</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function SumCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium text-muted-foreground">{label} Revenue</div>
      <div className="mt-1 text-xl font-bold md:text-2xl text-brand">{value}</div>
    </div>
  );
}
