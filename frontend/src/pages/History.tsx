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
    <div className="min-h-screen relative">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url("/earth.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto text-white px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-200 to-green-200 bg-clip-text text-transparent">
          Query History
        </h1>

        {questions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70 text-lg">No questions yet.</p>
            <p className="text-white/50 text-sm mt-2">Your search history will appear here</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {questions.map((q, idx) => (
              <li
                key={idx}
                className="flex justify-between items-center rounded-xl bg-black/40 backdrop-blur-sm border border-white/20 px-5 py-4 hover:bg-black/50 hover:border-white/30 transition-all duration-200"
              >
                <span className="text-white/90 flex-1 pr-4">{q}</span>
                <button
                  onClick={() => handleDelete(idx)}
                  className="px-4 py-2 text-sm rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 hover:text-red-100 hover:scale-105 transition-all duration-200"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}