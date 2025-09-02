// src/pages/Tutorials.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Search,
  Upload,
  MousePointerClick,
  Sun,
  Moon,
  PanelLeft,
  Map,
  BarChart3,
  FileText,
  Image as ImageIcon,
  FileDown,
  HelpCircle,
  Sparkles,
} from "lucide-react";

function navigateTo(href: string) {
  if (window.location.pathname !== href) {
    window.history.pushState({}, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

export default function Tutorials() {
  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Hero */}
      <header className="text-center">
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-foreground" />
        </div>
        <h1 className="text-4xl font-semibold text-foreground">Getting Started</h1>
        <p className="text-muted-foreground mt-2">
          Learn how to navigate GeoQuery and run your first natural-language,
          map-based analysis.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            onClick={() => navigateTo("/dashboard")}
            className="bg-white text-foreground hover:bg-muted"
          >
            Open Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigateTo("/")}>
            Back to Home
          </Button>
        </div>
      </header>

      {/* Quick start */}
      <section className="grid md:grid-cols-3 gap-6">
        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <MapPin className="w-5 h-5" /> 1) Open the Dashboard
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Head to the main workspace where you’ll search, analyze and
              visualize.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/20 hover:bg-white/30"
              onClick={() => navigateTo("/dashboard")}
            >
              Go to /dashboard
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Search className="w-5 h-5" /> 2) Ask a Question
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Use natural language like “Show population density in California.”
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value="Show me population density in California"
                readOnly
                className="bg-white/90 text-foreground"
              />
              <Button className="bg-white text-foreground hover:bg-muted">Analyze</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="w-5 h-5" /> 3) Review Results
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              See stats, rankings, and insights. Export as PDF/PNG/CSV if
              needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-foreground">
            <FileText className="w-4 h-4" /> PDF
            <ImageIcon className="w-4 h-4" /> PNG
            <FileDown className="w-4 h-4" /> CSV
          </CardContent>
        </Card>
      </section>

      {/* UI Tour */}
      <section className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <PanelLeft className="w-5 h-5" /> Sidebar
            </CardTitle>
            <CardDescription>
              Where you type queries, browse suggestions, and revisit recent
              searches.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • <strong>Ask Your Question</strong>: enter a natural-language
              prompt and hit <em>Analyze</em>.
            </p>
            <p>
              • <strong>Suggested Queries</strong>: one-click starters to try
              the app quickly.
            </p>
            <p>
              • <strong>Recent Queries</strong>: click any past query to
              re-run.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Map className="w-5 h-5" /> Map & Layer Controls
            </CardTitle>
            <CardDescription>
              The canvas for geographic results with zoom/reset and toggleable
              layers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Use +/− to zoom and the home icon to reset view.</p>
            <p>
              • Toggle <em>Base Map</em>, <em>Satellite</em>, <em>Terrain</em>,
              and <em>Data Overlay</em> from the panel on the map.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="w-5 h-5" /> Results Panel
            </CardTitle>
            <CardDescription>
              Summary stats, top regions, and an insight callout appear here.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Export with the buttons on the right: PDF, PNG, or CSV.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Upload className="w-5 h-5" /> Upload (Optional)
            </CardTitle>
            <CardDescription>
              Bring your own datasets (GeoJSON, CSV, KML) via the <em>Import</em>{" "}
              page or “Upload Data” in the top nav.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" onClick={() => navigateTo("/upload")}>
              Open Import
            </Button>
            <Button onClick={() => navigateTo("/dashboard")}>
              Open Dashboard
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Make your first query */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <MousePointerClick className="w-5 h-5" /> Make Your First Query
            </CardTitle>
            <CardDescription>
              Follow these three steps to see results in seconds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <ol className="list-decimal ml-5 space-y-2">
              <li>
                Go to <Button variant="link" onClick={() => navigateTo("/dashboard")}>Dashboard</Button>.
              </li>
              <li>
                In the sidebar, type a prompt (e.g.,{" "}
                <em>“Population density by state”</em>) and click{" "}
                <strong>Analyze</strong>.
              </li>
              <li>
                Review the summary, top regions, and insights. Export if you
                need to share.
              </li>
            </ol>
            <div className="flex items-center gap-2 pt-2">
              <Sun className="w-4 h-4" /> / <Moon className="w-4 h-4" /> Toggle
              theme from the top-right any time.
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Sample queries */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Sample Queries</CardTitle>
            <CardDescription>
              Click any item to jump to the Dashboard and try it.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-3">
            {[
              "Population density by state",
              "Climate zones in North America",
              "Economic indicators by region",
              "Transportation networks",
              "Urban growth patterns in Australia",
              "Wildfire risk zones in California",
            ].map((q) => (
              <button
                key={q}
                onClick={() => navigateTo("/dashboard")}
                className="text-left px-4 py-3 rounded-md border hover:bg-accent transition-colors"
                title="Open Dashboard and paste this query"
              >
                {q}
              </button>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* FAQ */}
      <section className="grid md:grid-cols-2 gap-6">
        <FAQ
          question="Do I need GIS experience?"
          answer="No. GeoQuery is designed for natural-language exploration. Type your question as you would ask a colleague."
        />
        <FAQ
          question="Which file types can I upload?"
          answer="GeoJSON, CSV, and KML. Start from the Import page or the Upload action in the Dashboard."
        />
        <FAQ
          question="Why don’t I see a real map layer yet?"
          answer="This demo focuses on layout and UX. Your team will connect the actual map/tiles/data pipeline next."
        />
        <FAQ
          question="How do I switch themes?"
          answer="Use the sun/moon button in the top navigation to toggle between light and dark mode."
        />
      </section>
    </div>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <HelpCircle className="w-5 h-5" /> {question}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{answer}</CardContent>
    </Card>
  );
}
