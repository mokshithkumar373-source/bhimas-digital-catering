import { forwardRef, useState, useMemo, useEffect } from "react";
import type { Order, OrderItem, MenuItem, BusinessSettings } from "@/lib/supabase-queries";
import { X } from "lucide-react";
import { formatINR } from "@/lib/order-utils";
import { translateItem } from "@/lib/translations";

interface Props {
  order: Partial<Order>;
  items: OrderItem[];
  settings: BusinessSettings;
  menu: MenuItem[];
  isPreviewMode: boolean;
  lang: "te" | "en";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChangeOrder: (key: keyof Order, value: any) => void;
  onChangeItems: (items: OrderItem[]) => void;
}

const AUTOCOMPLETE_SUGGESTIONS: Record<string, string[]> = {
  Sweets: ["Rasgulla", "Kesari", "Badusha", "Laddu", "Double Ka Meetha"],
  Curries: ["Paneer Curry", "Brinjal Curry", "Dal Fry", "Sambar", "Rasam"],
  Rice: ["Meals", "Veg Biryani", "Pulihora", "Jeera Rice", "Chapati", "Rice"],
  Snacks: [
    "Idly",
    "Vada",
    "Puri",
    "Dosa",
    "Pongal",
    "Upma",
    "Poori Curry",
    "Punugulu",
    "Mirchi Bajji",
    "Pakodi",
    "Cutlet",
    "Vanilla",
    "Chocolate",
    "Strawberry",
    "Tea",
    "Coffee",
    "Cool Drinks",
    "Water Bottle",
  ],
};

const TRANSLATIONS = {
  te: {
    phone: "ఫోన్ :",
    function_date: "ఫంక్షన్ తేదీ :",
    function_details: "ఫంక్షన్ వివరాలు :",
    name: "పేరు : శ్రీ",
    address: "చిరునామా :",
    customer_phone: "కస్టమర్ ఫోన్ :",
    breakfast: "అల్పాహారం",
    lunch: "మధ్యాహ్న భోజనం",
    dinner: "రాత్రి భోజనం",
    members: "సభ్యులు:",
    sweets: "స్వీట్లు & హాట్ ఐటమ్స్",
    curries: "కూర ఐటమ్స్",
    rice: "రైస్ ఐటమ్స్",
    other: "ఇతర ఐటమ్స్",
    customer_signature: "కస్టమర్ సంతకం",
    admin_signature: "అడ్మిన్ సంతకం",
    we_provide: "మేము అందిస్తాము : పేపర్ ప్లేట్లు & పేపర్ రోల్స్",
    rate_details: "ధర వివరాలు",
    breakfast_rate: "అల్పాహారం",
    lunch_rate: "మధ్యాహ్న భోజనం",
    dinner_rate: "రాత్రి భోజనం",
    tiffin_rate: "రాత్రి టిఫిన్లు",
    servers: "సర్వర్లు",
    transport: "ట్రాన్స్పోర్ట్",
    total: "మొత్తం",
    advance: "అడ్వాన్స్",
    balance: "బ్యాలెన్స్",
    you_must_bring: "మీరు తీసుకురావాల్సినవి :",
  },
  en: {
    phone: "Phone :",
    function_date: "Function Date :",
    function_details: "Function Details :",
    name: "Name : Sri",
    address: "Address :",
    customer_phone: "Customer Phone :",
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    members: "Members:",
    sweets: "Sweets & Hot Items",
    curries: "Curry Items",
    rice: "Rice Items",
    other: "Other Items",
    customer_signature: "Customer Signature",
    admin_signature: "Admin Signature",
    we_provide: "We Provide : Paper Plates & Paper Rolls",
    rate_details: "Rate Details",
    breakfast_rate: "Breakfast",
    lunch_rate: "Lunch",
    dinner_rate: "Dinner",
    tiffin_rate: "Night Tiffins",
    servers: "Servers",
    transport: "Transport",
    total: "Total",
    advance: "Advance",
    balance: "Balance",
    you_must_bring: "You Must Bring :",
  },
};

