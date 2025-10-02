import React from "react";
import { BookOpen, MapPin, Send, FileDown, MousePointer2, Info, Sparkles } from "lucide-react";

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
    <h2 className="text-xl md:text-2xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 border border-slate-200">
        <BookOpen className="h-4 w-4 text-slate-700" />
      </span>
      {title}
    </h2>
    <div className="prose prose-slate max-w-none text-slate-800">{children}</div>
  </section>
);

const Chip: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-sm mr-2 mb-2 border border-slate-200">
    {label}
  </span>
);

const TutorialsPage: React.FC = () => {
  const go = (to: string) => {
    if (window.location.pathname !== to) {
      window.history.pushState({}, "", to);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background image */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'url("/earth.jpg")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          opacity: 0.18,
          mixBlendMode: "soft-light",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white drop-shadow">Tutorials & Guide</h1>
            <p className="text-white/90 mt-1 drop-shadow">
              A quick walkthrough of how to ask, explore results, and export insights.
            </p>
          </div>
          <button
            onClick={() => go("/")}
            className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-white/90 transition-colors shadow"
            title="Go to Home and try a query"
          >
            <MousePointer2 className="h-4 w-4" />
            Try now
          </button>
        </div>

        {/* Quick start */}
        <Section title="Quick Start (3 steps)">
          <ol className="list-decimal list-inside space-y-3">
            <li>
              <strong>Ask a question</strong> on the Home page (type in natural language).
              <div className="mt-2">
                <Chip label="Largest cities near rivers in Europe" />
                <Chip label="Coastal population density in Asia" />
                <Chip label="Highest mountains in South America" />
                <Chip label="Regions larger than 500,000 km²" />
              </div>
            </li>
            <li>
              <strong>Review results</strong> on the Result page:
              smart map, concise reasoning, and (when applicable) cards per item.
            </li>
            <li>
              <strong>Export/Share</strong>: use the <em>Export</em> button to save a clean PDF.
            </li>
          </ol>
        </Section>

        {/* New features guide */}
        <Section title="New: Intelligent Suggestions (Frontend-only)">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-slate-700 mt-0.5" />
              <div>
                <p className="text-slate-900 font-medium">Type-ahead on Home</p>
                <p>
                  As you type, the search bar suggests similar questions from a large corpus using
                  lightweight TF-IDF. Pick one to auto-fill and run.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-slate-700 mt-0.5" />
              <div>
                <p className="text-slate-900 font-medium">“Question Insight” on Result</p>
                <p>
                  The Result page shows a predicted question category and similar suggestions to try next—
                  computed fully in the browser.
                </p>
              </div>
            </li>
          </ul>
        </Section>

        {/* Writing good queries */}
        <Section title="How to write good queries">
          <ul className="space-y-2">
            <li>
              Be specific about <em>what</em> and <em>where</em>:
              <div className="mt-2">
                <Chip label="Show deserts in Africa larger than 50,000 km²" />
                <Chip label="List countries in Asia with GDP per capita > 30k" />
              </div>
            </li>
            <li>Use filters like size, proximity, or attributes (population, GDP, elevation, coastlines).</li>
            <li>Mention the geometry if relevant (polygons, points, rivers, coastlines).</li>
            <li>If the first attempt isn’t right, refine and run again.</li>
          </ul>
        </Section>

        {/* Understanding the Result page */}
        <Section title="Understanding the Result page">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-2">Interactive Map</h3>
              <p className="text-slate-700">
                The map adapts to your data (countries, regions, features). Use the controls to zoom or reset.
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-2">Detailed Cards</h3>
              <p className="text-slate-700">
                Each item shows a mini-map and key attributes. Use the copy button on a card for quick sharing.
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-2">SQL & Reasoning</h3>
              <p className="text-slate-700">
                <em>Query Details</em> shows the SQL and reasoning used to derive it—helpful for audits and debugging.
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-2">Export</h3>
              <p className="text-slate-700 flex items-center gap-2">
                <FileDown className="h-4 w-4 text-slate-700" />
                Click <strong>Export</strong> to generate a clean, single-page PDF of the results.
              </p>
            </div>
          </div>
        </Section>

        {/* Tips & Shortcuts */}
        <Section title="Tips & Shortcuts">
          <ul className="space-y-2">
            <li className="text-slate-800">
              Press{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                Enter
              </kbd>{" "}
              to run. Use{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                Shift
              </kbd>{" "}
              +{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                Enter
              </kbd>{" "}
              for a new line.
            </li>
            <li className="text-slate-800">Use precise numbers/units for filters (area, elevation, population).</li>
            <li className="text-slate-800">The map has zoom controls; your mouse wheel works too.</li>
          </ul>
        </Section>

        {/* Troubleshooting */}
        <Section title="Troubleshooting">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-500 mt-0.5" />
              <p className="text-slate-800">
                <strong>No results?</strong> Try a broader query or relax strict filters.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-500 mt-0.5" />
              <p className="text-slate-800">
                <strong>Network error?</strong> Ensure the backend is running at{" "}
                <code className="px-1 rounded bg-slate-100 text-slate-900 border border-slate-300">
                  http://localhost:8000
                </code>
                .
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-500 mt-0.5" />
              <p className="text-slate-800">
                <strong>Export pagination?</strong> Use the Export button (applies layout fixes) instead of the browser print dialog.
              </p>
            </div>
          </div>
        </Section>

        {/* Footer CTA */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => go("/")}
            className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors inline-flex items-center gap-2 shadow"
          >
            <Send className="h-4 w-4" />
            Start a query
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialsPage;
