import { useMemo, useState } from "react";
import type { MenuItem, OrderItem } from "@/lib/supabase-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  menu: MenuItem[];
  items: OrderItem[];
  onChange: (items: OrderItem[]) => void;
}

const CATEGORIES = ["Breakfast", "Rice", "Curries", "Sweets", "Snacks", "Ice Cream", "Drinks"];

export function MenuPicker({ menu, items, onChange }: Props) {
  const [tab, setTab] = useState<string>(CATEGORIES[0]);
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () =>
      menu.filter(
        (m) => m.category === tab && (q ? m.name.toLowerCase().includes(q.toLowerCase()) : true),
      ),
    [menu, tab, q],
  );

  const has = (id: string) => items.find((i) => i.menu_item_id === id);

  const toggleAdd = (m: MenuItem) => {
    if (has(m.id)) return;
    onChange([
      ...items,
      {
        menu_item_id: m.id,
        name: m.name,
        category: m.category,
        quantity: 1,
        sort_order: items.filter((i) => i.category === m.category).length,
      },
    ]);
  };

  const setQty = (idx: number, delta: number) => {
    const next = items.slice();
    next[idx] = {
      ...next[idx],
      quantity: Math.max(1, Number(next[idx].quantity) + delta),
    };
    onChange(next);
  };

  const remove = (idx: number) => {
    const next = items.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-3">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setTab(c)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                tab === c
                  ? "bg-brand text-brand-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-brand-soft",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search items..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="max-h-[280px] overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((m) => {
            const selected = !!has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleAdd(m)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm font-medium transition-all",
                  selected
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border bg-background hover:border-brand hover:bg-brand-soft",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{m.name}</span>
                  {selected ? (
                    <span className="text-xs">✓</span>
                  ) : (
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full py-6 text-center text-sm text-muted-foreground">
              No items in this category.
            </div>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="border-t p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Selected ({items.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {items.map((it, idx) => (
              <div
                key={(it.menu_item_id ?? it.name) + idx}
                className="flex items-center gap-1 rounded-full border bg-background pl-3 pr-1 py-1 text-xs"
              >
                <span className="font-medium">{it.name}</span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setQty(idx, -1)}
                    className="rounded-full p-0.5 hover:bg-muted"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-[16px] text-center font-bold">{it.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQty(idx, 1)}
                    className="rounded-full p-0.5 hover:bg-muted"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(idx)}
                    className="h-5 w-5"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