function AutocompleteInput({
  value,
  onChange,
  placeholder,
  menuItems,
  category,
  isPreviewMode,
  lang,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  menuItems: MenuItem[];
  category: string;
  isPreviewMode: boolean;
  lang: "te" | "en";
}) {
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    const builtIn = AUTOCOMPLETE_SUGGESTIONS[category] || [];
    const dbItems = menuItems
      .filter((m) => {
        const cat = m.category.toLowerCase();
        if (category === "Sweets") return cat.includes("sweet");
        if (category === "Curries") return cat.includes("curry") || cat.includes("curries");
        if (category === "Rice") return cat.includes("rice") || cat.includes("lunch") || cat.includes("dinner");
        if (category === "Snacks") {
          return cat.includes("snack") || cat.includes("breakfast") || cat.includes("drink") || cat.includes("ice cream");
        }
        return false;
      })
      .map((m) => m.name);

    const merged = Array.from(new Set([...builtIn, ...dbItems]));
    const translated = merged.map((name) => translateItem(name, lang));

    if (!value) return translated.slice(0, 8);

    return translated
      .filter((name) => {
        const teName = translateItem(name, "te").toLowerCase();
        const enName = translateItem(name, "en").toLowerCase();
        const q = value.toLowerCase();
        return teName.includes(q) || enName.includes(q);
      })
      .slice(0, 8);
  }, [menuItems, category, value, lang]);

  if (isPreviewMode) {
    return (
      <span className="font-semibold block text-[#000] text-[17px] h-[34px] leading-[34px] overflow-hidden whitespace-nowrap">
        {value || ""}
      </span>
    );
  }

  return (
    <div className="os-autocomplete-wrapper w-full h-[34px]">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 200);
        }}
        placeholder={placeholder}
        className="w-full bg-transparent border-none outline-none font-semibold text-[#000] text-[17px] h-[34px] leading-[34px] p-0"
      />
      {isOpen && filtered.length > 0 && (
        <div className="os-autocomplete-dropdown">
          {filtered.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onMouseDown={() => {
                onChange(item);
                setIsOpen(false);
              }}
              className="os-autocomplete-item"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ItemListBoxProps {
  title: string;
  categoryKey: string;
  items: OrderItem[];
  menu: MenuItem[];
  isPreviewMode: boolean;
  lang: "te" | "en";
  onUpdateItemName: (categoryKey: string, indexInCat: number, newName: string) => void;
  onRemoveItemRow: (categoryKey: string, indexInCat: number) => void;
}

function ItemListBox({
  title,
  categoryKey,
  items,
  menu,
  isPreviewMode,
  lang,
  onUpdateItemName,
  onRemoveItemRow,
}: ItemListBoxProps) {
  const categoryItems = useMemo(() => {
    const rawItems = items.filter((it) => it.category === categoryKey);
    const padded = [...rawItems];
    if (padded.length < 7) {
      const needed = 7 - padded.length;
      for (let i = 0; i < needed; i++) {
        padded.push({
          name: "",
          category: categoryKey,
          quantity: 1,
          sort_order: rawItems.length + i,
        });
      }
    } else if (padded.length > 7) {
      padded.splice(7);
    }
    return padded;
  }, [items, categoryKey]);

  return (
    <div 
      className="border-[1.5px] border-[#0a7a3f] flex flex-col bg-white overflow-hidden" 
      style={{ height: "274px" }}
    >
      <div 
        className="font-telugu text-center font-bold border-b-[1.5px] border-[#0a7a3f] bg-green-50/10 text-[20px]"
        style={{ height: "36px", lineHeight: "36px" }}
      >
        {title}
      </div>
      <div className="flex-1 flex flex-col">
        {categoryItems.map((item, idx) => (
          <div
            key={`${categoryKey}-${idx}`}
            className="flex items-center px-2 border-b border-[#0a7a3f]/40 last:border-b-0 relative"
            style={{ height: "34px", lineHeight: "34px" }}
          >
            <span 
              className="text-[#0a7a3f] font-bold mr-1.5 text-[17px]"
              style={{ minWidth: "18px", height: "34px", lineHeight: "34px" }}
            >
              {idx + 1}.
            </span>
            <AutocompleteInput
              value={item.name}
              onChange={(val) => onUpdateItemName(categoryKey, idx, val)}
              placeholder=""
              menuItems={menu}
              category={categoryKey}
              isPreviewMode={isPreviewMode}
              lang={lang}
            />
            {!isPreviewMode && item.name && (
              <button
                type="button"
                className="text-destructive hover:scale-110 absolute right-2 top-[8px]"
                onClick={() => onRemoveItemRow(categoryKey, idx)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface RateDetailsCardProps {
  order: Partial<Order>;
  lang: "te" | "en";
  onChangeOrder: (key: keyof Order, value: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handlePatchDetails: (key: string, val: any) => void;
  isPreviewMode: boolean;
  breakfastMembers: number;
  lunchMembers: number;
  dinnerMembers: number;
  tiffinMembers: number;
  breakfastRate: number;
  lunchRate: number;
  dinnerRate: number;
  tiffinRate: number;
  serversQty: number;
  serversRate: number;
  breakfastTotal: number;
  lunchTotal: number;
  dinnerTotal: number;
  tiffinTotal: number;
  serversTotal: number;
  transportTotal: number;
  grandTotal: number;
  advance: number;
  balance: number;
}

function RateDetailsCard({
  order,
  lang,
  onChangeOrder,
  handlePatchDetails,
  isPreviewMode,
  breakfastMembers,
  lunchMembers,
  dinnerMembers,
  tiffinMembers,
  breakfastRate,
  lunchRate,
  dinnerRate,
  tiffinRate,
  serversQty,
  serversRate,
  breakfastTotal,
  lunchTotal,
  dinnerTotal,
  tiffinTotal,
  serversTotal,
  transportTotal,
  grandTotal,
  advance,
  balance,
}: RateDetailsCardProps) {
  const t = TRANSLATIONS[lang || "te"];

  const renderRateRow = (
    label: string,
    calcNode: React.ReactNode,
    totalAmount: number,
    isLast = false
  ) => {
    return (
      <div className="py-1">
        {/* Row 1: Category Name only */}
        <div className="text-[18px] font-bold text-[#0a7a3f] leading-tight">
          {label}
        </div>
        {/* Row 2: Calculation (Left) and Final Amount (Right) */}
        <div className="grid grid-cols-[1fr_auto] items-baseline mt-0.5">
          <div className="text-[17px] text-[#0a7a3f] font-semibold flex items-center gap-1">
            {calcNode}
          </div>
          <div className="text-[22px] font-bold text-[#000]">
            {formatINR(totalAmount)}
          </div>
        </div>
        {!isLast && <hr className="border-t border-dashed border-[#0a7a3f]/40 my-1" />}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div 
        className="font-telugu text-center font-bold border-b-[1.5px] border-[#0a7a3f] bg-green-50/20 text-[20px]"
        style={{ height: "36px", lineHeight: "36px" }}
      >
        {t.rate_details}
      </div>

      <div className="flex-1 p-2 space-y-0.5 overflow-visible">
        {/* Breakfast */}
        {renderRateRow(
          t.breakfast_rate,
          !isPreviewMode ? (
            <span className="flex items-center">
              ₹
              <input
                type="number"
                value={breakfastRate || ""}
                onChange={(e) => onChangeOrder("breakfast_rate", Number(e.target.value))}
                className="w-14 border-b border-green-600/60 text-center font-bold text-[#000] bg-transparent text-[17px] outline-none h-6 p-0"
                placeholder="0"
              />
              × {breakfastMembers}
            </span>
          ) : (
            <span>₹{breakfastRate} × {breakfastMembers}</span>
          ),
          breakfastTotal
        )}

        {/* Lunch */}
        {renderRateRow(
          t.lunch_rate,
          !isPreviewMode ? (
            <span className="flex items-center">
              ₹
              <input
                type="number"
                value={lunchRate || ""}
                onChange={(e) => onChangeOrder("lunch_rate", Number(e.target.value))}
                className="w-14 border-b border-green-600/60 text-center font-bold text-[#000] bg-transparent text-[17px] outline-none h-6 p-0"
                placeholder="0"
              />
              × {lunchMembers}
            </span>
          ) : (
            <span>₹{lunchRate} × {lunchMembers}</span>
          ),
          lunchTotal
        )}

        {/* Dinner */}
        {renderRateRow(
          t.dinner_rate,
          !isPreviewMode ? (
            <span className="flex items-center">
              ₹
              <input
                type="number"
                value={dinnerRate || ""}
                onChange={(e) => onChangeOrder("dinner_rate", Number(e.target.value))}
                className="w-14 border-b border-green-600/60 text-center font-bold text-[#000] bg-transparent text-[17px] outline-none h-6 p-0"
                placeholder="0"
              />
              × {dinnerMembers}
            </span>
          ) : (
            <span>₹{dinnerRate} × {dinnerMembers}</span>
          ),
          dinnerTotal
        )}

        {/* Night Tiffins */}
        {renderRateRow(
          t.tiffin_rate,
          !isPreviewMode ? (
            <span className="flex items-center gap-0.5">
              ₹
              <input
                type="number"
                value={tiffinRate || ""}
                onChange={(e) => onChangeOrder("tiffin_rate", Number(e.target.value))}
                className="w-12 border-b border-green-600/60 text-center font-bold text-[#000] bg-transparent text-[17px] outline-none h-6 p-0"
                placeholder="0"
              />
              ×
              <input
                type="number"
                value={tiffinMembers || ""}
                onChange={(e) => handlePatchDetails("tiffin_members", Number(e.target.value))}
                className="w-10 border-b border-green-600/60 text-center font-bold text-[#000] bg-transparent text-[17px] outline-none h-6 p-0"
                placeholder="0"
              />
            </span>
          ) : (
            <span>₹{tiffinRate} × {tiffinMembers}</span>
          ),
          tiffinTotal
        )}

        {/* Servers */}
        {renderRateRow(
          t.servers,
          !isPreviewMode ? (
            <span className="flex items-center gap-0.5">
              <input
                type="number"
                value={serversQty || ""}
                onChange={(e) => handlePatchDetails("servers_qty", Number(e.target.value))}
                className="w-10 border-b border-green-600/60 text-center font-bold text-[#000] bg-transparent text-[17px] outline-none h-6 p-0"
                placeholder="0"
              />
              × ₹
              <input
                type="number"
                value={serversRate || ""}
                onChange={(e) => onChangeOrder("servers_charge", Number(e.target.value))}
                className="w-12 border-b border-green-600/60 text-center font-bold text-[#000] bg-transparent text-[17px] outline-none h-6 p-0"
                placeholder="0"
              />
            </span>
          ) : (
            <span>{serversQty} × ₹{serversRate}</span>
          ),
          serversTotal
        )}

        {/* Transport */}
        {renderRateRow(
          t.transport,
          !isPreviewMode ? (
            <span className="flex items-center">
              ₹
              <input
                type="number"
                value={order.transport_charge || ""}
                onChange={(e) => onChangeOrder("transport_charge", Number(e.target.value))}
                className="w-14 border-b border-green-600/60 text-center font-bold text-[#000] bg-transparent text-[17px] outline-none h-6 p-0"
                placeholder="0"
              />
            </span>
          ) : (
            <span>₹{transportTotal}</span>
          ),
          transportTotal,
          true
        )}
      </div>

      {/* Totals Block - Separated Visually */}
      <div className="border-t-[1.5px] border-[#0a7a3f] mt-auto">
        {/* Total */}
        <div className="border-b-[1.5px] border-[#0a7a3f] p-2 bg-[#e6f3eb]/20 flex justify-between items-center h-[38px]">
          <span className="text-[18px] font-bold text-[#0a7a3f]">{t.total}</span>
          <span className="text-[22px] font-bold text-[#0a522c]">{formatINR(grandTotal)}</span>
        </div>
        {/* Advance */}
        <div className="border-b-[1.5px] border-[#0a7a3f] p-2 flex justify-between items-center h-[38px]">
          <span className="text-[18px] font-bold text-[#0a7a3f]">{t.advance}</span>
          {isPreviewMode ? (
            <span className="text-[22px] font-bold text-[#000]">{formatINR(advance)}</span>
          ) : (
            <span className="flex items-center gap-0.5">
              <span className="text-[18px] font-bold text-[#0a7a3f]">₹</span>
              <input
                type="number"
                value={order.advance || ""}
                onChange={(e) => onChangeOrder("advance", Number(e.target.value))}
                className="w-20 border-b border-green-600/60 text-center font-bold text-[#000] bg-transparent text-[18px] outline-none h-7 p-0"
                placeholder="0"
              />
            </span>
          )}
        </div>
        {/* Balance */}
        <div className="p-2 bg-red-50/10 flex justify-between items-center h-[38px]">
          <span className="text-[18px] font-bold text-[#0a7a3f]">{t.balance}</span>
          <span className="text-[22px] font-bold text-[#c53030]">{formatINR(balance)}</span>
        </div>
      </div>
    </div>
  );
}

export const OrderSheet = forwardRef<HTMLDivElement, Props>(function OrderSheet(
  { order, items, settings, menu, isPreviewMode, lang, onChangeOrder, onChangeItems },
  ref,
) {
  const t = TRANSLATIONS[lang || "te"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderDetails = (order.order_details as Record<string, any>) || {};

  const guestCount = Number(order.guest_count ?? 0);
  const breakfastMembers = Number(orderDetails.breakfast_members ?? guestCount);
  const lunchMembers = Number(orderDetails.lunch_members ?? guestCount);
  const dinnerMembers = Number(orderDetails.dinner_members ?? guestCount);
  const tiffinMembers = Number(orderDetails.tiffin_members ?? 0);

  const breakfastRate = Number(order.breakfast_rate ?? 0);
  const lunchRate = Number(order.lunch_rate ?? 0);
  const dinnerRate = Number(order.dinner_rate ?? 0);
  const tiffinRate = Number(order.tiffin_rate ?? 0);

  const serversQty = Number(orderDetails.servers_qty ?? 0);
  const serversRate = Number(order.servers_charge ?? 0);

  const breakfastTotal = breakfastMembers * breakfastRate;
  const lunchTotal = lunchMembers * lunchRate;
  const dinnerTotal = dinnerMembers * dinnerRate;
  const tiffinTotal = tiffinMembers * tiffinRate;
  const serversTotal = serversQty * serversRate;
  const transportTotal = Number(order.transport_charge ?? 0);

  const grandTotal =
    breakfastTotal + lunchTotal + dinnerTotal + tiffinTotal + serversTotal + transportTotal;

  const advance = Number(order.advance ?? 0);
  const balance = grandTotal - advance;

  // Sync calculations back to parent state if total changes
  if (order.total !== grandTotal || order.balance !== balance) {
    setTimeout(() => {
      onChangeOrder("total", grandTotal);
      onChangeOrder("balance", balance);
    }, 0);
  }

  // Format YYYY-MM-DD to DD / MM / YYYY
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d} / ${m} / ${y}`;
  };

  const [dateInputVal, setDateInputVal] = useState(() => formatDate(order.function_date));

  useEffect(() => {
    setDateInputVal(formatDate(order.function_date));
  }, [order.function_date]);

  const handleDateInputChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    let formatted = "";
    if (digits.length > 0) {
      formatted += digits.substring(0, 2);
    }
    if (digits.length > 2) {
      formatted += " / " + digits.substring(2, 4);
    }
    if (digits.length > 4) {
      formatted += " / " + digits.substring(4, 8);
    }
    
    setDateInputVal(formatted);

    if (digits.length === 8) {
      const d = digits.substring(0, 2);
      const m = digits.substring(2, 4);
      const y = digits.substring(4, 8);
      onChangeOrder("function_date", `${y}-${m}-${d}`);
    } else if (digits.length === 0) {
      onChangeOrder("function_date", "");
    }
  };

  const handleUpdateItemName = (categoryKey: string, indexInCat: number, newName: string) => {
    const catItems = items.filter((it) => it.category === categoryKey);
    const updated = [...items];

    const catIndices: number[] = [];
    items.forEach((it, idx) => {
      if (it.category === categoryKey) {
        catIndices.push(idx);
      }
    });

    if (catIndices[indexInCat] !== undefined) {
      updated[catIndices[indexInCat]] = {
        ...updated[catIndices[indexInCat]],
        name: newName,
      };
      onChangeItems(updated);
    } else {
      const needed = indexInCat - catItems.length + 1;
      const newItems = [...items];
      for (let i = 0; i < needed; i++) {
        newItems.push({
          name: i === needed - 1 ? newName : "",
          category: categoryKey,
          quantity: 1,
          sort_order: catItems.length + i,
        });
      }
      onChangeItems(newItems);
    }
  };

  const handleRemoveItemRow = (categoryKey: string, indexInCat: number) => {
    const updated = [...items];
    const catIndices: number[] = [];
    items.forEach((it, idx) => {
      if (it.category === categoryKey) {
        catIndices.push(idx);
      }
    });

    if (catIndices[indexInCat] !== undefined) {
      updated[catIndices[indexInCat]] = {
        ...updated[catIndices[indexInCat]],
        name: "",
      };
      onChangeItems(updated);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePatchDetails = (key: string, val: any) => {
    onChangeOrder("order_details", {
      ...orderDetails,
      [key]: val,
    });
  };

  const defaultChecklist = lang === "te"
    ? "బఫే ప్లేట్లు, తాగునీరు, గ్లాసులు, బకెట్లు, బేసిన్లు, వడ్డించే గరిటెలు"
    : "Buffet plates, Drinking water, Glasses, Buckets, Basins, Serving ladles";

  return (
    <div ref={ref} className={`order-sheet ${isPreviewMode ? "is-preview" : ""}`}>
      <div className="os-frame">
        {/* Header Block */}
        <div className="flex justify-between items-start pb-1 border-b-2 border-[#0a7a3f]">
          <div>
            <div className="os-title font-telugu">
              {lang === "te" ? "భీమాస్ కేటరింగ్" : settings.business_name || "Bhimas Catering"} -{" "}
              {lang === "te" ? "తణుకు" : settings.tagline || "Tanuku"}
            </div>
            <div className="os-phone font-bold text-[#0a7a3f]">
              {t.phone} {settings.phone || "90000 74444"}
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-telugu text-[#0a7a3f] font-bold mt-1">
            <span className="os-label">{t.function_date}</span>
            <div className="os-date-box relative">
              {isPreviewMode ? (
                <span className="text-[#000] font-bold">
                  {dateInputVal || "DD / MM / YYYY"}
                </span>
              ) : (
                <input
                  type="text"
                  value={dateInputVal}
                  onChange={(e) => handleDateInputChange(e.target.value)}
                  placeholder="DD / MM / YYYY"
                  className="w-full bg-transparent border-none text-[#000] font-bold text-center outline-none text-[15px]"
                />
              )}
            </div>
          </div>
        </div>

        {/* Metadata Details lines */}
        <div className="mt-1 space-y-1 font-telugu text-[#0a7a3f]">
          <div className="flex items-baseline gap-2">
            <span className="os-label">{t.function_details}</span>
            {isPreviewMode ? (
              <span className="os-value">{order.function_name || ""}</span>
            ) : (
              <input
                type="text"
                value={order.function_name || ""}
                onChange={(e) => onChangeOrder("function_name", e.target.value)}
                className="os-paper-input"
                placeholder=""
              />
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="os-label">{t.name}</span>
            {isPreviewMode ? (
              <span className="os-value">{order.customer_name || ""}</span>
            ) : (
              <input
                type="text"
                value={order.customer_name || ""}
                onChange={(e) => onChangeOrder("customer_name", e.target.value)}
                className="os-paper-input"
                placeholder=""
              />
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="os-label">{t.address}</span>
            {isPreviewMode ? (
              <span className="os-value">{order.customer_address || ""}</span>
            ) : (
              <input
                type="text"
                value={order.customer_address || ""}
                onChange={(e) => onChangeOrder("customer_address", e.target.value)}
                className="os-paper-input"
                placeholder=""
              />
            )}

            <span className="os-label ml-4">{t.customer_phone}</span>
            {isPreviewMode ? (
              <span className="os-value" style={{ minWidth: "40mm" }}>
                {order.customer_phone || ""}
              </span>
            ) : (
              <input
                type="text"
                value={order.customer_phone || ""}
                onChange={(e) => onChangeOrder("customer_phone", e.target.value)}
                className="os-paper-input font-bold"
                style={{ width: "40mm" }}
                placeholder=""
              />
            )}
          </div>
        </div>

        {/* Master columns Grid: 65% / 35% */}
        <div className="mt-2 flex border-t-2 border-l-2 border-r-2 border-b-2 border-[#0a7a3f] os-columns-container flex-1 min-h-0">
          {/* Left Column (65%) */}
          <div className="os-left-column flex flex-col border-r-2 border-[#0a7a3f] h-full min-h-0">
            {/* Top Row Summary Boxes */}
            <div className="flex w-full border-b-2 border-[#0a7a3f]">
              {/* Breakfast Summary Box */}
              <div className="flex-1 flex flex-col border-r-2 border-[#0a7a3f] py-1 justify-center items-center">
                <span className="os-summary-title font-telugu">{t.breakfast}</span>
                <div className="flex items-center gap-1 mt-0.5 font-telugu">
                  <span className="os-summary-label">{t.members}</span>
                  {isPreviewMode ? (
                    <span className="font-bold text-[#000] text-[16px]">{breakfastMembers}</span>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        value={breakfastMembers}
                        onChange={(e) =>
                          handlePatchDetails("breakfast_members", Number(e.target.value))
                        }
                        className="w-10 text-center border-b border-green-600 outline-none text-[#000] font-bold bg-transparent text-[16px]"
                      />
                      <button
                        type="button"
                        className="os-plus-btn-small"
                        onClick={() => handlePatchDetails("breakfast_members", breakfastMembers + 10)}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Lunch Summary Box */}
              <div className="flex-1 flex flex-col border-r-2 border-[#0a7a3f] py-1 justify-center items-center">
                <span className="os-summary-title font-telugu">{t.lunch}</span>
                <div className="flex items-center gap-1 mt-0.5 font-telugu">
                  <span className="os-summary-label">{t.members}</span>
                  {isPreviewMode ? (
                    <span className="font-bold text-[#000] text-[16px]">{lunchMembers}</span>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        value={lunchMembers}
                        onChange={(e) =>
                          handlePatchDetails("lunch_members", Number(e.target.value))
                        }
                        className="w-10 text-center border-b border-green-600 outline-none text-[#000] font-bold bg-transparent text-[16px]"
                      />
                      <button
                        type="button"
                        className="os-plus-btn-small"
                        onClick={() => handlePatchDetails("lunch_members", lunchMembers + 10)}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Dinner Summary Box */}
              <div className="flex-1 flex flex-col py-1 justify-center items-center">
                <span className="os-summary-title font-telugu">{t.dinner}</span>
                <div className="flex items-center gap-1 mt-0.5 font-telugu">
                  <span className="os-summary-label">{t.members}</span>
                  {isPreviewMode ? (
                    <span className="font-bold text-[#000] text-[16px]">{dinnerMembers}</span>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        value={dinnerMembers}
                        onChange={(e) =>
                          handlePatchDetails("dinner_members", Number(e.target.value))
                        }
                        className="w-10 text-center border-b border-green-600 outline-none text-[#000] font-bold bg-transparent text-[16px]"
                      />
                      <button
                        type="button"
                        className="os-plus-btn-small"
                        onClick={() => handlePatchDetails("dinner_members", dinnerMembers + 10)}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Sweets & Hot Items and Curry Items */}
            <div className="flex w-full border-b-2 border-[#0a7a3f] flex-1 min-h-0">
              <div className="border-r-2 border-[#0a7a3f] flex flex-col flex-1 min-h-0" style={{ width: "50%" }}>
                <ItemListBox
                  title={t.sweets}
                  categoryKey="Sweets"
                  items={items}
                  menu={menu}
                  isPreviewMode={isPreviewMode}
                  lang={lang}
                  onUpdateItemName={handleUpdateItemName}
                  onRemoveItemRow={handleRemoveItemRow}
                />
              </div>
              <div className="flex flex-col flex-1 min-h-0" style={{ width: "50%" }}>
                <ItemListBox
                  title={t.curries}
                  categoryKey="Curries"
                  items={items}
                  menu={menu}
                  isPreviewMode={isPreviewMode}
                  lang={lang}
                  onUpdateItemName={handleUpdateItemName}
                  onRemoveItemRow={handleRemoveItemRow}
                />
              </div>
            </div>

            {/* Row 3: Rice Items and Other Items */}
            <div className="flex w-full border-b-2 border-[#0a7a3f] flex-1 min-h-0">
              <div className="border-r-2 border-[#0a7a3f] flex flex-col flex-1 min-h-0" style={{ width: "50%" }}>
                <ItemListBox
                  title={t.rice}
                  categoryKey="Rice"
                  items={items}
                  menu={menu}
                  isPreviewMode={isPreviewMode}
                  lang={lang}
                  onUpdateItemName={handleUpdateItemName}
                  onRemoveItemRow={handleRemoveItemRow}
                />
              </div>
              <div className="flex flex-col flex-1 min-h-0" style={{ width: "50%" }}>
                <ItemListBox
                  title={t.other}
                  categoryKey="Snacks"
                  items={items}
                  menu={menu}
                  isPreviewMode={isPreviewMode}
                  lang={lang}
                  onUpdateItemName={handleUpdateItemName}
                  onRemoveItemRow={handleRemoveItemRow}
                />
              </div>
            </div>

            {/* Signatures Row */}
            <div className="flex w-full py-1.5 bg-slate-50/10" style={{ minHeight: "14mm" }}>
              <div className="w-1/2 text-center font-telugu flex flex-col justify-end">
                <div className="mx-auto w-32 border-b border-dashed border-green-600 mb-0.5"></div>
                <span className="os-signature-label">{t.customer_signature}</span>
              </div>
              <div className="w-1/2 text-center font-telugu flex flex-col justify-end">
                <div className="mx-auto w-32 border-b border-dashed border-green-600 mb-0.5"></div>
                <span className="os-signature-label">{t.admin_signature}</span>
              </div>
            </div>
          </div>

          {/* Right Column (35%) - Rate Details & Checklist */}
          <div className="os-right-column flex flex-col h-full min-h-0">
            {/* Rate Details Panel */}
            <div className="flex-grow flex flex-col border-b-2 border-[#0a7a3f] min-h-0 flex-1">
              <RateDetailsCard
                order={order}
                lang={lang}
                onChangeOrder={onChangeOrder}
                handlePatchDetails={handlePatchDetails}
                isPreviewMode={isPreviewMode}
                breakfastMembers={breakfastMembers}
                lunchMembers={lunchMembers}
                dinnerMembers={dinnerMembers}
                tiffinMembers={tiffinMembers}
                breakfastRate={breakfastRate}
                lunchRate={lunchRate}
                dinnerRate={dinnerRate}
                tiffinRate={tiffinRate}
                serversQty={serversQty}
                serversRate={serversRate}
                breakfastTotal={breakfastTotal}
                lunchTotal={lunchTotal}
                dinnerTotal={dinnerTotal}
                tiffinTotal={tiffinTotal}
                serversTotal={serversTotal}
                transportTotal={transportTotal}
                grandTotal={grandTotal}
                advance={advance}
                balance={balance}
              />
            </div>

            {/* Checklist: You Must Bring */}
            <div className="os-checklist-container" style={{ minHeight: "35mm" }}>
              <div className="os-checklist-title font-telugu">
                {t.you_must_bring}
              </div>

              {isPreviewMode ? (
                <ul className="list-disc pl-4 space-y-0.5 text-[16px] text-black font-bold">
                  {(orderDetails.items_to_bring || defaultChecklist)
                    .split(",")
                    .map((item: string, idx: number) => (
                      <li key={idx} className="capitalize os-checklist-item">
                        {item.trim()}
                      </li>
                    ))}
                </ul>
              ) : (
                <textarea
                  value={orderDetails.items_to_bring || defaultChecklist}
                  onChange={(e) => handlePatchDetails("items_to_bring", e.target.value)}
                  className="os-paper-input font-bold text-[16px] bg-transparent resize-none border-none focus:outline-none"
                  rows={3}
                  style={{ lineHeight: "1.4" }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer banner sits close to the bottom */}
        <div className="mt-1 os-footer-strip font-telugu">{t.we_provide}</div>
      </div>
    </div>
  );
});
