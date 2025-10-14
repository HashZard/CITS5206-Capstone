// src/pages/RawValue.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Copy, Download, Trash2, ArrowLeft } from "lucide-react";
 
type Snapshot = {
  question?: string;
  meta?: {
    model?: string;
    sql?: string;
    reasoning?: string;
    [k: string]: any;
  };
  results?: any[];
};
 
const STORAGE_KEY = "geo:lastQuery";
 
function pretty(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj ?? "");
  }
}
 
export default function RawValuePage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [copied, setCopied] = useState<"meta" | "results" | null>(null);
 
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setSnap(JSON.parse(raw));
    } catch {
      setSnap(null);
    }
  }, []);
 
  const resultsLen = snap?.results?.length ?? 0;
  const jsonText = useMemo(() => pretty(snap?.results ?? []), [snap]);
 
  const copyText = async (text: string, which: "meta" | "results") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  };
 
  const downloadJson = () => {
    const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `geoquery-raw-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
 
  const clearSnapshot = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    setSnap(null);
  };
 
  return (
    <div
      className="
        mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen
        bg-white dark:bg-white
        text-slate-800 dark:text-slate-800
        max-w-[1100px]
      "
    >
      {/* Header */}
      <header
        className="
          mb-8 rounded-3xl
          bg-gradient-to-br from-white/80 to-white/60
          backdrop-blur-md border border-slate-200
          shadow-[0_10px_30px_rgba(2,6,23,0.08)]
          p-6 md:p-8
        "
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
              Raw Backend Payload
            </h1>
            <p className="mt-2 text-slate-700">
              Shows exactly what the backend returned for your last query.
            </p>
          </div>
          <a
            href="/result"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm"
            title="Back to results"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Results
          </a>
        </div>
      </header>
 
      {/* Empty state */}
      {!snap && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <p className="text-slate-700">
            No snapshot found. Run a query on the{" "}
            <a className="underline" href="/">
              home page
            </a>{" "}
            or{" "}
            <a className="underline" href="/result">
              results page
            </a>{" "}
            first.
          </p>
        </div>
      )}
 
      {snap && (
        <>
          {/* Summary */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-[80ch]">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Question
                </h2>
                <p className="text-slate-800 italic">“{snap.question || "—"}”</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-slate-300 bg-slate-50">
                  {resultsLen} row{resultsLen === 1 ? "" : "s"}
                </span>
                {snap.meta?.model && (
                  <span className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-slate-300 bg-slate-50">
                    model: {String(snap.meta.model)}
                  </span>
                )}
              </div>
            </div>
          </section>
 
          {/* Meta (SQL + Reasoning) */}
          {(snap.meta?.sql || snap.meta?.reasoning) && (
            <section className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-lg font-semibold">Meta</h3>
                <button
                  onClick={() =>
                    copyText(
                      pretty({ sql: snap.meta?.sql, reasoning: snap.meta?.reasoning }),
                      "meta"
                    )
                  }
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50"
                >
                  <Copy className="w-4 h-4" />
                  {copied === "meta" ? "Copied" : "Copy"}
                </button>
              </div>
 
              {snap.meta?.sql && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-slate-500 mb-1">
                    Generated SQL
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-sm bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto">
                    {snap.meta.sql}
                  </pre>
                </div>
              )}
 
              {snap.meta?.reasoning && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">
                    Reasoning
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-sm bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto">
                    {snap.meta.reasoning}
                  </pre>
                </div>
              )}
            </section>
          )}
 
          {/* Raw results JSON */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-lg font-semibold">Raw Results JSON</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyText(jsonText, "results")}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50"
                >
                  <Copy className="w-4 h-4" />
                  {copied === "results" ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={downloadJson}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-slate-300 bg-white hover:bg-slate-50"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={clearSnapshot}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-rose-300 bg-white hover:bg-rose-50 text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              </div>
            </div>
 
            <pre className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-[75vh]">
              {jsonText}
            </pre>
          </section>
        </>
      )}
    </div>
  );
}