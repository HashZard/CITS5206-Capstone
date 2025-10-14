// src/components/result/QueryDetails.tsx
"use client";
 
import React, { useMemo, useState } from "react";
import { MetaData } from "@/types/result";
import { Clipboard, Check } from "lucide-react";
 
type Props = {
  meta: MetaData;
};
 
function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {/* ignore */}
  };
  return { copied, copy };
}
 
export const QueryDetails: React.FC<Props> = ({ meta }) => {
  // Support both meta.model_used and meta.model
  const modelName = (meta as any)?.model_used ?? (meta as any)?.model;
 
  const sql = useMemo(() => {
    const s = (meta as any)?.sql;
    return s ? String(s) : "";
  }, [meta]);
 
  const reasoning = useMemo(() => {
    const r = (meta as any)?.reasoning;
    if (!r) return "";
    return Array.isArray(r) ? r.join("\n") : String(r);
  }, [meta]);
 
  const { copied: sqlCopied, copy: copySQL } = useCopy();
  const { copied: rCopied, copy: copyReasoning } = useCopy();
 
  return (
    <section aria-labelledby="query-details-title">
      <h2 id="query-details-title" className="text-xl font-semibold mb-4">
        Query Details
      </h2>
 
      {/* SQL */}
      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50">
        <div className="flex items-center justify-between px-4 py-2 border-b border-emerald-200">
          <span className="text-sm font-medium text-emerald-900">Generated SQL</span>
          <div className="flex items-center gap-2">
            {modelName && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-emerald-300 text-emerald-900">
                model: {String(modelName)}
              </span>
            )}
            <button
              type="button"
              onClick={() => copySQL(sql)}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-emerald-300 bg-white hover:bg-emerald-100"
            >
              {sqlCopied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
              {sqlCopied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <pre className="m-0 p-4 overflow-x-auto text-[12px] leading-6 text-emerald-900">
{sql || "-- No SQL generated"}
        </pre>
      </div>
 
      {/* Reasoning */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50">
        <div className="flex items-center justify-between px-4 py-2 border-b border-indigo-200">
          <span className="text-sm font-medium text-indigo-900">Reasoning</span>
          <button
            type="button"
            onClick={() => copyReasoning(reasoning)}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-indigo-300 bg-white hover:bg-indigo-100"
          >
            {rCopied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
            {rCopied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="m-0 p-4 overflow-x-auto whitespace-pre-wrap text-[13px] leading-6 text-indigo-900">
{reasoning || "—"}
        </pre>
      </div>
    </section>
  );
};
 
export default QueryDetails;