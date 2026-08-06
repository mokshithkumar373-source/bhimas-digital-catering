import { supabase } from "@/integrations/supabase/client";
import { buildPDF } from "./pdf-utils";
import { nodeToPng } from "./png-utils";

const BUCKET = "order-exports";
// Signed URLs valid for 1 year — the bucket is private, so links stay unguessable.
const URL_TTL_SECONDS = 60 * 60 * 24 * 365;

export type UploadedOrderFiles = {
  pdfUrl: string;
  pngUrl: string;
  baseName: string;
};

/**
 * Builds the unique export file base name, e.g. BHM-2026-00015.
 */
export function buildExportBaseName(orderNumber?: number | null, dateStr?: string | null): string {
  const year = dateStr && dateStr.length >= 4 ? dateStr.slice(0, 4) : String(new Date().getFullYear());
  const num = orderNumber ? String(orderNumber).padStart(5, "0") : String(Date.now()).slice(-5);
  return `BHM-${year}-${num}`;
}

async function uploadOne(
  path: string,
  blob: Blob,
  contentType: string,
): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType,
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw error;

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, URL_TTL_SECONDS);
  if (signError || !data?.signedUrl) throw signError ?? new Error("Could not create file link");
  return data.signedUrl;
}

// Prevents duplicate uploads when a button is pressed repeatedly.
const inFlight = new Map<string, Promise<UploadedOrderFiles>>();

/**
 * Generates the PDF + PNG for the order sheet, uploads both to Supabase Storage
 * and records them in order_files. Returns the shareable public (signed) URLs.
 */
export async function uploadOrderExports(
  node: HTMLElement,
  opts: { orderId?: string | null; orderNumber?: number | null; functionDate?: string | null },
): Promise<UploadedOrderFiles> {
  const baseName = buildExportBaseName(opts.orderNumber, opts.functionDate);
  const key = `${opts.orderId ?? "draft"}:${baseName}`;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const task = (async (): Promise<UploadedOrderFiles> => {
    const pdf = await buildPDF(node);
    const pdfBlob = pdf.output("blob") as Blob;

    const pngDataUrl = await nodeToPng(node);
    const pngBlob = await (await fetch(pngDataUrl)).blob();

    const folder = opts.orderId ?? "drafts";
    const pdfPath = `${folder}/${baseName}.pdf`;
    const pngPath = `${folder}/${baseName}.png`;

    const [pdfUrl, pngUrl] = await Promise.all([
      uploadOne(pdfPath, pdfBlob, "application/pdf"),
      uploadOne(pngPath, pngBlob, "image/png"),
    ]);

    if (opts.orderId) {
      await supabase.from("order_files").upsert(
        [
          {
            order_id: opts.orderId,
            file_name: `${baseName}.pdf`,
            file_type: "pdf",
            storage_path: pdfPath,
            public_url: pdfUrl,
          },
          {
            order_id: opts.orderId,
            file_name: `${baseName}.png`,
            file_type: "png",
            storage_path: pngPath,
            public_url: pngUrl,
          },
        ],
        { onConflict: "storage_path", ignoreDuplicates: false },
      );
    }

    return { pdfUrl, pngUrl, baseName };
  })();

  inFlight.set(key, task);
  try {
    return await task;
  } finally {
    inFlight.delete(key);
  }
}
