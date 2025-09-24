/**
 * exportPdf 工具：将DOM节点导出为PDF
 */
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function generatePdfFromNode(
  target: HTMLElement,
  _filename = 'Results.pdf',
  options?: { ignoreElements?: (el: Element) => boolean }
): Promise<Blob> {
  const scale = Math.min(window.devicePixelRatio || 1, 2); // 限制最大缩放，防止超大PDF
  const canvas = await html2canvas(target, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    ignoreElements: options?.ignoreElements
  });
  const imgData = canvas.toDataURL('image/jpeg', 0.92);

  // A4 尺寸（pt）
  const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 32;

  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let y = margin;
  let remaining = imgHeight;

  // 如果超出一页，则分页
  let imgY = 0;
  while (remaining > 0) {
    pdf.addImage(imgData, 'JPEG', margin, y, imgWidth, Math.min(remaining, pageHeight - margin * 2), undefined, 'FAST');
    remaining -= (pageHeight - margin * 2);
    imgY += (pageHeight - margin * 2);
    if (remaining > 0) {
      pdf.addPage();
      y = margin;
    }
  }

  // 返回Blob供下载或分享
  const blob = pdf.output('blob');
  return blob;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
