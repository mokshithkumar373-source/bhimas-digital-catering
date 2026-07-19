import html2canvas from "html2canvas";
import jsPDF from "jspdf";

let tempEl: HTMLDivElement | null = null;

function convertColorToRgb(colorStr: string, originalGetComputedStyle: typeof window.getComputedStyle): string {
  if (typeof document === "undefined") return colorStr;
  if (!tempEl) {
    tempEl = document.createElement("div");
    tempEl.style.display = "none";
    document.body.appendChild(tempEl);
  }
  tempEl.style.color = colorStr;
  const computed = originalGetComputedStyle(tempEl).color;
  return computed || colorStr;
}

function sanitizeStyleValue(val: string, originalGetComputedStyle: typeof window.getComputedStyle): string {
  if (typeof val !== "string") return val;
  if (!val.includes("oklch") && !val.includes("oklab")) return val;

  return val.replace(/(oklch|oklab)\([^)]+\)/g, (match) => {
    try {
      return convertColorToRgb(match, originalGetComputedStyle);
    } catch (e) {
      console.warn("Failed to convert color value:", match, e);
      return "rgba(0,0,0,0)";
    }
  });
}

export async function nodeToCanvas(node: HTMLElement) {
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn("Failed to wait for fonts to load, proceeding with render:", e);
    }
  }

  // Intercept getComputedStyle to resolve oklch/oklab dynamically using browser engine
  const originalGetComputedStyle = window.getComputedStyle;
  
  window.getComputedStyle = function (el, pseudoElt) {
    const style = originalGetComputedStyle(el, pseudoElt);
    return new Proxy(style, {
      get(target, prop, receiver) {
        if (prop === "getPropertyValue") {
          return function (name: string) {
            const val = target.getPropertyValue(name);
            return sanitizeStyleValue(val, originalGetComputedStyle);
          };
        }
        const val = Reflect.get(target, prop, receiver);
        return typeof val === "string" ? sanitizeStyleValue(val, originalGetComputedStyle) : val;
      }
    });
  };

  try {
    return await html2canvas(node, {
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
  } finally {
    // Restore original window helper and cleanup temp element
    window.getComputedStyle = originalGetComputedStyle;
    if (tempEl) {
      tempEl.remove();
      tempEl = null;
    }
  }
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

// Generate PNG and open in a new tab (Bypass popup blocker)
export async function generatePNG(node: HTMLElement) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocker enabled! Please allow popups for this site.");
    return;
  }
  w.document.write("Loading PNG preview...");
  try {
    const canvas = await nodeToCanvas(node);
    const url = canvas.toDataURL("image/png");
    w.document.body.innerHTML = "";
    w.document.write(`
      <html>
        <head><title>Bhimas Order PNG</title></head>
        <body style="margin:0; background:#f0f0f0; display:flex; justify-content:center; align-items:center; min-height:100vh;">
          <img src="${url}" style="max-width:100%; box-shadow:0 4px 20px rgba(0,0,0,0.15); margin:20px;" />
        </body>
      </html>
    `);
    w.document.close();
  } catch (e) {
    w.close();
    throw e;
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

// Generate PDF and open in a new tab (Bypass popup blocker)
export async function generatePDF(node: HTMLElement) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocker enabled! Please allow popups for this site.");
    return;
  }
  w.document.write("Loading PDF preview...");
  try {
    const pdf = await buildPDF(node);
    const blob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    w.location.href = blobUrl;
  } catch (e) {
    w.close();
    throw e;
  }
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
  let cleanPhone = (phone ?? "").replace(/\D/g, "");
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }
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
  
  let cleanPhone = (phone ?? "").replace(/\D/g, "");
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }
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
