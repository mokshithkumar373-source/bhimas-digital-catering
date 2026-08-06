import { buildPDF } from "./pdf-utils";
import { nodeToPng } from "./png-utils";
import { uploadOrderExports } from "./storage-utils";


export class WhatsAppPhoneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppPhoneError";
  }
}

/**
 * Normalize an Indian phone to international format (91XXXXXXXXXX).
 * Accepts inputs like "9876543210", "+91 98765 43210", "091-9876543210".
 * Throws WhatsAppPhoneError when the number is missing or not exactly 10 digits
 * (after stripping an optional leading 91/0 country/trunk prefix).
 */
export function normalizeIndianPhone(phone?: string | null): string {
  if (!phone || !phone.trim()) {
    throw new WhatsAppPhoneError("Customer phone number is missing. Please add it to the order.");
  }
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);

  if (digits.length !== 10) {
    throw new WhatsAppPhoneError("Invalid phone number. Please enter exactly 10 digits.");
  }
  return "91" + digits;
}

function openWhatsApp(cleanPhone: string, text: string) {
  const isMobile = typeof navigator !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  const url = isMobile
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
    : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

async function tryNativeShare(file: File, text: string): Promise<boolean> {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], text, title: "Bhimas Catering Order" });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * WhatsApp share with PDF: validates phone, generates PDF, uses Web Share API
 * when available, otherwise downloads and opens the customer's WhatsApp chat.
 */
export async function whatsappPDF(
  node: HTMLElement,
  filename: string,
  text: string,
  phone?: string,
): Promise<void> {
  const cleanPhone = normalizeIndianPhone(phone);

  const pdf = await buildPDF(node);
  const blob = pdf.output("blob");
  const file = new File([blob], `${filename}.pdf`, { type: "application/pdf" });

  if (await tryNativeShare(file, text)) return;

  pdf.save(filename.endsWith(".pdf") ? filename : filename + ".pdf");
  openWhatsApp(cleanPhone, text);
  const { toast } = await import("sonner");
  toast.info("Your file has been downloaded. Please attach it in WhatsApp and send.", { duration: 6000 });
}

/**
 * WhatsApp share with PNG: validates phone, generates PNG, uses Web Share API
 * when available, otherwise downloads and opens the customer's WhatsApp chat.
 */
export async function whatsappPNG(
  node: HTMLElement,
  filename: string,
  text: string,
  phone?: string,
): Promise<void> {
  const cleanPhone = normalizeIndianPhone(phone);

  const dataUrl = await nodeToPng(node);
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], `${filename}.png`, { type: "image/png" });

  if (await tryNativeShare(file, text)) return;

  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename.endsWith(".png") ? filename : filename + ".png";
  a.click();
  openWhatsApp(cleanPhone, text);
  const { toast } = await import("sonner");
  toast.info("Your file has been downloaded. Please attach it in WhatsApp and send.", { duration: 6000 });
}

/**
 * Native Web Share API integration to share the order as a PDF document.
 */
export async function shareNode(node: HTMLElement, filename: string, text: string): Promise<void> {
  const pdf = await buildPDF(node);
  const blob = pdf.output("blob");
  const file = new File([blob], `${filename}.pdf`, { type: "application/pdf" });

  if (await tryNativeShare(file, text)) return;

  pdf.save(filename.endsWith(".pdf") ? filename : filename + ".pdf");
}

/**
 * Builds the WhatsApp quotation message containing both public file links.
 */
export function buildQuotationMessage(
  customerName: string | null | undefined,
  pdfUrl: string,
  pngUrl: string,
): string {
  return `Hello ${customerName?.trim() || "Customer"},

Thank you for choosing Bhimas Catering.

Your catering quotation is ready.

📄 PDF:
${pdfUrl}

🖼 Image:
${pngUrl}

Regards,
Bhimas Catering`;
}

/**
 * Full sharing workflow: validate phone → generate PDF + PNG → upload to
 * Supabase Storage → open the customer's WhatsApp chat with the message
 * (including both public links) pre-filled.
 */
export async function shareOrderViaWhatsApp(
  node: HTMLElement,
  opts: {
    phone?: string | null;
    customerName?: string | null;
    orderId?: string | null;
    orderNumber?: number | null;
    functionDate?: string | null;
  },
): Promise<{ pdfUrl: string; pngUrl: string }> {
  const cleanPhone = normalizeIndianPhone(opts.phone);

  const { pdfUrl, pngUrl } = await uploadOrderExports(node, {
    orderId: opts.orderId ?? null,
    orderNumber: opts.orderNumber ?? null,
    functionDate: opts.functionDate ?? null,
  });

  openWhatsApp(cleanPhone, buildQuotationMessage(opts.customerName, pdfUrl, pngUrl));
  return { pdfUrl, pngUrl };
}
