"use client";
 
import React, { useState } from "react";
import { X } from "lucide-react";
import { printElementToSystemPdf } from "@/utils/printExport";
 
type Props = {
  isOpen: boolean;
  onClose: () => void;
  targetRef: React.RefObject<HTMLElement>;
};
 
export default function ExportModal({ isOpen, onClose, targetRef }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!isOpen) return null;
 
  const doSystemPdf = async () => {
    if (!targetRef.current) return;
    setBusy(true);
    setError(null);
    try {
      await printElementToSystemPdf(targetRef.current, { title: "Results" });
      onClose();
    } catch (e: any) {
      setError(e?.message || "Export failed");
    } finally {
      setBusy(false);
    }
  };
 
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      data-export-ignore
    >
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Export</h3>
          <button
            className="p-2 rounded-md border border-slate-200"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
 
        <p className="text-sm text-slate-700 mb-3">
          Choose <strong>Save as PDF</strong> in your system print dialog for exact on-screen quality.
        </p>
 
        {error && (
          <div className="mb-3 text-sm text-red-600 border border-red-200 rounded-md p-2 bg-red-50">
            {error}
          </div>
        )}
 
        <div className="flex items-center justify-end gap-2">
          <button
            className="px-3 py-2 rounded-md border border-slate-200"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className="px-3 py-2 rounded-md bg-indigo-600 text-white disabled:opacity-60"
            onClick={doSystemPdf}
            disabled={busy}
            title="Opens system print dialog; choose Save as PDF"
          >
            {busy ? "Preparing…" : "Export (System PDF)"}
          </button>
        </div>
      </div>
    </div>
  );
}