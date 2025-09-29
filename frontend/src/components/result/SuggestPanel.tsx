import React, { useMemo } from "react";
import { classifyQuestion } from "@/lib/classify";
import { SEED_QUESTIONS } from "@/data/seedQuestions";
import { buildIndex, topKSimilar } from "@/lib/text/tfidf";
import { BadgeCheck, HelpCircle } from "lucide-react";

type Props = { query: string; onPickSuggestion?: (text: string) => void };

const idx = buildIndex(SEED_QUESTIONS.map(q => ({ id: q.id, text: q.text })));

export default function SuggestPanel({ query, onPickSuggestion }: Props) {
  const classification = useMemo(() => classifyQuestion(query), [query]);
  const similar = useMemo(() => {
    if (!query?.trim()) return [];
    return topKSimilar(query, idx, 5);
  }, [query]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 mb-8">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-slate-700" />
          <h3 className="text-lg font-semibold text-slate-800">Question Insight</h3>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">Frontend-only</span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-slate-600">Predicted type:</span>
        <span className="text-sm font-medium px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
          {classification.category}
        </span>
        <span className="text-xs text-slate-500">(confidence {Math.round(classification.confidence * 100)}%)</span>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Similar questions</span>
        </div>

        {similar.length === 0 ? (
          <p className="text-sm text-slate-500">Start typing to see suggestions…</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-2">
            {similar.map(s => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onPickSuggestion?.(s.text)}
                  className="group w-full text-left rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 p-3 transition"
                  title={`Similarity: ${(s.score * 100).toFixed(1)}%`}
                >
                  <div className="text-sm text-slate-800 group-hover:underline">{s.text}</div>
                  <div className="text-xs text-slate-500 mt-1">match {(s.score * 100).toFixed(1)}%</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
