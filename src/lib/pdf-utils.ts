import { jsPDF } from "jspdf";
import { captureNodePng } from "./capture-utils";

/**
 * Generates a jsPDF instance by rendering the node to a high-resolution PNG
 * (A4 @ ~300 DPI) and scaling it to an A4 portrait page.
 */
export async function buildPDF(node: HTMLElement): Promise<jsPDF> {
  const dataUrl = await captureNodePng(node);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });


  const pageW = 210;
  const pageH = 297;

  // Obtain elements current visual width and height
  const rect = node.getBoundingClientRect();
  const nodeW = rect.width || 1;
  const nodeH = rect.height || 1;

  // Calculate scaled height matching A4 page width
  const imgW = pageW;
  const imgH = (nodeH * imgW) / nodeW;

  if (imgH <= pageH) {
    // If it fits vertically, center the image vertically
    const yOffset = (pageH - imgH) / 2;
    pdf.addImage(dataUrl, "PNG", 0, yOffset, imgW, imgH);
  } else {
    // If it is taller, scale down to fit the page height instead to avoid overflow/second page
    const scaledW = (nodeW * pageH) / nodeH;
    const xOffset = (pageW - scaledW) / 2;
    pdf.addImage(dataUrl, "PNG", xOffset, 0, scaledW, pageH);
  }

  return pdf;
}

/**
 * Downloads a pixel-perfect A4 PDF directly.
 */
export async function downloadPDF(node: HTMLElement, filename: string): Promise<jsPDF> {
  const pdf = await buildPDF(node);
  pdf.save(filename.endsWith(".pdf") ? filename : filename + ".pdf");
  return pdf;
}

/**
 * Generates PDF and opens it in a new tab.
 */
export async function generatePDF(node: HTMLElement): Promise<void> {
  const w = window.open("", "_blank");
  if (!w) {
    throw new Error("Popup blocker enabled! Please allow popups for this site.");
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
