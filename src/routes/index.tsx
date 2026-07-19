import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
  Settings as SettingsIcon,
  Utensils,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
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

  // Live updates
  useEffect(() => {
    const ch = supabase
      .channel("dash")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          // simple invalidate through query client via window event
          window.dispatchEvent(new Event("orders-changed"));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const startWeek = new Date(now);
  startWeek.setDate(now.getDate() - 6);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const inRange = (d: string | null, from: Date) =>
    !!d && new Date(d) >= from;

  const todaysOrders = orders.filter((o) => o.function_date === today);
  const weekOrders = orders.filter((o) => inRange(o.function_date, startWeek));
  const monthOrders = orders.filter((o) =>
    inRange(o.function_date, startMonth),
  );
  const pending = orders.filter((o) =>
    ["Pending", "Preparing", "Ready"].includes(o.status),
  );
  const completed = orders.filter((o) =>
    ["Delivered", "Completed"].includes(o.status),
  );
  const upcoming = orders
    .filter((o) => o.function_date && o.function_date >= today)
    .sort((a, b) =>
      (a.function_date || "").localeCompare(b.function_date || ""),
    )
    .slice(0, 5);

  const todayRev = todaysOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const weekRev = weekOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const monthRev = monthOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const avgOrder = orders.length
    ? orders.reduce((s, o) => s + Number(o.total ?? 0), 0) / orders.length
    : 0;

  const phoneCounts = new Map<string, number>();
  orders.forEach((o) => {
    if (o.customer_phone)
      phoneCounts.set(
        o.customer_phone,
        (phoneCounts.get(o.customer_phone) ?? 0) + 1,
      );
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

  // Monthly revenue last 6 months
  const monthly = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const end = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
    const rev = orders
      .filter(
        (o) =>
          o.function_date &&
          new Date(o.function_date) >= d &&
          new Date(o.function_date) < end,
      )
      .reduce((s, o) => s + Number(o.total ?? 0), 0);
    return { month: d.toLocaleDateString("en-US", { month: "short" }), revenue: rev };
  });

  const quicks = [
    { to: "/orders/new", label: "New Order", icon: PlusCircle, primary: true },
    { to: "/orders", label: "All Orders", icon: ClipboardList },
    { to: "/customers", label: "Customers", icon: Users },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <AppLayout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of your catering business
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

      {/* Quick actions (mobile) */}
      <div className="mb-5 grid grid-cols-2 gap-2 md:hidden">
        {quicks.slice(0, 4).map((q) => {
          const Icon = q.icon;
          return (
            <Link
              key={q.to}
              to={q.to}
              className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold ${q.primary ? "bg-brand text-brand-foreground border-brand" : "bg-card"}`}
            >
              <Icon className="h-4 w-4" /> {q.label}
            </Link>
          );
        })}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat
          icon={IndianRupee}
          label="Today's Revenue"
          value={formatINR(todayRev)}
        />
        <Stat
          icon={TrendingUp}
          label="Weekly Revenue"
          value={formatINR(weekRev)}
        />
        <Stat
          icon={BarChart3}
          label="Monthly Revenue"
          value={formatINR(monthRev)}
        />
        <Stat
          icon={ShoppingCart}
          label="Today's Orders"
          value={todaysOrders.length.toString()}
        />
        <Stat icon={Clock} label="Pending" value={pending.length.toString()} accent />
        <Stat
          icon={CheckCircle2}
          label="Completed"
          value={completed.length.toString()}
        />
        <Stat
          icon={Utensils}
          label="Avg. Order"
          value={formatINR(Math.round(avgOrder))}
        />
        <Stat
          icon={Users}
          label="Customers"
          value={customers.length.toString()}
        />
      </div>

      {/* Charts */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Daily Revenue (last 7 days)</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: unknown) => formatINR(Number(v))}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-brand)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Status</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Pending", value: pending.length },
                    { name: "Completed", value: completed.length },
                    {
                      name: "Cancelled",
                      value: orders.filter((o) => o.status === "Cancelled")
                        .length,
                    },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  innerRadius={45}
                >
                  {["var(--color-chart-1)", "var(--color-chart-3)", "var(--color-destructive)"].map(
                    (c, i) => (
                      <Cell key={i} fill={c} />
                    ),
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: unknown) => formatINR(Number(v))} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-brand)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No upcoming functions
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((o) => (
                  <Link
                    key={o.id}
                    to="/orders/$id"
                    params={{ id: o.id }}
                    className="flex items-center justify-between rounded-lg border p-2.5 text-sm hover:bg-brand-soft"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold">
                        {o.customer_name || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {o.function_name || "Function"} · {o.function_date}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-brand">
                      {o.guest_count ?? 0} pl.
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Stat
          icon={Repeat}
          label="Repeat Customers"
          value={repeat.toString()}
        />
        <Stat
          icon={Clock}
          label="Upcoming Functions"
          value={upcoming.length.toString()}
        />
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
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ? "bg-destructive/10 text-destructive" : "bg-brand-soft text-brand"}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-xl font-bold md:text-2xl">{value}</div>
    </div>
  );
}
