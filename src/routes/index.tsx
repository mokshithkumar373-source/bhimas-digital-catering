import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { fetchOrders } from "@/lib/supabase-queries";
import { formatINR } from "@/lib/order-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  IndianRupee,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Users,
  Repeat,
  CalendarClock,
  TrendingUp,
  PlusCircle,
  ClipboardList,
  BarChart3,
  Search,
  Package,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("*");
      return data ?? [];
    },
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ["order_items"],
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("name, quantity");
      return data ?? [];
    },
  });

  // Supabase Realtime subscriptions to invalidate query cache
  useEffect(() => {
    const channel = supabase
      .channel("dashboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        queryClient.invalidateQueries({ queryKey: ["order_items"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const startWeek = new Date(now);
  startWeek.setDate(now.getDate() - 6);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const inRange = (d: string | null, from: Date) => !!d && new Date(d) >= from;

  const todaysOrders = orders.filter((o) => o.function_date === today);
  const weekOrders = orders.filter((o) => inRange(o.function_date, startWeek));
  const monthOrders = orders.filter((o) => inRange(o.function_date, startMonth));

  const pending = orders.filter((o) => ["Pending", "Preparing", "Ready"].includes(o.status));
  const completed = orders.filter((o) => ["Delivered", "Completed"].includes(o.status));

  const upcoming = orders
    .filter((o) => o.function_date && o.function_date >= today)
    .sort((a, b) => (a.function_date || "").localeCompare(b.function_date || ""))
    .slice(0, 5);

  const todayRev = todaysOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const weekRev = weekOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const monthRev = monthOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);

  // Today's collections = Advance of orders created today
  const todayCollections = useMemo(() => {
    return orders
      .filter((o) => o.created_at && o.created_at.slice(0, 10) === today)
      .reduce((s, o) => s + Number(o.advance ?? 0), 0);
  }, [orders, today]);

  // Repeat customers calculation
  const phoneCounts = new Map<string, number>();
  orders.forEach((o) => {
    if (o.customer_phone) {
      phoneCounts.set(o.customer_phone, (phoneCounts.get(o.customer_phone) ?? 0) + 1);
    }
  });
  const repeat = Array.from(phoneCounts.values()).filter((c) => c > 1).length;

  // Chart data: last 7 days revenue
  const daily = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const rev = orders
      .filter((o) => o.function_date === key)
      .reduce((s, o) => s + Number(o.total ?? 0), 0);
    return {
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      revenue: rev,
    };
  });

  // Top Ordered Items (Aggregated from order_items table)
  const topItemsData = useMemo(() => {
    const counts = new Map<string, number>();
    orderItems.forEach((item) => {
      if (item.name) {
        counts.set(item.name, (counts.get(item.name) ?? 0) + Number(item.quantity ?? 1));
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orderItems]);

  // Top Customers by revenue contribution
  const topCustomersData = useMemo(() => {
    const spending = new Map<string, number>();
    orders.forEach((o) => {
      if (o.customer_name) {
        spending.set(o.customer_name, (spending.get(o.customer_name) ?? 0) + Number(o.total ?? 0));
      }
    });
    return Array.from(spending.entries())
      .map(([name, spendingAmt]) => ({ name, spending: spendingAmt }))
      .sort((a, b) => b.spending - a.spending)
      .slice(0, 5);
  }, [orders]);

  // Filtered orders list (Recent Orders list filter)
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders.slice(0, 6);
    const s = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        (o.customer_name ?? "").toLowerCase().includes(s) ||
        (o.customer_phone ?? "").includes(s) ||
        (o.function_name ?? "").toLowerCase().includes(s) ||
        (o.function_date ?? "").includes(s) ||
        String(o.order_number).includes(s) ||
        o.status.toLowerCase().includes(s),
    );
  }, [orders, searchQuery]);

  return (
    <AppLayout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Bhimas Catering real-time metrics & management console
          </p>
        </div>
        <Link
          to="/orders/new"
          className="hidden md:inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition-colors hover:opacity-90"
        >
          <PlusCircle className="h-4 w-4" />
          New Order
        </Link>
      </div>

      {/* Rebuild Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat icon={IndianRupee} label="Today's Revenue" value={formatINR(todayRev)} />
        <Stat icon={TrendingUp} label="Weekly Revenue" value={formatINR(weekRev)} />
        <Stat icon={BarChart3} label="Monthly Revenue" value={formatINR(monthRev)} />
        <Stat
          icon={IndianRupee}
          label="Today's Collections"
          value={formatINR(todayCollections)}
          accent
        />
        <Stat icon={ShoppingCart} label="Today's Orders" value={todaysOrders.length.toString()} />
        <Stat icon={Clock} label="Pending Orders" value={pending.length.toString()} accent />
        <Stat icon={CheckCircle2} label="Completed Orders" value={completed.length.toString()} />
        <Stat icon={Users} label="Total Customers" value={customers.length.toString()} />
        <Stat icon={Repeat} label="Repeat Customers" value={repeat.toString()} />
        <Stat icon={CalendarClock} label="Upcoming Functions" value={upcoming.length.toString()} />
      </div>

      {/* Visual Analytics */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Daily Revenue last 7 days */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Daily Revenue (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: unknown) => formatINR(Number(v))}
                  contentStyle={{ borderRadius: 8 }}
                />
                <Bar dataKey="revenue" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Order Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }} className="flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Pending", value: pending.length },
                    { name: "Completed", value: completed.length },
                    {
                      name: "Cancelled",
                      value: orders.filter((o) => o.status === "Cancelled").length,
                    },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  innerRadius={50}
                >
                  {["#d97706", "#059669", "#dc2626"].map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Ordered Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Top Ordered Items
            </CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItemsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Top Customers (Revenue Contribution)
            </CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCustomersData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => formatINR(Number(v))} />
                <Bar dataKey="spending" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Search & Recent Orders list */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent Orders List with Inline Search */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Recent Orders / Database Search
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                className="pl-8 h-8 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-2">
              {filteredOrders.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-6">
                  No orders match search query
                </div>
              ) : (
                filteredOrders.map((o) => (
                  <Link
                    key={o.id}
                    to="/orders/$id"
                    params={{ id: o.id }}
                    className="flex items-center justify-between rounded-xl border p-3 hover:bg-brand-soft/40 transition-colors text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{o.customer_name || "—"}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          #{o.order_number}
                        </span>
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {o.function_name || "Catering"} · {o.function_date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-800">{formatINR(o.total)}</div>
                      <div className="text-[9px] uppercase font-semibold text-amber-700 mt-0.5">
                        {o.status}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Functions Schedule */}
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-green-600" /> Upcoming Schedules
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {upcoming.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No upcoming schedules
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((o) => (
                  <Link
                    key={o.id}
                    to="/orders/$id"
                    params={{ id: o.id }}
                    className="flex flex-col gap-1 rounded-xl border p-2.5 hover:bg-brand-soft/40 transition-colors text-xs"
                  >
                    <div className="flex justify-between items-center font-bold">
                      <span className="truncate">{o.customer_name || "—"}</span>
                      <span className="text-brand shrink-0">{o.guest_count ?? 0} Pl.</span>
                    </div>
                    <div className="text-slate-500 flex justify-between">
                      <span>{o.function_name || "Catering"}</span>
                      <span className="font-medium text-slate-700">{o.function_date}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            accent
              ? "bg-amber-50 text-amber-600 border border-amber-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <div className="mt-2 text-lg font-bold md:text-xl text-slate-800">{value}</div>
    </div>
  );
}
