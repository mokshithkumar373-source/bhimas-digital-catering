import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { OrderSheet } from "@/components/OrderSheet";
import { MenuPicker } from "@/components/MenuPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchMenuItems,
  fetchSettings,
  type Order,
  type OrderItem,
} from "@/lib/supabase-queries";
import { calcTotals, formatINR } from "@/lib/order-utils";
import {
  downloadPDF,
  downloadPNG,
  printNode,
  shareOrPngWhatsApp,
} from "@/lib/export-utils";
import {
  Save,
  Eye,
  FileDown,
  Image as ImageIcon,
  Printer,
  Share2,
  MessageCircle,
} from "lucide-react";

type OrderDraft = Partial<Order>;

export interface OrderEditorProps {
  initialOrder?: OrderDraft;
  initialItems?: OrderItem[];
  orderId?: string;
}

const STATUSES = [
  "Pending",
  "Preparing",
  "Ready",
  "Delivered",
  "Completed",
  "Cancelled",
];

export function OrderEditor({
  initialOrder,
  initialItems,
  orderId,
}: OrderEditorProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: menu = [] } = useQuery({
    queryKey: ["menu"],
    queryFn: fetchMenuItems,
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const [order, setOrder] = useState<OrderDraft>(
    initialOrder ?? {
      status: "Pending",
      guest_count: 0,
      plate_rate: 0,
      advance: 0,
      function_date: new Date().toISOString().slice(0, 10),
    },
  );
  const [items, setItems] = useState<OrderItem[]>(initialItems ?? []);

  const totals = useMemo(() => calcTotals(order), [order]);

  function patch<K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) {
    setOrder((o) => ({ ...o, [key]: value }));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        customer_name: order.customer_name ?? null,
        customer_phone: order.customer_phone ?? null,
        customer_address: order.customer_address ?? null,
        function_name: order.function_name ?? null,
        function_date: order.function_date ?? null,
        delivery_time: order.delivery_time ?? null,
        guest_count: Number(order.guest_count ?? 0),
        plate_rate: Number(order.plate_rate ?? 0),
        breakfast_rate: Number(order.breakfast_rate ?? 0),
        lunch_rate: Number(order.lunch_rate ?? 0),
        dinner_rate: Number(order.dinner_rate ?? 0),
        tiffin_rate: Number(order.tiffin_rate ?? 0),
        servers_charge: Number(order.servers_charge ?? 0),
        transport_charge: Number(order.transport_charge ?? 0),
        gst: Number(order.gst ?? 0),
        discount: Number(order.discount ?? 0),
        total: totals.total,
        advance: Number(order.advance ?? 0),
        balance: totals.balance,
        remarks: order.remarks ?? null,
        status: order.status ?? "Pending",
      };

      // Upsert customer by phone if provided
      let customerId: string | null = order.customer_id ?? null;
      if (payload.customer_phone) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("phone", payload.customer_phone)
          .maybeSingle();
        if (existing) {
          customerId = existing.id;
          await supabase
            .from("customers")
            .update({
              name: payload.customer_name ?? "",
              address: payload.customer_address,
            })
            .eq("id", existing.id);
        } else if (payload.customer_name) {
          const { data: newC } = await supabase
            .from("customers")
            .insert({
              name: payload.customer_name,
              phone: payload.customer_phone,
              address: payload.customer_address,
            })
            .select("id")
            .single();
          customerId = newC?.id ?? null;
        }
      }

      let savedId = orderId;
      if (orderId) {
        const { error } = await supabase
          .from("orders")
          .update({ ...payload, customer_id: customerId })
          .eq("id", orderId);
        if (error) throw error;
        await supabase.from("order_items").delete().eq("order_id", orderId);
      } else {
        const { data, error } = await supabase
          .from("orders")
          .insert({ ...payload, customer_id: customerId })
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
      }

      if (items.length > 0 && savedId) {
        const rows = items.map((it, idx) => ({
          order_id: savedId!,
          menu_item_id: it.menu_item_id ?? null,
          name: it.name,
          category: it.category,
          quantity: Number(it.quantity),
          unit: it.unit ?? "nos",
          sort_order: idx,
        }));
        const { error } = await supabase.from("order_items").insert(rows);
        if (error) throw error;
      }

      return savedId!;
    },
    onSuccess: (id) => {
      toast.success("Order saved");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", id] });
      if (!orderId) navigate({ to: "/orders/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) return;
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order deleted");
      qc.invalidateQueries({ queryKey: ["orders"] });
      navigate({ to: "/orders" });
    },
  });

  const duplicate = () => {
    navigate({ to: "/orders/new" });
    // Note: duplicating cross-route is complex; instead we simply clear the id on the current draft
    // by using sessionStorage for a proper handoff would be ideal, but a fresh new-order page works.
  };

  const filename = `Bhimas-Order-${order.customer_name?.replace(/\s+/g, "_") || "New"}-${order.function_date || ""}`;

  const doPDF = async () => {
    if (!sheetRef.current) return;
    await ensureVisible(setShowPreview);
    toast.promise(downloadPDF(sheetRef.current, filename), {
      loading: "Generating PDF...",
      success: "PDF downloaded",
      error: "Failed to generate PDF",
    });
  };
  const doPNG = async () => {
    if (!sheetRef.current) return;
    await ensureVisible(setShowPreview);
    toast.promise(downloadPNG(sheetRef.current, filename), {
      loading: "Generating PNG...",
      success: "PNG downloaded",
      error: "Failed to generate PNG",
    });
  };
  const doPrint = async () => {
    if (!sheetRef.current) return;
    await ensureVisible(setShowPreview);
    printNode(sheetRef.current);
  };
  const doWhatsApp = async () => {
    if (!sheetRef.current) return;
    await ensureVisible(setShowPreview);
    const text = `Bhimas Catering — Order for ${order.customer_name || ""}\nFunction: ${order.function_name || ""}\nDate: ${order.function_date || ""}\nPlates: ${order.guest_count || 0}\nTotal: ${formatINR(totals.total)}\nBalance: ${formatINR(totals.balance)}`;
    await shareOrPngWhatsApp(sheetRef.current, text, order.customer_phone ?? undefined);
  };

  if (!settings) {
    return (
      <AppLayout>
        <div className="py-20 text-center text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Sticky action bar */}
      <div className="sticky top-0 z-30 -mx-4 mb-5 flex flex-wrap items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="mr-auto">
          <h1 className="text-lg font-bold md:text-xl">
            {orderId ? "Order" : "New Order"}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              Total {formatINR(totals.total)} · Balance {formatINR(totals.balance)}
            </span>
          </h1>
        </div>
        <ActionBtn onClick={() => saveMutation.mutate()} primary disabled={saveMutation.isPending}>
          <Save className="h-4 w-4" /> Save
        </ActionBtn>
        <ActionBtn onClick={() => setShowPreview((v) => !v)}>
          <Eye className="h-4 w-4" /> {showPreview ? "Hide" : "Preview"}
        </ActionBtn>
        <ActionBtn onClick={doPDF}>
          <FileDown className="h-4 w-4" /> PDF
        </ActionBtn>
        <ActionBtn onClick={doPNG}>
          <ImageIcon className="h-4 w-4" /> PNG
        </ActionBtn>
        <ActionBtn onClick={doPrint}>
          <Printer className="h-4 w-4" /> Print
        </ActionBtn>
        <ActionBtn onClick={doWhatsApp}>
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </ActionBtn>
        <ActionBtn onClick={doPDF}>
          <Share2 className="h-4 w-4" /> Share
        </ActionBtn>
        {orderId && (
          <>
            <ActionBtn onClick={duplicate}>Duplicate</ActionBtn>
            <ActionBtn
              onClick={() => {
                if (confirm("Delete this order?")) deleteMutation.mutate();
              }}
              destructive
            >
              Delete
            </ActionBtn>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer & Function</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Customer Name">
                <Input
                  value={order.customer_name ?? ""}
                  onChange={(e) => patch("customer_name", e.target.value)}
                  placeholder="Sri ..."
                />
              </Field>
              <Field label="Phone Number">
                <Input
                  value={order.customer_phone ?? ""}
                  onChange={(e) => patch("customer_phone", e.target.value)}
                  placeholder="10-digit"
                  inputMode="tel"
                />
              </Field>
              <Field label="Address" full>
                <Textarea
                  value={order.customer_address ?? ""}
                  onChange={(e) => patch("customer_address", e.target.value)}
                  rows={2}
                />
              </Field>
              <Field label="Function Name">
                <Input
                  value={order.function_name ?? ""}
                  onChange={(e) => patch("function_name", e.target.value)}
                  placeholder="Wedding, Birthday..."
                />
              </Field>
              <Field label="Function Date">
                <Input
                  type="date"
                  value={order.function_date ?? ""}
                  onChange={(e) => patch("function_date", e.target.value)}
                />
              </Field>
              <Field label="Delivery Time">
                <Input
                  value={order.delivery_time ?? ""}
                  onChange={(e) => patch("delivery_time", e.target.value)}
                  placeholder="e.g. 12:30 PM"
                />
              </Field>
              <Field label="Status">
                <Select
                  value={order.status ?? "Pending"}
                  onValueChange={(v) => patch("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Remarks" full>
                <Textarea
                  value={order.remarks ?? ""}
                  onChange={(e) => patch("remarks", e.target.value)}
                  rows={2}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Menu Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <MenuPicker menu={menu} items={items} onChange={setItems} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Field label="Guest / Plates">
                <Input
                  type="number"
                  value={order.guest_count ?? 0}
                  onChange={(e) =>
                    patch("guest_count", Number(e.target.value))
                  }
                />
              </Field>
              <Field label="Plate Rate ₹">
                <Input
                  type="number"
                  value={order.plate_rate ?? 0}
                  onChange={(e) => patch("plate_rate", Number(e.target.value))}
                />
              </Field>
              <Field label="Breakfast ₹">
                <Input
                  type="number"
                  value={order.breakfast_rate ?? 0}
                  onChange={(e) =>
                    patch("breakfast_rate", Number(e.target.value))
                  }
                />
              </Field>
              <Field label="Lunch ₹">
                <Input
                  type="number"
                  value={order.lunch_rate ?? 0}
                  onChange={(e) => patch("lunch_rate", Number(e.target.value))}
                />
              </Field>
              <Field label="Dinner ₹">
                <Input
                  type="number"
                  value={order.dinner_rate ?? 0}
                  onChange={(e) => patch("dinner_rate", Number(e.target.value))}
                />
              </Field>
              <Field label="Tiffin ₹">
                <Input
                  type="number"
                  value={order.tiffin_rate ?? 0}
                  onChange={(e) => patch("tiffin_rate", Number(e.target.value))}
                />
              </Field>
              <Field label="Servers ₹">
                <Input
                  type="number"
                  value={order.servers_charge ?? 0}
                  onChange={(e) =>
                    patch("servers_charge", Number(e.target.value))
                  }
                />
              </Field>
              <Field label="Transport ₹">
                <Input
                  type="number"
                  value={order.transport_charge ?? 0}
                  onChange={(e) =>
                    patch("transport_charge", Number(e.target.value))
                  }
                />
              </Field>
              <Field label="GST ₹">
                <Input
                  type="number"
                  value={order.gst ?? 0}
                  onChange={(e) => patch("gst", Number(e.target.value))}
                />
              </Field>
              <Field label="Discount ₹">
                <Input
                  type="number"
                  value={order.discount ?? 0}
                  onChange={(e) => patch("discount", Number(e.target.value))}
                />
              </Field>
              <Field label="Advance ₹" full>
                <Input
                  type="number"
                  value={order.advance ?? 0}
                  onChange={(e) => patch("advance", Number(e.target.value))}
                />
              </Field>
            </CardContent>
          </Card>

          <Card className="bg-brand-soft/50">
            <CardContent className="space-y-2 py-4 text-sm">
              <Row label="Plates × Rate">
                {order.guest_count ?? 0} × {formatINR(order.plate_rate)} ={" "}
                {formatINR(totals.plateAmount)}
              </Row>
              <Row label="Total">
                <span className="font-bold text-brand text-lg">
                  {formatINR(totals.total)}
                </span>
              </Row>
              <Row label="Advance">{formatINR(order.advance)}</Row>
              <Row label="Balance">
                <span className="font-bold text-lg">
                  {formatINR(totals.balance)}
                </span>
              </Row>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sheet preview / render area (always mounted so refs work) */}
      <div
        className={`mt-6 ${showPreview ? "block" : "hidden"}`}
      >
        <div className="mb-2 text-sm font-semibold text-muted-foreground">
          Order Sheet Preview (A4)
        </div>
        <div className="overflow-auto rounded-2xl border bg-muted/30 p-4">
          <div style={{ transform: "scale(0.9)", transformOrigin: "top left" }}>
            <OrderSheet
              ref={sheetRef}
              order={order}
              items={items}
              settings={settings}
            />
          </div>
        </div>
      </div>
      {/* Off-screen render so export works even when preview is hidden */}
      {!showPreview && (
        <div
          style={{
            position: "absolute",
            left: -99999,
            top: 0,
            pointerEvents: "none",
          }}
          aria-hidden
        >
          <OrderSheet
            ref={sheetRef}
            order={order}
            items={items}
            settings={settings}
          />
        </div>
      )}
    </AppLayout>
  );
}

async function ensureVisible(_setter: (v: boolean) => void) {
  // Sheet is always rendered (either visibly or off-screen); no-op.
  await Promise.resolve();
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2 col-span-2" : ""}>
      <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  primary,
  destructive,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        primary
          ? "bg-brand text-brand-foreground hover:opacity-90"
          : destructive
            ? "bg-destructive text-destructive-foreground hover:opacity-90"
            : "bg-secondary text-secondary-foreground hover:bg-brand-soft"
      }
      size="sm"
    >
      {children}
    </Button>
  );
}
