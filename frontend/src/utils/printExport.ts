/**
 * printExport.ts
 * Screen-exact export via the system Print dialog (Save as PDF)
 * - Clones only your target node into a print-only root
 * - Hides everything else
 * - Applies safe @media print rules (no overlays, keeps colors)
 */
 
type PrintOptions = { title?: string };
 
function ensurePrintCss(doc: Document) {
  const ID = "__geo_print_css__";
  if (doc.getElementById(ID)) return;
 
  const style = doc.createElement("style");
  style.id = ID;
  style.textContent = `
@media print {
  html, body {
    -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
 
  /* Show only our print root */
  body > *:not(#__print_root__) { display: none !important; }
  #__print_root__ { display: block !important; }
 
  /* Remove overlays/animations that can cover content */
  #__print_root__ * {
    animation: none !important;
    transition: none !important;
    filter: none !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
  }
  #__print_root__ .fixed,
  #__print_root__ .sticky {
    position: static !important;
    inset: auto !important;
  }
 
  /* Respect your export-ignore flag */
  #__print_root__ [data-export-ignore] {
    display: none !important;
    visibility: hidden !important;
  }
 
  /* Reduce awkward page breaks */
  .avoid-break, .card, .rounded-2xl, table, thead, tbody, tr, td, th {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
 
  /* Let long pages flow naturally */
  section, article, div, p {
    break-inside: auto;
  }
 
  @page { size: auto; margin: 12mm; }
}
@media screen { #__print_root__ { display: none; } }
`;
  doc.head.appendChild(style);
}
 
function cloneWithCanvas(source: HTMLElement): HTMLElement {
  const cloned = source.cloneNode(true) as HTMLElement;
 
  // Copy canvas bitmaps (for map tiles, charts, etc.)
  const src = source.querySelectorAll("canvas");
  const dst = cloned.querySelectorAll("canvas");
  for (let i = 0; i < src.length && i < dst.length; i++) {
    const s = src[i];
    const d = dst[i] as HTMLCanvasElement;
    try {
      d.width = s.width;
      d.height = s.height;
      const ctx = d.getContext("2d");
      if (ctx) ctx.drawImage(s, 0, 0);
    } catch { /* tainted canvas — ignore */ }
  }
  return cloned;
}
 
/** Open the system print dialog for the given element (choose “Save as PDF”). */
export async function printElementToSystemPdf(
  target: HTMLElement,
  opts: PrintOptions = {}
): Promise<void> {
  const doc = target.ownerDocument || document;
  ensurePrintCss(doc);
 
  const originalTitle = doc.title;
  if (opts.title) doc.title = opts.title;
 
  let root = doc.getElementById("__print_root__");
  if (!root) {
    root = doc.createElement("div");
    root.id = "__print_root__";
    doc.body.appendChild(root);
  }
  root.innerHTML = "";
 
  const clone = cloneWithCanvas(target);
  root.appendChild(clone);
 
  await new Promise((r) => setTimeout(r, 50));
  window.print();
 
  const cleanup = () => {
    root?.parentNode?.removeChild(root);
    doc.title = originalTitle;
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  setTimeout(cleanup, 1500); // fallback
}