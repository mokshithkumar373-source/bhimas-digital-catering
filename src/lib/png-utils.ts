import { toPng } from "html-to-image";

const EXPORT_OPTIONS = {
  pixelRatio: 3,
  backgroundColor: "#ffffff",
  cacheBust: true,
  skipFonts: false,
};

/**
 * Helper to generate a high-resolution PNG data URL from a DOM node.
 */
export async function nodeToPng(node: HTMLElement): Promise<string> {
  return await toPng(node, EXPORT_OPTIONS);
}

/**
 * Downloads a high-resolution PNG file directly.
 */
export async function downloadPNG(node: HTMLElement, filename: string): Promise<void> {
  const url = await nodeToPng(node);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".png") ? filename : filename + ".png";
  a.click();
}

/**
 * Generates PNG and opens in a new tab (Bypass popup blocker safety).
 */
export async function generatePNG(node: HTMLElement): Promise<void> {
  const w = window.open("", "_blank");
  if (!w) {
    throw new Error("Popup blocker enabled! Please allow popups for this site.");
  }
  w.document.write("Loading PNG preview...");
  
  try {
    const url = await nodeToPng(node);
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
