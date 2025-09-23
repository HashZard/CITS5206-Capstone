/**
 * ExportModal 导出弹窗
 * - 下载PDF或通过邮箱分享
 * - 焦点陷阱、Esc关闭、ARIA属性
 */
import React, { useEffect, useRef, useState } from 'react';
import { X, Mail, Download } from 'lucide-react';
import { generatePdfFromNode, blobToBase64 } from '@/utils/exportPdf';
import { sharePdfByEmail } from '@/services/shareService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRef: React.RefObject<HTMLElement>;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, targetRef }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 焦点陷阱
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => prev?.focus();
  }, [isOpen]);

  const close = () => {
    if (!loading) onClose();
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Escape') close();
  };

  const isValidEmail = (val: string) => /.+@.+\..+/.test(val);

  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

  const handleDownload = async () => {
    if (!targetRef.current) return;
    setLoading(true);
    try {
      // 关闭弹窗，等待UI更新完成再截图
      onClose();
      await nextFrame();
      const blob = await generatePdfFromNode(targetRef.current, 'Results.pdf', {
        ignoreElements: (el) => el.hasAttribute('data-export-ignore')
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Results.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    setError('');
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!targetRef.current) return;
    setLoading(true);
    try {
      // 关闭弹窗，等待UI更新完成再截图
      onClose();
      await nextFrame();
      const blob = await generatePdfFromNode(targetRef.current, 'Results.pdf', {
        ignoreElements: (el) => el.hasAttribute('data-export-ignore')
      });
      const pdfBase64 = await blobToBase64(blob);
      const { ok } = await sharePdfByEmail(email, pdfBase64);
      if (ok) {
        // 成功：已关闭
      } else {
        setError('Failed to share. Please try again.');
      }
    } catch (e) {
      setError('Failed to generate or share PDF');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-title"
      onKeyDown={onKeyDown}
    >
      <div ref={dialogRef} tabIndex={-1} className="bg-white rounded-2xl w-full max-w-md mx-4 outline-none">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 id="export-title" className="text-lg font-semibold text-slate-900">Export as PDF</h2>
          <button onClick={close} aria-label="Close" className="p-2 rounded hover:bg-slate-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <button
            onClick={handleDownload}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>

          <div className="h-px bg-slate-200" />

          <label htmlFor="email" className="text-sm font-medium text-slate-700">Share via email</label>
          <input
            id="email"
            type="email"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            aria-describedby="email-help"
            disabled={loading}
          />
          {error && (
            <p id="email-help" className="text-sm text-red-600">{error}</p>
          )}
          <button
            onClick={handleShare}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60"
          >
            <Mail className="w-4 h-4" /> Share
          </button>

          {loading && (
            <p className="text-sm text-slate-500">Processing...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
