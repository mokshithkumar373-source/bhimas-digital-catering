import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function nodeToCanvas(node: HTMLElement) {
  return await html2canvas(node, {
    scale: 3,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });
}

export async function downloadPNG(node: HTMLElement, filename: string) {
  const canvas = await nodeToCanvas(node);
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".png") ? filename : filename + ".png";
  a.click();
}

export async function downloadPDF(node: HTMLElement, filename: string) {
  const canvas = await nodeToCanvas(node);
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  if (imgH <= pageH) {
    pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
  } else {
    // Scale to fit height
    const scaledW = (canvas.width * pageH) / canvas.height;
    pdf.addImage(imgData, "PNG", (pageW - scaledW) / 2, 0, scaledW, pageH);
  }
  pdf.save(filename.endsWith(".pdf") ? filename : filename + ".pdf");
  return pdf;
}

export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png");
  });
}

export async function shareOrPngWhatsApp(
  node: HTMLElement,
  text: string,
  phone?: string,
) {
  const canvas = await nodeToCanvas(node);
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], "order.png", { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share!({ files: [file], text });
      return;
    } catch {
      /* fallthrough */
    }
  }
  // Fallback: open WhatsApp with text and trigger PNG download
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = "order.png";
  a.click();
  const cleanPhone = (phone ?? "").replace(/\D/g, "");
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(waUrl, "_blank");
}

export function printNode(node: HTMLElement) {
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) return;
  const styles = Array.from(document.querySelectorAll("style, link[rel=stylesheet]"))
    .map((n) => n.outerHTML)
    .join("\n");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8">${styles}</head><body>${node.outerHTML}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`);
  w.document.close();
}
