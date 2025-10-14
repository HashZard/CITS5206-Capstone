/**
 * High-quality multi-page DOM → PDF
 * - Renders at higher scale (default 2.0) for crisp text
 * - Uses PNG (lossless) to avoid JPEG artifacts
 * - Splits long content into pages (no truncation)
 * - Disables sticky/fixed/animations during capture to avoid overlays
 */
 
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
 
type IgnoreFn = (el: Element) => boolean;
 
const IGNORE_SELECTOR = "[data-export-ignore]";
 
/* ---------- helpers ---------- */
 
function hideIgnored(root: HTMLElement) {
  const changed: Array<{ el: HTMLElement; prev: string }> = [];
  root.querySelectorAll<HTMLElement>(IGNORE_SELECTOR).forEach((el) => {
    changed.push({ el, prev: el.style.visibility });
    el.style.visibility = "hidden";
  });
  return () => changed.forEach(({ el, prev }) => (el.style.visibility = prev));
}
 
/** Temporarily inject CSS to speed up rendering and avoid overlays */
function applyCaptureCss(doc: Document) {
  const style = doc.createElement("style");
  style.setAttribute("data-export-css", "true");
  style.textContent = `
    .__exporting__ * {
      animation: none !important;
      transition: none !important;
      caret-color: transparent !important;
      filter: none !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      transform: none !important; /* avoid subpixel transform blur */
      image-rendering: auto !important;
    }
    .__exporting__ .sticky,
    .__exporting__ .fixed {
      position: static !important;
      inset: auto !important;
      top: auto !important;
    }
  `;
  doc.head.appendChild(style);
  doc.documentElement.classList.add("__exporting__");
  return () => {
    style.remove();
    doc.documentElement.classList.remove("__exporting__");
  };
}
 
/** px↔pt (96 CSS px/in, 72 pt/in) */
const PX_PER_IN = 96;
const PT_PER_IN = 72;
const pxToPt = (px: number) => (px / PX_PER_IN) * PT_PER_IN;
const ptToPx = (pt: number) => (pt / PT_PER_IN) * PX_PER_IN;
 
export type ExportOptions = {
  /** Render scale. 1.4–2.5 recommended. Default 2.0 (crisp). */
  scale?: number;
  /** A4 or Letter. Default A4 */
  format?: "a4" | "letter";
  /** Page margins (pt). Default ~10mm = 28pt */
  marginPt?: number;
  /** Extra ignore logic (alongside [data-export-ignore]) */
  ignoreElements?: IgnoreFn;
  /** Use PNG (lossless). Keep true for best text quality. */
  usePng?: boolean;
};
 
/* ---------- main ---------- */
 
export async function exportElementToPdf(
  target: HTMLElement,
  filename = "Results.pdf",
  opts: ExportOptions = {}
): Promise<Blob> {
  const doc = target.ownerDocument || document;
  const cleanupCaptureCss = applyCaptureCss(doc);
  const restoreIgnored = hideIgnored(target);
 
  try {
    // High-quality defaults
    const scale = Math.min(Math.max(opts.scale ?? 2.0, 1.4), 2.6);
    const usePng = opts.usePng ?? true;
 
    // Tight window for html2canvas
    const rect = target.getBoundingClientRect();
    const windowWidth = Math.ceil(rect.width);
    const windowHeight = Math.ceil(rect.height);
 
    const canvas = await html2canvas(target, {
      backgroundColor: "#ffffff",
      scale,
      logging: false,
      useCORS: true,
      allowTaint: true,
      imageTimeout: 0,
      removeContainer: true,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth,
      windowHeight,
      ignoreElements: (el) => {
        const inIgnored = (el as HTMLElement).closest?.(IGNORE_SELECTOR) != null;
        return inIgnored || (opts.ignoreElements ? opts.ignoreElements(el) : false);
      },
      onclone: (clonedDoc) => {
        clonedDoc.documentElement.classList.add("__exporting__");
      },
    });
 
    // PDF page setup
    const isA4 = (opts.format ?? "a4").toLowerCase() === "a4";
    const pageWidthPt = isA4 ? 595.28 : 612;   // A4 / Letter
    const pageHeightPt = isA4 ? 841.89 : 792;
    const marginPt = opts.marginPt ?? 28;
    const contentWidthPt = pageWidthPt - marginPt * 2;
    const contentHeightPt = pageHeightPt - marginPt * 2;
 
    // Convert PDF content area to canvas px
    const contentWidthPx = Math.round(ptToPx(contentWidthPt));
    const contentHeightPx = Math.round(ptToPx(contentHeightPt));
 
    // Slice big canvas into pages
    const srcCanvas = canvas;
    const srcW = srcCanvas.width;
    const srcH = srcCanvas.height;
 
    // Fit full width into PDF content width
    const scaleToFit = contentWidthPx / srcW;
    const srcSliceHeight = Math.floor(contentHeightPx / scaleToFit);
 
    // Offscreen page canvas
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = contentWidthPx;
    pageCanvas.height = contentHeightPx;
    const pageCtx = pageCanvas.getContext("2d", { willReadFrequently: true })!;
    pageCtx.imageSmoothingEnabled = true;
 
    const pdf = new jsPDF({
      orientation: "p",
      unit: "pt",
      format: [pageWidthPt, pageHeightPt],
      compress: true,
    });
 
    let ySrc = 0;
    let first = true;
 
    while (ySrc < srcH) {
      const sliceH = Math.min(srcSliceHeight, srcH - ySrc);
      const destH = Math.round(sliceH * scaleToFit);
 
      pageCanvas.height = Math.min(contentHeightPx, destH);
      pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
 
      pageCtx.drawImage(
        srcCanvas,
        0, ySrc, srcW, sliceH,
        0, 0, contentWidthPx, Math.round(sliceH * scaleToFit)
      );
 
      // Lossless PNG keeps text crisp
      const imgData = usePng
        ? pageCanvas.toDataURL("image/png")
        : pageCanvas.toDataURL("image/jpeg", 0.96);
 
      if (!first) pdf.addPage([pageWidthPt, pageHeightPt], "p");
      first = false;
 
      pdf.addImage(
        imgData,
        usePng ? "PNG" : "JPEG",
        marginPt,
        marginPt,
        contentWidthPt,
        Math.min(contentHeightPt, pxToPt(pageCanvas.height)),
        undefined,
        "FAST"
      );
 
      ySrc += sliceH;
    }
 
    return pdf.output("blob");
  } finally {
    restoreIgnored();
    cleanupCaptureCss();
  }
}