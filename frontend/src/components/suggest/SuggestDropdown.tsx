import React from "react";

type Item = { id: string; text: string; score?: number };
type Props = {
  items: Item[];
  visible: boolean;
  onPick: (text: string) => void;
  onClose?: () => void;
};

export default function SuggestDropdown({ items, visible, onPick }: Props) {
  if (!visible) return null;
  return (
    <div className="absolute left-0 right-0 mt-2 z-50 rounded-xl border border-slate-200 bg-white shadow-lg">
      {items.length === 0 ? (
        <div className="px-3 py-2 text-sm text-slate-500">No suggestions</div>
      ) : (
        <ul className="max-h-72 overflow-auto py-1">
          {items.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onPick(s.text)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                title={s.score != null ? `Match ${(s.score * 100).toFixed(1)}%` : ""}
              >
                {s.text}
                {s.score != null && (
                  <span className="ml-2 text-xs text-slate-400">
                    {(s.score * 100).toFixed(0)}%
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
