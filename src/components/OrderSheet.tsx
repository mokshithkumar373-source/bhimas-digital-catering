import { forwardRef } from "react";
import type { Order, OrderItem, BusinessSettings } from "@/lib/supabase-queries";
import { CATEGORIES } from "@/lib/supabase-queries";
import { calcTotals, formatINR, groupItemsByCategory } from "@/lib/order-utils";

interface Props {
  order: Partial<Order>;
  items: OrderItem[];
  settings: BusinessSettings;
}

// Digital replica of the Bhimas Catering paper order sheet.
export const OrderSheet = forwardRef<HTMLDivElement, Props>(function OrderSheet(
  { order, items, settings },
  ref,
) {
  const totals = calcTotals(order);
  const grouped = groupItemsByCategory(items);

  const renderBox = (title: string, teluguKey: keyof typeof BOX_TITLES) => (
    <div className="os-box flex flex-col" style={{ minHeight: "42mm" }}>
      <div className="os-box-title font-telugu">{BOX_TITLES[teluguKey]}</div>
      <div className="flex-1 p-1">
        {(grouped.get(title) ?? []).map((it) => (
          <div key={(it.id ?? it.name) + it.sort_order} className="os-item">
            • {it.name}
            {it.quantity > 1 ? ` × ${it.quantity}` : ""}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div ref={ref} className="order-sheet">
      <div className="os-frame">
        {/* Header */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="os-title font-telugu flex-1">
              {settings.business_name || "భీమాస్ కేటరింగ్"}
              {settings.tagline ? (
                <span className="ml-2 text-[16pt]">- {settings.tagline}</span>
              ) : null}
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-4 font-telugu">
            <div className="os-phone">ఫోన్ : {settings.phone || "9000074444"}</div>
            <div className="os-label flex items-baseline gap-2">
              ఫంక్షన్ తేది :
              <span className="os-value" style={{ minWidth: "40mm" }}>
                {order.function_date || ""}
              </span>
            </div>
          </div>
        </div>

        {/* Customer block */}
        <div className="mt-3 space-y-1.5 font-telugu">
          <Row label="ఫంక్షన్ వివరము" value={order.function_name} />
          <Row label="పేరు : శ్రీ" value={order.customer_name} />
          <div className="flex items-baseline gap-2">
            <span className="os-label" style={{ minWidth: "22mm" }}>
              అడ్రస్సు :
            </span>
            <span className="os-value">{order.customer_address}</span>
            <span className="os-label">కస్టమర్ ఫోన్ :</span>
            <span className="os-value" style={{ minWidth: "38mm" }}>
              {order.customer_phone}
            </span>
          </div>
        </div>

        {/* Two-column body */}
        <div className="mt-3 grid grid-cols-3 gap-2" style={{ flex: 1 }}>
          <div className="col-span-2 flex flex-col gap-2">
            {/* Order details (Breakfast/Lunch/Dinner tiny boxes) */}
            <div className="os-box">
              <div className="os-box-title font-telugu">ఆర్డర్ వివరములు</div>
              <div className="grid grid-cols-3">
                <SmallBox title="బ్రేక్ ఫాస్ట్ / రాత్రి టిఫిన్">
                  {(grouped.get("Breakfast") ?? [])
                    .map((i) => i.name)
                    .join(", ")}
                </SmallBox>
                <SmallBox title="లంచ్" borderLeft>
                  {(grouped.get("Lunch") ?? [])
                    .map((i) => i.name)
                    .join(", ") || (grouped.get("Rice") ?? []).map(i=>i.name).join(", ")}
                </SmallBox>
                <SmallBox title="డిన్నర్" borderLeft>
                  {(grouped.get("Dinner") ?? [])
                    .map((i) => i.name)
                    .join(", ")}
                </SmallBox>
              </div>
            </div>

            {/* Big two-column boxes */}
            <div className="grid grid-cols-2 gap-2" style={{ flex: 1 }}>
              {renderBox("Sweets", "sweets")}
              {renderBox("Curries", "curries")}
              {renderBox("Rice", "rice")}
              {renderBox("Snacks", "other")}
            </div>
          </div>

          {/* Right rates column */}
          <div className="flex flex-col">
            <div className="os-box flex-1 flex flex-col">
              <div className="os-box-title font-telugu">రేట్ల వివరములు</div>
              <div className="flex-1 flex flex-col justify-between p-1 font-telugu">
                <RateRow label="బ్రేక్ ఫాస్ట్" value={formatRate(order.breakfast_rate)} />
                <RateRow label="లంచ్" value={formatRate(order.lunch_rate)} />
                <RateRow label="డిన్నర్" value={formatRate(order.dinner_rate)} />
                <RateRow label="రాత్రి టిఫిన్" value={formatRate(order.tiffin_rate)} />
                <RateRow label="సర్వర్లు" value={formatRate(order.servers_charge)} />
                <RateRow label="ట్రాన్స్ పోర్టు" value={formatRate(order.transport_charge)} />
                <RateRow label="మొత్తం" value={formatINR(totals.total)} bold />
                <RateRow label="అడ్వాన్సు" value={formatRate(order.advance)} />
                <RateRow label="బేలెన్స్" value={formatINR(totals.balance)} bold />
              </div>
            </div>
            <div className="os-box mt-2 p-2 font-telugu">
              <div className="os-label mb-1">మీరు తీసుకు రావలసినవి :-</div>
              <div className="os-note">
                బఫే ప్లేట్లు, మంచినీరు, గ్లాసులు, బకెట్లు, బేసిన్లు,
                వడ్డించుకునే గరిటెలు
              </div>
            </div>
          </div>
        </div>

        {/* Footer strip */}
        <div className="mt-2 grid grid-cols-4 gap-2 items-center">
          <div className="os-footer-strip col-span-3 font-telugu">
            మేము ఇచ్చేవి :- పేపర్ ప్లేట్లు మరియు పేపర్ రోలు మాత్రమే
          </div>
          <div className="text-[10pt] font-telugu text-right pr-2">
            ఆర్డరు ఇచ్చిన వారి సంతకం
          </div>
        </div>
      </div>
    </div>
  );
});

const BOX_TITLES = {
  sweets: "స్వీట్స్ & హాట్ ఐటమ్స్",
  curries: "కర్రీ ఐటమ్స్",
  rice: "రైస్ ఐటమ్స్",
  other: "ఇతర రుచులు",
};

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="os-label" style={{ minWidth: "34mm" }}>
        {label} :
      </span>
      <span className="os-value">{value || ""}</span>
    </div>
  );
}

function SmallBox({
  title,
  children,
  borderLeft,
}: {
  title: string;
  children?: React.ReactNode;
  borderLeft?: boolean;
}) {
  return (
    <div
      className="font-telugu"
      style={{
        borderLeft: borderLeft ? "1.5px solid #0a7a3f" : undefined,
        minHeight: "22mm",
      }}
    >
      <div
        className="os-box-title"
        style={{ borderBottom: "1.5px solid #0a7a3f", padding: "2px 4px", fontSize: "9pt" }}
      >
        {title}
      </div>
      <div className="p-1 text-[9pt] text-black leading-tight">{children}</div>
    </div>
  );
}

function RateRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="os-rate-row">
      <span style={{ minWidth: "26mm" }}>{label}</span>
      <span className="val" style={bold ? { fontWeight: 800 } : undefined}>
        {value}
      </span>
    </div>
  );
}

function formatRate(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return n > 0 ? formatINR(n) : "";
}

// Ensure Lunch/Dinner categories are handled even though seed uses "Rice" as main lunch pool.
// (Categories listed in seed: Breakfast, Rice, Curries, Sweets, Snacks, Ice Cream, Drinks)
export const _referenced = CATEGORIES;
