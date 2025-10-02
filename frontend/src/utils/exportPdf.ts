/**
 * exportPdf: capture a DOM node and produce a SINGLE-PAGE PDF
 * whose page size matches the captured content (no page breaks).
 *
 * Tips:
 * - Add data-export-ignore to any element you do not want included.
 * - This creates a tall PDF page if your content is tall.
 * - If you’d prefer to fit to A4 width (still single page), set fitToA4: true.
 */

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type IgnoreFn = (el: Element) => boolean;

const IGNORE_SELECTOR = "[data-export-ignore]";

// Hide ignored elements during capture and restore afterwards
function hideIgnored(root: HTMLElement) {
  const changed: Array<{ el: HTMLElement; prev: string }> = [];
  root.querySelectorAll<HTMLElement>(IGNORE_SELECTOR).forEach((el) => {
    changed.push({ el, prev: el.style.visibility });
    el.style.visibility = "hidden";
  });
  return () => changed.forEach(({ el, prev }) => (el.style.visibility = prev));
}

export async function generatePdfFromNode(
  target: HTMLElement,
  filename = "Results.pdf",
  options?: {
    ignoreElements?: IgnoreFn;
    /** If true, the PDF page will be A4 width and height will be scaled to keep everything on ONE page. */
    fitToA4?: boolean;
    /** 1–2 is a safe range (higher = sharper & larger file). */
    scale?: number;
  }
): Promise<Blob> {
  const restore = hideIgnored(target);

  try {
    const scale = Math.min(Math.max(options?.scale ?? 1.6, 1), 2);

    const canvas = await html2canvas(target, {
      backgroundColor: "#ffffff",
      scale,
      useCORS: true,
      logging: false,
      ignoreElements: (el) => {
        const inIgnored = (el as HTMLElement).closest?.(IGNORE_SELECTOR) != null;
        return inIgnored || (options?.ignoreElements ? options.ignoreElements(el) : false);
      },
      // Ensure full layout width gets rendered
      windowWidth: target.ownerDocument?.documentElement.scrollWidth,
    });

    // --- Option A (default): page size EXACTLY equals content (single page, no breaks) ---
    if (!options?.fitToA4) {
      // jsPDF supports 'px' units — easiest way to match the canvas exactly
      const pdf = new jsPDF({
        orientation: canvas.width >= canvas.height ? "l" : "p",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height, undefined, "FAST");

      return pdf.output("blob");
    }

    // --- Option B (fitToA4 = true): fit width to A4, keep ONE page by scaling page height accordingly ---
    // A4 width in points (jsPDF default units are points @ 72dpi), but we'll use 'pt' unit explicitly:
    const A4_W_PT = 595.28; // 210mm
    // Convert px → pt (assuming CSS px 96dpi)
    const pxToPt = 72 / 96;
    const imgWpt = A4_W_PT;
    const imgHpt = (canvas.height / canvas.width) * imgWpt;

    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: [imgWpt, imgHpt] });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    pdf.addImage(imgData, "JPEG", 0, 0, imgWpt, imgHpt, undefined, "FAST");
    return pdf.output("blob");
  } finally {
    restore();
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(((reader.result as string) || "").split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}