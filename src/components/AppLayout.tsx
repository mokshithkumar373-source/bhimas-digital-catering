import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  Utensils,
  LogOut,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useRole";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ownerOnly: false },
  { to: "/orders/new", label: "New Order", icon: PlusCircle, ownerOnly: false },
  { to: "/orders", label: "Orders", icon: ClipboardList, ownerOnly: false },
  { to: "/customers", label: "Customers", icon: Users, ownerOnly: false },
  { to: "/reports", label: "Reports", icon: BarChart3, ownerOnly: true },
  { to: "/settings", label: "Settings", icon: SettingsIcon, ownerOnly: true },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: roles = [] } = useRoles();
  const isOwner = roles.includes("owner");

  const items = nav.filter((n) => !n.ownerOnly || isOwner);
  const mobileItems = items.filter((n) => n.to !== "/orders/new");

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const isActive = (to: string) => path === to || path.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card md:flex md:flex-col">
        <div className="flex items-center gap-3 border-b px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-brand-foreground">
            <Utensils className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold leading-tight text-brand">Bhimas Catering</div>
            <div className="text-xs text-muted-foreground">తణుకు</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((n) => {
            const active = isActive(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-brand-soft hover:text-brand",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t px-3 py-3">
          <div className="px-2 text-[11px] text-muted-foreground">
            {isOwner ? "Owner access" : "Staff access"} · 90000 74444
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-brand-soft hover:text-brand"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <Utensils className="h-4 w-4" />
          </div>
          <div className="text-sm font-bold text-brand">Bhimas Catering</div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/orders/new"
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground"
          >
            + New
          </Link>
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className="rounded-lg border p-1.5 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid border-t bg-card md:hidden"
        style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}
      >
        {mobileItems.map((n) => {
          const active = isActive(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium",
                active ? "text-brand" : "text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <main className="md:pl-64">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-6">{children}</div>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
