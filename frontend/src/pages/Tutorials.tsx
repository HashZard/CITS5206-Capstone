import React from "react";
import { BookOpen, MapPin, Send, FileDown, MousePointer2, Info } from "lucide-react";

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 md:p-8">
    <h2 className="text-xl md:text-2xl font-semibold text-white mb-4 flex items-center gap-2">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
        <BookOpen className="h-4 w-4 text-white" />
      </span>
      {title}
    </h2>
    <div className="prose prose-slate max-w-none text-white/80">{children}</div>
  </section>
);

const Chip: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-white text-sm mr-2 mb-2">
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
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Tutorials & Guide</h1>
            <p className="text-white/80 mt-1">
              A quick walkthrough of how to search, understand results, and export insights.
            </p>
          </div>
          <button
            onClick={() => go("/")}
            className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-white/90 transition-colors"
            title="Go to Home and try a query"
          >
            <MousePointer2 className="h-4 w-4" />
            Try now
          </button>
        </div>

        {/* Quick start */}
        <Section title="Quick Start (3 steps)">
          <ol className="list-decimal list-inside space-y-3 text-white/80">
            <li>
              <strong>Ask a question</strong> on the Home page. Type natural language like:
              <div className="mt-2">
                <Chip label="Largest cities near rivers in Europe" />
                <Chip label="Coastal population density in Asia" />
                <Chip label="Highest mountains in South America" />
                <Chip label="Regions larger than 500,000 km²" />
              </div>
            </li>
            <li>
              <strong>View the overview</strong> on the Result page:
              you'll see a smart map, a concise summary, and (when applicable) individual cards for each result.
            </li>
            <li>
              <strong>Export or share</strong>. Use the <em>Export</em> button to save a PDF of the page.
            </li>
          </ol>
        </Section>

        {/* Writing good queries */}
        <Section title="How to write good queries">
          <ul className="space-y-2 text-white/80">
            <li>
              Be specific about <em>what</em> and <em>where</em>:
              <div className="mt-2">
                <Chip label="Show deserts in Africa larger than 50,000 km²" />
                <Chip label="List countries in Asia with GDP per capita &gt; 30k" />
              </div>
            </li>
            <li>Use filters like size, proximity, or attributes (population, GDP, elevation, coastlines).</li>
            <li>Mention the geometry you care about if needed (polygons, points, coastlines, rivers).</li>
            <li>If you don't get what you want the first time, refine and run again.</li>
          </ul>
        </Section>

        {/* Understanding the Result page */}
        <Section title="Understanding the Result page">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Interactive Map</h3>
              <p className="text-white/80">
                The map adapts to your data (countries, regions, features). Use the controls to zoom or reset.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Detailed Cards</h3>
              <p className="text-white/80">
                Each item shows a mini-map and key attributes (name, region, population, etc.). Use the copy
                button on a card to grab a summary quickly.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">SQL & Reasoning</h3>
              <p className="text-white/80">
                The <em>Query Details</em> panel shows the SQL and the reasoning used to derive it—great for audits and debugging.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Export</h3>
              <p className="text-white/80 flex items-center gap-2">
                <FileDown className="h-4 w-4 text-white" />
                Click <strong>Export</strong> to generate a clean, multi-page PDF of the results.
              </p>
            </div>
          </div>
        </Section>

        {/* Tips & Shortcuts */}
        <Section title="Tips & Shortcuts">
          <ul className="space-y-2 text-white/80">
            <li>
              Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white">Enter</kbd> to run the query.
              Use <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white">Shift</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white">Enter</kbd> for a new line.
            </li>
            <li>Use precise numbers and units when filtering by area, elevation, or population.</li>
            <li>The map has its own zoom controls; your mousewheel works, too.</li>
          </ul>
        </Section>

        {/* Troubleshooting */}
        <Section title="Troubleshooting">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-300 mt-0.5" />
              <p className="text-white/80">
                <strong>No results?</strong> Try a broader query or remove strict filters (e.g., extremely large area thresholds).
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-300 mt-0.5" />
              <p className="text-white/80">
                <strong>Network error?</strong> Ensure the backend is running on <code className="bg-white/10 px-1 rounded">http://localhost:8000</code>.
                If your team recommends using the mock endpoint, enable it in your frontend env (or use the mock case picker on the Result page).
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-300 mt-0.5" />
              <p className="text-white/80">
                <strong>Export looks cut across pages?</strong> Large maps are paginated. Use the Export button (it applies layout fixes) rather than the browser's print dialog.
              </p>
            </div>
          </div>
        </Section>

        {/* Footer CTA */}
        <div className="flex items-center justify-center">
          <button onClick={() => go("/")} className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors inline-flex items-center gap-2">
            <Send className="h-4 w-4" />
            Start a query
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialsPage;