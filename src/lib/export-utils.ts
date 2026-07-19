import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const CSS_VARIABLES_MAP: Record<string, string> = {
  "--background": "#ffffff",
  "--foreground": "#000000",
  "--primary": "#0a7a3f",
  "--primary-foreground": "#ffffff",
  "--secondary": "#edf2ef",
  "--secondary-foreground": "#0e5c32",
  "--muted": "#f1f4f2",
  "--muted-foreground": "#73827c",
  "--accent": "#e5f0e9",
  "--accent-foreground": "#0e5c32",
  "--destructive": "#e53e3e",
  "--destructive-foreground": "#ffffff",
  "--border": "#0a7a3f",
  "--input": "#e1e7e3",
  "--ring": "#0a7a3f",
  "--brand": "#0a7a3f",
  "--brand-foreground": "#ffffff",
  "--brand-soft": "#eef7f2",
  "--sheet-border": "#0a7a3f",
};

let tempColorEl: HTMLDivElement | null = null;

function convertColorToRgb(colorStr: string): string {
  if (typeof document === "undefined") return colorStr;
  if (!tempColorEl) {
    tempColorEl = document.createElement("div");
    tempColorEl.style.display = "none";
    document.body.appendChild(tempColorEl);
  }
  tempColorEl.style.color = colorStr;
  const computed = window.getComputedStyle(tempColorEl).color;
  return computed || colorStr;
}

function sanitizeStyleValue(val: string): string {
  if (typeof val !== "string") return val;
  if (!val.includes("oklch") && !val.includes("oklab")) return val;

  return val.replace(/(oklch|oklab)\([^)]+\)/g, (match) => {
    try {
      return convertColorToRgb(match);
    } catch (e) {
      console.warn("Failed to convert color value:", match, e);
      return "rgba(0,0,0,0)";
    }
  });
}

function cloneAndSanitizeDOM(liveNode: HTMLElement): HTMLElement {
  const clone = liveNode.cloneNode(true) as HTMLElement;

  // Step 3: Set resolved CSS variables directly on the clone's root style
  Object.keys(CSS_VARIABLES_MAP).forEach((key) => {
    clone.style.setProperty(key, CSS_VARIABLES_MAP[key]);
  });

  const liveElements = [liveNode, ...Array.from(liveNode.getElementsByTagName("*"))];
  const cloneElements = [clone, ...Array.from(clone.getElementsByTagName("*"))];

  // Specific style properties to resolve and copy as inline styles
  const propertiesToCopy = [
    "color",
    "background-color",
    "background-image",
    "border-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width",
    "border-style",
    "box-shadow",
    "text-shadow",
    "fill",
    "stroke",
    "outline-color"
  ];

  for (let i = 0; i < liveElements.length; i++) {
    const liveEl = liveElements[i] as HTMLElement;
    const cloneEl = cloneElements[i] as HTMLElement;
    
    if (!liveEl || !cloneEl) continue;

    const computed = window.getComputedStyle(liveEl);
    
    propertiesToCopy.forEach((prop) => {
      const val = computed.getPropertyValue(prop);
      if (val) {
        const sanitized = sanitizeStyleValue(val);
        cloneEl.style.setProperty(prop, sanitized);
      }
    });
  }

  return clone;
}

export async function nodeToCanvas(node: HTMLElement) {
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn("Failed to wait for fonts to load, proceeding with render:", e);
    }
  }

  // Step 2 & 4: Clone the printable DOM and sanitize it, rendering from the clone
  const clone = cloneAndSanitizeDOM(node);

  // Position clone off-screen and visible for html2canvas layout rendering
  clone.style.position = "absolute";
  clone.style.top = "-9999px";
  clone.style.left = "-9999px";
  clone.style.visibility = "visible";
  clone.style.display = "block";
  document.body.appendChild(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
    return canvas;
  } finally {
    // Cleanup clone and temp elements
    clone.remove();
    if (tempColorEl) {
      tempColorEl.remove();
      tempColorEl = null;
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
