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

// Download PNG file directly
export async function downloadPNG(node: HTMLElement, filename: string) {
  const canvas = await nodeToCanvas(node);
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".png") ? filename : filename + ".png";
  a.click();
}

// Generate PNG and open in a new tab
export async function generatePNG(node: HTMLElement) {
  const canvas = await nodeToCanvas(node);
  const url = canvas.toDataURL("image/png");
  const w = window.open();
  if (w) {
    w.document.write(`
      <html>
        <head><title>Bhimas Order PNG</title></head>
        <body style="margin:0; background:#f0f0f0; display:flex; justify-content:center; align-items:center; min-height:100vh;">
          <img src="${url}" style="max-width:100%; box-shadow:0 4px 20px rgba(0,0,0,0.15); margin:20px;" />
        </body>
      </html>
    `);
    w.document.close();
  }
}

// Internal helper to build jsPDF object
async function buildPDF(node: HTMLElement) {
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
  return pdf;
}

// Download PDF file directly
export async function downloadPDF(node: HTMLElement, filename: string) {
  const pdf = await buildPDF(node);
  pdf.save(filename.endsWith(".pdf") ? filename : filename + ".pdf");
  return pdf;
}

// Generate PDF and open in a new tab
export async function generatePDF(node: HTMLElement) {
  const pdf = await buildPDF(node);
  const blobUrl = pdf.output("bloburl");
  window.open(blobUrl, "_blank");
}

export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png");
  });
}

// WhatsApp PDF Share or download fallback
export async function whatsappPDF(
  node: HTMLElement,
  filename: string,
  text: string,
  phone?: string,
) {
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
    } catch {
      /* fallthrough */
    }
  }

  // Fallback: download PDF and open WhatsApp web
  pdf.save(filename.endsWith(".pdf") ? filename : filename + ".pdf");
  const cleanPhone = (phone ?? "").replace(/\D/g, "");
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text + "\n\n(PDF downloaded - please attach from your device)")}`
    : `https://wa.me/?text=${encodeURIComponent(text + "\n\n(PDF downloaded - please attach from your device)")}`;
  window.open(waUrl, "_blank");
}

// WhatsApp PNG Share or download fallback
export async function whatsappPNG(
  node: HTMLElement,
  filename: string,
  text: string,
  phone?: string,
) {
  const canvas = await nodeToCanvas(node);
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], `${filename}.png`, { type: "image/png" });
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

  // Fallback: download PNG and open WhatsApp
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".png") ? filename : filename + ".png";
  a.click();
  const cleanPhone = (phone ?? "").replace(/\D/g, "");
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text + "\n\n(PNG downloaded - please attach from your device)")}`
    : `https://wa.me/?text=${encodeURIComponent(text + "\n\n(PNG downloaded - please attach from your device)")}`;
  window.open(waUrl, "_blank");
}

// General native share (shares PDF and PNG if supported)
export async function shareNode(node: HTMLElement, filename: string, text: string) {
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
    } catch {
      /* fallthrough */
    }
  }

  // Fallback: just open basic text sharing or download PDF
  pdf.save(filename.endsWith(".pdf") ? filename : filename + ".pdf");
  if (nav.share) {
    try {
      await nav.share({
        title: "Bhimas Catering Order",
        text: text,
      });
    } catch {
      /* ignore */
    }
  }
}

// Printer support
export function printNode(node: HTMLElement) {
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) return;
  const styles = Array.from(document.querySelectorAll("style, link[rel=stylesheet]"))
    .map((n) => n.outerHTML)
    .join("\n");
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8">${styles}</head><body class="print-area">${node.outerHTML}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`,
  );
  w.document.close();
}
