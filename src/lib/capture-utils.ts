import { getFontEmbedCSS, toPng } from "html-to-image";

// A4 portrait at 300 DPI = 2480 x 3508 px
const A4_300DPI_WIDTH = 2480;

let fontEmbedCache: string | null = null;
let fontEmbedPromise: Promise<string> | null = null;

/**
 * Embedded font CSS is expensive to build (it inlines the Telugu + Inter webfonts
 * as base64), so it is computed once and reused for every export.
 */
async function getEmbeddedFontCSS(node: HTMLElement): Promise<string | undefined> {
  if (fontEmbedCache) return fontEmbedCache;
  if (!fontEmbedPromise) {
    fontEmbedPromise = getFontEmbedCSS(node).catch(() => "");
  }
  try {
    const css = await fontEmbedPromise;
    fontEmbedCache = css;
    return css || undefined;
  } catch {
    return undefined;
  }
}

/**
 * High-resolution capture of the order sheet.
 * Waits for fonts to be ready and embeds them so Telugu/English glyphs are never
 * clipped or replaced by fallbacks, and renders at ~300 DPI for A4.
 */
export async function captureNodePng(node: HTMLElement): Promise<string> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  const rect = node.getBoundingClientRect();
  const width = Math.ceil(rect.width || node.scrollWidth || 794);
  const height = Math.ceil(rect.height || node.scrollHeight || 1123);

  // Scale up so the exported width matches A4 @300 DPI (capped to keep memory sane).
  const pixelRatio = Math.min(4, Math.max(3, A4_300DPI_WIDTH / width));

  const fontEmbedCSS = await getEmbeddedFontCSS(node);

  return await toPng(node, {
    pixelRatio,
    width,
    height,
    backgroundColor: "#ffffff",
    cacheBust: true,
    skipFonts: false,
    ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
    style: {
      margin: "0",
      transform: "none",
    },
  });
}
