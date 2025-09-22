import React from "react";
import { MetaData } from '@/types/result';

interface QueryDetailsProps {
  meta: MetaData;
}

export const QueryDetails: React.FC<QueryDetailsProps> = ({ meta }) => {
  if (!meta.sql && !meta.reasoning) return null;

  return (
    <div className="mt-10 bg-white border border-slate-200 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">Query Details</h3>
      {meta.sql && (
        <div className="mb-4">
          <div className="text-xs font-medium text-slate-500 mb-1">SQL</div>
          <pre className="text-xs bg-slate-50 rounded-xl p-4 overflow-auto border border-slate-100">
            {meta.sql}
          </pre>
        </div>
      )}
      {meta.reasoning && (
        <div>
          <div className="text-xs font-medium text-slate-500 mb-1">Reasoning</div>
          <pre className="text-xs bg-slate-50 rounded-xl p-4 overflow-auto border border-slate-100 whitespace-pre-wrap">
            {meta.reasoning}
          </pre>
        </div>
      )}
    </div>
  );
};
