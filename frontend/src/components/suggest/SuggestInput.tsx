import React, { useEffect, useMemo, useRef, useState } from "react";
import { SEED_QUESTIONS } from "@/data/seedQuestions";
import { buildIndex, topKSimilar } from "@/lib/text/tfidf";
import { Send } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  placeholder?: string;
  /** show suggestions after N chars (default 2) */
  minChars?: number;
  /** show up to N suggestions (default 6) */
  maxItems?: number;
  className?: string;
};

type Suggestion = {
  id?: string;
  text: string;
  score?: number;
};

const idx = buildIndex(SEED_QUESTIONS.map((q) => ({ id: q.id, text: q.text })));

export default function SuggestInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask about geographic data, locations, demographics…",
  minChars = 2,
  maxItems = 6,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions: Suggestion[] = useMemo(() => {
    const v = value?.trim() ?? "";
    if (v.length < minChars) return [];
    // topKSimilar may return items with { id, text, score }
    return topKSimilar(v, idx, maxItems) as Suggestion[];
  }, [value, minChars, maxItems]);

  // Close when clicking outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Open when there are suggestions and input is focused/changed
  useEffect(() => {
    if ((value?.trim().length || 0) >= minChars && suggestions.length > 0) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [value, minChars, suggestions.length]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setOpen(false);
    onSubmit(t);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Input glass */}
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 dark:bg-black/40 backdrop-blur px-4 py-3">
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(value);
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white placeholder-white/70 focus:outline-none text-base sm:text-lg"
        />
        <button
          type="button"
          className="rounded-full p-2 bg-white/20 hover:bg-white/30 transition"
          title="Ask"
          onClick={() => submit(value)}
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Dropdown (theme-safe surface + text) */}
      {open && suggestions.length > 0 && (
        <div
          className="
            absolute left-0 right-0 mt-2 z-50 overflow-hidden rounded-xl
            border border-slate-200 dark:border-slate-700
            bg-white dark:bg-slate-900
            text-slate-800 dark:text-slate-100
            shadow-xl
          "
          role="listbox"
          aria-label="Query suggestions"
        >
          {suggestions.map((s, i) => (
            <button
              key={s.id ?? `${s.text}-${i}`}
              type="button"
              onMouseDown={(e) => {
                // prevent input blur before click triggers
                e.preventDefault();
                submit(s.text);
              }}
              className="
                w-full text-left px-4 py-3
                border-b last:border-b-0
                border-slate-100 dark:border-slate-800
                hover:bg-slate-50 dark:hover:bg-slate-800
                focus:bg-slate-100 dark:focus:bg-slate-800
                outline-none
              "
              role="option"
            >
              <span className="font-medium">{s.text}</span>
              {typeof s.score === "number" && (
                <span className="ml-2 text-xs text-slate-400 dark:text-slate-400">
                  {Math.round(s.score * 100)}%
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
