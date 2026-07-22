import { useMemo, useRef, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { OrderSheet } from "@/components/OrderSheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchMenuItems, fetchSettings, type Order, type OrderItem } from "@/lib/supabase-queries";
import { formatINR } from "@/lib/order-utils";
import { translateItem, translateChecklistItem } from "@/lib/translations";
import {
  downloadPDF,
  downloadPNG,
  generatePDF,
  generatePNG,
  printNode,
  whatsappPDF,
  whatsappPNG,
  shareNode,
} from "@/lib/export-utils";
import {
  Save,
  Eye,
  FileDown,
  ImageIcon,
  Printer,
  Share2,
  MessageCircle,
  Copy,
  Trash,
  Info,
  Languages,
} from "lucide-react";

type OrderDraft = Partial<Order>;

export interface OrderEditorProps {
  initialOrder?: OrderDraft;
  initialItems?: OrderItem[];
  orderId?: string;
}

const STATUSES = ["Pending", "Preparing", "Ready", "Delivered", "Completed", "Cancelled"];

export function OrderEditor({ initialOrder, initialItems, orderId }: OrderEditorProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lang, setLang] = useState<"te" | "en">("te"); // Telugu as default language

  const { data: menu = [] } = useQuery({
    queryKey: ["menu"],
    queryFn: fetchMenuItems,
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  // Handoff logic for duplicating or loading offline drafts
  const [order, setOrder] = useState<OrderDraft>(() => {
    return (
      initialOrder ?? {
        status: "Pending",
        guest_count: 0,
        plate_rate: 0,
        advance: 0,
        function_date: typeof window !== "undefined" ? new Date().toISOString().slice(0, 10) : "",
        order_details: {},
      }
    );
  });

  const [items, setItems] = useState<OrderItem[]>(() => {
    return initialItems ?? [];
  });

  // Client-side initialization after mount (SSR Safety)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const localStorageKey = `bhimas_order_draft_${orderId || "new"}`;
    const draft = localStorage.getItem(localStorageKey);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.order) setOrder(parsed.order);
        if (parsed.items) setItems(parsed.items);
        toast.info("Restored unsaved local draft");
        return;
      } catch (e) {
        // ignore
      }
    }

    if (!orderId) {
      const dup = sessionStorage.getItem("bhimas_duplicate_draft");
      if (dup) {
        sessionStorage.removeItem("bhimas_duplicate_draft");
        try {
          const parsed = JSON.parse(dup);
          if (parsed.order) setOrder(parsed.order);
          if (parsed.items) setItems(parsed.items);
        } catch (e) {
          // ignore
        }
      }
    }
  }, [orderId]);

  // Synchronize item names and checklist when active language switches
  useEffect(() => {
    setItems((prevItems) =>
      prevItems.map((it) => {
        if (!it.name) return it;
        const translated = translateItem(it.name, lang);
        return { ...it, name: translated };
      }),
    );

    setOrder((prevOrder) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const details = (prevOrder.order_details as Record<string, any>) || {};
      if (details.items_to_bring) {
        const translatedToBring = details.items_to_bring
          .split(",")
          .map((it: string) => translateChecklistItem(it.trim(), lang))
          .join(", ");
        return {
          ...prevOrder,
          order_details: {
            ...details,
            items_to_bring: translatedToBring,
          },
        };
      }
      return prevOrder;
    });
  }, [lang]);

  const orderDetails = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => (order.order_details as Record<string, any>) || {},
    [order.order_details],
  );

  // Instant pricing calculations matching Bhimas Catering printed formula (GST/Discount completely deleted)
  const totals = useMemo(() => {
    const guestCount = Number(order.guest_count ?? 0);
    const breakfastMembers = Number(orderDetails.breakfast_members ?? guestCount);
    const lunchMembers = Number(orderDetails.lunch_members ?? guestCount);
    const dinnerMembers = Number(orderDetails.dinner_members ?? guestCount);
    const tiffinMembers = Number(orderDetails.tiffin_members ?? 0);

    const breakfastTotal = breakfastMembers * Number(order.breakfast_rate ?? 0);
    const lunchTotal = lunchMembers * Number(order.lunch_rate ?? 0);
    const dinnerTotal = dinnerMembers * Number(order.dinner_rate ?? 0);
    const tiffinTotal = tiffinMembers * Number(order.tiffin_rate ?? 0);

    const serversQty = Number(orderDetails.servers_qty ?? 0);
    const serversRate = Number(order.servers_charge ?? 0);
    const serversTotal = serversQty * serversRate;

    const transportTotal = Number(order.transport_charge ?? 0);
    const grandTotal =
      breakfastTotal + lunchTotal + dinnerTotal + tiffinTotal + serversTotal + transportTotal;

    const advance = Number(order.advance ?? 0);
    const balance = grandTotal - advance;

    return { total: grandTotal, balance };
  }, [order, orderDetails]);

  // Set page dirty when fields or items change
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch = (key: keyof Order, value: any) => {
    setOrder((o) => ({ ...o, [key]: value }));
    setIsDirty(true);
  };

  const handleUpdateItems = (newItems: OrderItem[]) => {
    setItems(newItems);
    setIsDirty(true);
  };

  // Autosave Draft every 30 seconds (Offline local storage caching)
  useEffect(() => {
    if (!isDirty) return;
    const interval = setInterval(() => {
      const localStorageKey = `bhimas_order_draft_${orderId || "new"}`;
      localStorage.setItem(
        localStorageKey,
        JSON.stringify({ order, items: items.filter((i) => i.name.trim() !== "") }),
      );
      setIsDirty(false);
      toast.success("Draft autosaved offline", { duration: 1500 });
    }, 30000);

    return () => clearInterval(interval);
  }, [order, items, isDirty, orderId]);

  // Save mutation to Supabase (GST/Discount set to 0 to preserve schema integrity)
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
        gst: 0,
        discount: 0,
        total: totals.total,
        advance: Number(order.advance ?? 0),
        balance: totals.balance,
        remarks: order.remarks ?? null,
        status: order.status ?? "Pending",
        order_details: orderDetails,
      };

      // Upsert customer
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

      // Filter active items (remove empty rows)
      const activeItems = items.filter((it) => it.name.trim() !== "");
      if (activeItems.length > 0 && savedId) {
        const rows = activeItems.map((it, idx) => ({
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

      // Clear local storage draft upon successful save
      localStorage.removeItem(`bhimas_order_draft_${orderId || "new"}`);
      setIsDirty(false);

      return savedId!;
    },
    onSuccess: (id) => {
      toast.success("Order saved successfully");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", id] });
      if (!orderId) {
        navigate({ to: "/orders/$id", params: { id } });
      }
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
      localStorage.removeItem(`bhimas_order_draft_${orderId}`);
      toast.success("Order deleted");
      qc.invalidateQueries({ queryKey: ["orders"] });
      navigate({ to: "/orders" });
    },
  });

  // Padded Order Number for Filename: Bhimas_Order_####.pdf
  const formattedOrderNum = order.order_number
    ? String(order.order_number).padStart(4, "0")
    : "Draft";
  const pdfFilename = `Bhimas_Order_${formattedOrderNum}`;

  const doPDFGenerate = async () => {
    if (!sheetRef.current) {
      toast.error("Error: Order sheet HTML element not found");
      return;
    }
    const tId = toast.loading("Generating PDF...");
    try {
      await generatePDF(sheetRef.current);
      toast.success("PDF opened in new window", { id: tId });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || String(e), { id: tId });
    }
  };

  const doPDFDownload = async () => {
    if (!sheetRef.current) {
      toast.error("Error: Order sheet HTML element not found");
      return;
    }
    const tId = toast.loading("Downloading PDF...");
    try {
      await downloadPDF(sheetRef.current, pdfFilename);
      toast.success("PDF downloaded successfully", { id: tId });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || String(e), { id: tId });
    }
  };

  const doPNGGenerate = async () => {
    if (!sheetRef.current) {
      toast.error("Error: Order sheet HTML element not found");
      return;
    }
    const tId = toast.loading("Generating PNG...");
    try {
      await generatePNG(sheetRef.current);
      toast.success("PNG opened in new window", { id: tId });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || String(e), { id: tId });
    }
  };

  const doPNGDownload = async () => {
    if (!sheetRef.current) {
      toast.error("Error: Order sheet HTML element not found");
      return;
    }
    const tId = toast.loading("Downloading PNG...");
    try {
      await downloadPNG(sheetRef.current, pdfFilename);
      toast.success("PNG downloaded successfully", { id: tId });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || String(e), { id: tId });
    }
  };

  const doPrint = async () => {
    if (!sheetRef.current) {
      toast.error("Error: Order sheet HTML element not found");
      return;
    }
    try {
      printNode(sheetRef.current);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || String(e));
    }
  };

  const getWhatsAppText = () => {
    return `Bhimas Catering — Order details:\nOrder No: #${order.order_number || "Draft"}\nCustomer: ${order.customer_name || ""}\nFunction: ${order.function_name || ""}\nDate: ${order.function_date || ""}\nTotal Amount: ${formatINR(totals.total)}\nAdvance paid: ${formatINR(order.advance || 0)}\nBalance: ${formatINR(totals.balance)}`;
  };

  const doWhatsAppPDF = async () => {
    if (!sheetRef.current) {
      toast.error("Error: Order sheet HTML element not found");
      return;
    }
    const tId = toast.loading("Preparing PDF for WhatsApp...");
    try {
      await whatsappPDF(
        sheetRef.current,
        pdfFilename,
        getWhatsAppText(),
        order.customer_phone ?? undefined,
      );
      toast.success("WhatsApp shared link opened", { id: tId });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || String(e), { id: tId });
    }
  };

  const doWhatsAppPNG = async () => {
    if (!sheetRef.current) {
      toast.error("Error: Order sheet HTML element not found");
      return;
    }
    const tId = toast.loading("Preparing PNG for WhatsApp...");
    try {
      await whatsappPNG(
        sheetRef.current,
        pdfFilename,
        getWhatsAppText(),
        order.customer_phone ?? undefined,
      );
      toast.success("WhatsApp shared link opened", { id: tId });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || String(e), { id: tId });
    }
  };

  const doShare = async () => {
    if (!sheetRef.current) {
      toast.error("Error: Order sheet HTML element not found");
      return;
    }
    const tId = toast.loading("Opening native sharing sheet...");
    try {
      await shareNode(sheetRef.current, pdfFilename, getWhatsAppText());
      toast.success("Sharing opened", { id: tId });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || String(e), { id: tId });
    }
  };

  const doDuplicate = () => {
    const duplicateDraft = {
      order: {
        ...order,
        id: undefined,
        order_number: undefined,
        customer_name: order.customer_name ? `${order.customer_name} (Copy)` : "Copy",
      },
      items: items
        .filter((it) => it.name.trim() !== "")
        .map((it) => ({ ...it, id: undefined, order_id: undefined })),
    };
    sessionStorage.setItem("bhimas_duplicate_draft", JSON.stringify(duplicateDraft));
    toast.success("Duplicated to a new unsaved draft");
    navigate({ to: "/orders/new" });
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
      {/* Top Fixed Toolbar */}
      <div className="sticky top-0 z-30 -mx-4 mb-5 flex flex-wrap items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8 no-print shadow-sm">
        <div className="mr-auto">
          <h1 className="text-sm font-bold md:text-base flex items-center gap-1.5 text-green-800">
            <span>{orderId ? `Order #${order.order_number || ""}` : "New Order Form"}</span>
            <span className="text-xs font-semibold text-slate-500">
              Total {formatINR(totals.total)} · Balance {formatINR(totals.balance)}
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {/* Language Switch Switcher */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLang(lang === "te" ? "en" : "te")}
            className="font-bold border-green-600 text-green-800 bg-green-50/50 hover:bg-green-50 px-3"
          >
            <Languages className="h-4 w-4 mr-1 text-green-600 animate-none" />{" "}
            {lang === "te" ? "తెలుగు" : "English"}
          </Button>

          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-brand text-brand-foreground hover:opacity-90 font-bold px-3"
          >
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`${isPreviewMode ? "bg-green-50 border-green-600 text-green-800" : ""} font-bold px-3`}
          >
            <Eye className="h-4 w-4 mr-1" /> {isPreviewMode ? "Edit Mode" : "Preview Mode"}
          </Button>

          <Button size="sm" variant="outline" onClick={doPDFGenerate} className="font-bold px-2.5">
            <FileDown className="h-4 w-4 mr-1 text-green-700" /> Generate PDF
          </Button>

          <Button size="sm" variant="outline" onClick={doPDFDownload} className="font-bold px-2.5">
            <FileDown className="h-4 w-4 mr-1 text-green-700" /> Download PDF
          </Button>

          <Button size="sm" variant="outline" onClick={doPNGGenerate} className="font-bold px-2.5">
            <ImageIcon className="h-4 w-4 mr-1 text-green-700" /> Generate PNG
          </Button>

          <Button size="sm" variant="outline" onClick={doPNGDownload} className="font-bold px-2.5">
            <ImageIcon className="h-4 w-4 mr-1 text-green-700" /> Download PNG
          </Button>

          <Button size="sm" variant="outline" onClick={doPrint} className="font-bold px-2.5">
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={doWhatsAppPDF}
            className="font-bold px-2.5 text-green-800 border-green-200"
          >
            <MessageCircle className="h-4 w-4 mr-1 text-green-600" /> WhatsApp PDF
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={doWhatsAppPNG}
            className="font-bold px-2.5 text-green-800 border-green-200"
          >
            <MessageCircle className="h-4 w-4 mr-1 text-green-600" /> WhatsApp PNG
          </Button>

          <Button size="sm" variant="outline" onClick={doShare} className="font-bold px-2.5">
            <Share2 className="h-4 w-4 mr-1" /> Share
          </Button>

          <Button size="sm" variant="outline" onClick={doDuplicate} className="font-bold px-2.5">
            <Copy className="h-4 w-4 mr-1" /> Duplicate
          </Button>

          {orderId && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm("Delete this order?")) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="font-bold px-2.5"
            >
              <Trash className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Admin Metadata Section (Screen Only) */}
      <div className="no-print bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-[11px] shadow-sm">
        <div className="font-bold text-slate-700 mb-3 flex items-center justify-between border-b pb-1.5">
          <span className="flex items-center gap-1.5 text-slate-700">
            <Info className="h-4 w-4 text-green-600" />
            Admin Data Section (Screen Only - Will NOT print on PDF)
          </span>
          {isDirty && (
            <span className="text-amber-600 font-bold animate-pulse">
              You have unsaved changes (autosaving every 30s)
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {/* Function Date */}
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">
              Function Date
            </label>
            <input
              type="date"
              value={order.function_date || ""}
              onChange={(e) => patch("function_date", e.target.value)}
              className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none focus:border-green-600 text-[#000] font-semibold"
            />
          </div>
          {/* Order Number */}
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">
              Order Number
            </label>
            <input
              type="text"
              readOnly
              value={order.order_number ? `#${order.order_number}` : "Draft (Auto)"}
              className="w-full bg-slate-100 border border-slate-200 rounded p-1.5 outline-none text-slate-500 font-bold"
            />
          </div>
          {/* Order Status */}
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">
              Order Status
            </label>
            <select
              value={order.status || "Pending"}
              onChange={(e) => patch("status", e.target.value)}
              className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none focus:border-green-600 text-[#000] font-bold h-[31px]"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {/* Customer Phone */}
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">
              Customer Phone
            </label>
            <input
              type="text"
              value={order.customer_phone || ""}
              onChange={(e) => patch("customer_phone", e.target.value)}
              placeholder="Phone number"
              className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none focus:border-green-600 text-[#000] font-semibold"
            />
          </div>
          {/* Total Plates (Guest Count) */}
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">
              Guest Count
            </label>
            <input
              type="number"
              value={order.guest_count || 0}
              onChange={(e) => patch("guest_count", Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none focus:border-green-600 text-[#000] font-bold"
            />
          </div>
          {/* Rate Per Plate */}
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">
              Plate Rate
            </label>
            <input
              type="number"
              value={order.plate_rate || 0}
              onChange={(e) => patch("plate_rate", Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none focus:border-green-600 text-[#000] font-bold"
            />
          </div>
          {/* Created By */}
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">
              Created By
            </label>
            <input
              type="text"
              value={orderDetails.created_by || ""}
              onChange={(e) =>
                patch("order_details", { ...orderDetails, created_by: e.target.value })
              }
              placeholder="Staff operator"
              className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none focus:border-green-600 text-[#000] font-semibold"
            />
          </div>
          {/* Internal Notes */}
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">
              Internal Notes
            </label>
            <input
              type="text"
              value={orderDetails.internal_notes || ""}
              onChange={(e) =>
                patch("order_details", { ...orderDetails, internal_notes: e.target.value })
              }
              placeholder="Private instructions"
              className="w-full bg-white border border-slate-300 rounded p-1.5 outline-none focus:border-green-600 text-[#000] font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Center Layout for A4 Paper Viewport */}
      <div className="w-full overflow-x-auto pb-8 flex justify-center bg-slate-100 p-2 md:p-6 rounded-2xl border">
        <div className="shadow-2xl bg-white border rounded">
          <OrderSheet
            ref={sheetRef}
            order={order}
            items={items}
            settings={settings}
            menu={menu}
            isPreviewMode={isPreviewMode}
            lang={lang}
            onChangeOrder={patch}
            onChangeItems={handleUpdateItems}
          />
        </div>
      </div>
    </AppLayout>
  );
}
