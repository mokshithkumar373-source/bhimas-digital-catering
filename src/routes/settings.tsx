import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchMenuItems,
  fetchSettings,
  type MenuItem,
} from "@/lib/supabase-queries";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const CATEGORIES = [
  "Breakfast",
  "Rice",
  "Curries",
  "Sweets",
  "Snacks",
  "Ice Cream",
  "Drinks",
];

function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });
  const { data: menu = [] } = useQuery({
    queryKey: ["menu"],
    queryFn: fetchMenuItems,
  });

  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (settings) {
      setForm({
        business_name: settings.business_name ?? "",
        tagline: settings.tagline ?? "",
        phone: settings.phone ?? "",
        address: settings.address ?? "",
        gst_number: settings.gst_number ?? "",
        footer: settings.footer ?? "",
        terms: settings.terms ?? "",
      });
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("business_settings")
        .update(form as never)
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [newItem, setNewItem] = useState({ name: "", category: "Curries" });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!newItem.name.trim()) throw new Error("Name required");
      const { error } = await supabase.from("menu_items").insert({
        name: newItem.name.trim(),
        category: newItem.category,
        sort_order: menu.filter((m) => m.category === newItem.category).length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewItem({ name: "", category: newItem.category });
      qc.invalidateQueries({ queryKey: ["menu"] });
      toast.success("Item added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("menu_items")
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu"] }),
  });

  return (
    <AppLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-bold md:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Business details and menu management
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <TextField
              label="Business Name"
              value={form.business_name}
              onChange={(v) => setForm({ ...form, business_name: v })}
            />
            <TextField
              label="Tagline / Location (Telugu)"
              value={form.tagline}
              onChange={(v) => setForm({ ...form, tagline: v })}
            />
            <TextField
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
            />
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Address
              </Label>
              <Textarea
                rows={2}
                value={form.address ?? ""}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
              />
            </div>
            <TextField
              label="GST Number"
              value={form.gst_number}
              onChange={(v) => setForm({ ...form, gst_number: v })}
            />
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Footer (Telugu)
              </Label>
              <Textarea
                rows={2}
                value={form.footer ?? ""}
                onChange={(e) => setForm({ ...form, footer: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Terms & Conditions
              </Label>
              <Textarea
                rows={3}
                value={form.terms ?? ""}
                onChange={(e) => setForm({ ...form, terms: e.target.value })}
              />
            </div>
            <Button
              onClick={() => saveSettings.mutate()}
              disabled={saveSettings.isPending}
              className="bg-brand text-brand-foreground hover:opacity-90"
            >
              Save Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Menu Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[140px]">
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  New Item
                </Label>
                <Input
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  placeholder="e.g. Pulao"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addItem.mutate();
                  }}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Category
                </Label>
                <select
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  value={newItem.category}
                  onChange={(e) =>
                    setNewItem({ ...newItem, category: e.target.value })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => addItem.mutate()}
                className="bg-brand text-brand-foreground hover:opacity-90"
              >
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>

            <div className="space-y-3">
              {CATEGORIES.map((cat) => {
                const cItems = menu.filter((m) => m.category === cat);
                if (!cItems.length) return null;
                return (
                  <div key={cat}>
                    <div className="mb-1.5 text-xs font-bold uppercase text-muted-foreground">
                      {cat}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cItems.map((m: MenuItem) => (
                        <span
                          key={m.id}
                          className="group inline-flex items-center gap-1 rounded-full border bg-background pl-3 pr-1 py-1 text-xs font-medium"
                        >
                          {m.name}
                          <button
                            type="button"
                            onClick={() => deleteItem.mutate(m.id)}
                            className="rounded-full p-0.5 text-muted-foreground opacity-60 hover:bg-destructive hover:text-destructive-foreground hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
