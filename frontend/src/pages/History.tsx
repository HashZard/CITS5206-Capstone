import React, { useState } from "react";

/** Frontend-only history page with demo questions.
 * Fake items reset on reload; allows delete in-session.
 */
export default function HistoryPage() {
  // Demo questions (reset every reload)
  const initial = [
    "Find the largest cities near rivers in Europe",
    "Show population density of coastal areas in Asia",
    "What are the highest mountains in South America?",
  ];

  const [questions, setQuestions] = useState(initial);

  const handleDelete = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-3xl mx-auto text-white">
      <h1 className="text-2xl font-semibold mb-6">History</h1>

      {questions.length === 0 ? (
        <p className="text-white/70">No questions yet.</p>
      ) : (
        <ul className="space-y-3">
          {questions.map((q, idx) => (
            <li
              key={idx}
              className="flex justify-between items-center rounded-xl bg-white/10 border border-white/20 px-4 py-3"
            >
              <span className="text-white/90">{q}</span>
              <button
                onClick={() => handleDelete(idx)}
                className="ml-4 px-3 py-1 text-sm rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}