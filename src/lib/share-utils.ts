import { buildPDF } from "./pdf-utils";
import { nodeToPng } from "./png-utils";

/**
 * WhatsApp share with PDF document (downloads PDF and opens WhatsApp/WhatsApp Web fallback).
 */
export async function whatsappPDF(
  node: HTMLElement,
  filename: string,
  text: string,
  phone?: string,
): Promise<void> {
  const pdf = await buildPDF(node);
  const blob = pdf.output("blob");
  const file = new File([blob], `${filename}.pdf`, { type: "application/pdf" });

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share!({ files: [file], text });
      return;
    } catch (e) {
      // Fall through to manual download and web URL
    }
  }

  // Fallback: download PDF and open WhatsApp web
  pdf.save(filename.endsWith(".pdf") ? filename : filename + ".pdf");
  let cleanPhone = (phone ?? "").replace(/\D/g, "");
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text + "\n\n(PDF downloaded - please attach from your device)")}`
    : `https://wa.me/?text=${encodeURIComponent(text + "\n\n(PDF downloaded - please attach from your device)")}`;
  window.open(waUrl, "_blank");
}

/**
 * WhatsApp share with PNG image (downloads PNG and opens WhatsApp/WhatsApp Web fallback).
 */
export async function whatsappPNG(
  node: HTMLElement,
  filename: string,
  text: string,
  phone?: string,
): Promise<void> {
  const dataUrl = await nodeToPng(node);
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], `${filename}.png`, { type: "image/png" });

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share!({ files: [file], text });
      return;
    } catch (e) {
      // Fall through to manual download and web URL
    }
  }

  // Fallback: download PNG and open WhatsApp
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename.endsWith(".png") ? filename : filename + ".png";
  a.click();
  
  let cleanPhone = (phone ?? "").replace(/\D/g, "");
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text + "\n\n(PNG downloaded - please attach from your device)")}`
    : `https://wa.me/?text=${encodeURIComponent(text + "\n\n(PNG downloaded - please attach from your device)")}`;
  window.open(waUrl, "_blank");
}

/**
 * Native Web Share API integration to share the order as a PDF document.
 */
export async function shareNode(node: HTMLElement, filename: string, text: string): Promise<void> {
  const pdf = await buildPDF(node);
  const blob = pdf.output("blob");
  const file = new File([blob], `${filename}.pdf`, { type: "application/pdf" });

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share!({
        files: [file],
        title: "Bhimas Catering Order",
        text: text,
      });
      return;
    } catch (e) {
      // Fall through to standard sharing fallback
    }
  }

  // Fallback: save PDF and attempt basic text share
  pdf.save(filename.endsWith(".pdf") ? filename : filename + ".pdf");
  if (nav.share) {
    try {
      await nav.share({
        title: "Bhimas Catering Order",
        text: text,
      });
    } catch (e) {
      // Ignore
    }
  }
}
