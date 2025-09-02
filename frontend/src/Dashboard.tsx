// src/Dashboard.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Map as MapIcon,
  MapPin,
  Mic,
  Search,
  Plus,
  Minus,
  Home,
  User,
  FileText,
  Image as ImageIcon,
  FileDown,
  Lightbulb,
  BarChart3,
  Upload,
} from "lucide-react";

/**
 * Dashboard page (self-contained main content).
 * Matches the HTML you shared but implemented with your UI components.
 * NOTE: Top navigation & footer are handled by App.tsx globally.
 */
export default function Dashboard() {
  // upload modal
  const [uploadOpen, setUploadOpen] = useState(false);

  // query + simulated results
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<null | {
    featureCount: number;
    queryEcho: string;
    stats: { label: string; value: number | string }[];
    top: { name: string; value: number }[];
    insight: string;
  }>(null);

  // map layers
  const [layers, setLayers] = useState([
    { id: "base", label: "Base Map", checked: true },
    { id: "sat", label: "Satellite", checked: false },
    { id: "ter", label: "Terrain", checked: false },
    { id: "overlay", label: "Data Overlay", checked: false },
  ]);

  // sidebar history
  const [history] = useState([
    { id: "1", text: "California wildfire zones", time: "2 hours ago" },
    { id: "2", text: "Urban growth patterns", time: "Yesterday" },
    { id: "3", text: "Rainfall distribution 2023", time: "3 days ago" },
  ]);

  function processQuery(p: string) {
    if (!p.trim()) return;
    setRunning(true);
    // simulate analysis
    setTimeout(() => {
      setResult({
        featureCount: 1247,
        queryEcho: p,
        stats: [
          { label: "Total Regions", value: 52 },
          { label: "Avg Value", value: 847.3 },
          { label: "Max Value", value: 2341 },
          { label: "Min Value", value: 127 },
        ],
        top: [
          { name: "California", value: 2341 },
          { name: "Texas", value: 1987 },
          { name: "Florida", value: 1654 },
          { name: "New York", value: 1432 },
        ],
        insight:
          "The data shows a clear correlation between urban density and the queried metric. Coastal regions demonstrate 23% higher values compared to inland areas.",
      });
      setQuery("");
      setRunning(false);
    }, 800);
  }

  // Persist dark mode that TopNav sets (optional safety if user toggles theme elsewhere)
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Layout below the global TopNav */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        <aside className="w-80 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          {/* Header + Upload shortcut */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Ask Your Question
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadOpen(true)}
                title="Upload Data"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </div>

            <div className="relative">
              <Input
                placeholder="What would you like to know?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && processQuery(query)}
                className="pr-10 dark:bg-gray-700 dark:text-white"
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
                aria-label="Mic"
                type="button"
              >
                <Mic size={18} />
              </button>
            </div>
            <Button
              className="w-full mt-3"
              onClick={() => processQuery(query)}
              disabled={running || !query.trim()}
            >
              <Search size={16} className="mr-2" />
              Analyze
            </Button>
          </div>

          {/* Suggestions */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">
              SUGGESTED QUERIES
            </h4>
            <div className="space-y-2">
              {[
                "Population density by state",
                "Climate zones in North America",
                "Economic indicators by region",
                "Transportation networks",
              ].map((s) => (
                <button
                  key={s}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  onClick={() => processQuery(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* History */}
          <div className="p-6">
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">
              RECENT QUERIES
            </h4>
            <div className="space-y-3">
              {history.map((q) => (
                <div
                  key={q.id}
                  className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                  onClick={() => processQuery(q.text)}
                >
                  <div className="text-sm text-gray-800 dark:text-white">
                    {q.text}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {q.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main column */}
        <section className="flex-1 flex flex-col">
          {/* Map container */}
          <div className="flex-1 relative">
            <div className="absolute inset-0 rounded-lg m-4 shadow-lg overflow-hidden">
              {/* gradient background that mimics your .map-container light/dark */}
              <div className="w-full h-full flex items-center justify-center relative bg-gradient-to-br from-[hsl(var(--gradient-start))/0.15] to-[hsl(var(--gradient-end))/0.15] dark:from-[hsl(var(--gradient-end))/0.25] dark:to-[hsl(var(--primary))/0.25]">
                {!result && (
                  <div className="text-center text-gray-600 dark:text-gray-300">
                    <MapIcon size={56} className="mx-auto mb-4 opacity-50" />
                    <p className="text-xl">Interactive Map View</p>
                    <p className="text-sm opacity-75">
                      Ask a question to see geographic data visualization
                    </p>
                  </div>
                )}

                {/* Map controls */}
                <div className="absolute top-4 right-4 space-y-2">
                  <IconSquare>
                    <Plus size={16} />
                  </IconSquare>
                  <IconSquare>
                    <Minus size={16} />
                  </IconSquare>
                  <IconSquare>
                    <Home size={16} />
                  </IconSquare>
                </div>

                {/* Layers panel */}
                <Card className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-xs">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">
                    Map Layers
                  </h4>
                  <div className="space-y-2">
                    {layers.map((l) => (
                      <label key={l.id} className="flex items-center">
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={l.checked}
                          onChange={(e) =>
                            setLayers((xs) =>
                              xs.map((x) =>
                                x.id === l.id ? { ...x, checked: e.target.checked } : x
                              )
                            )
                          }
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {l.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </Card>

                {/* loading overlay */}
                {running && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="rounded-md bg-white dark:bg-gray-800 px-4 py-3 shadow">
                      <span className="text-sm text-gray-700 dark:text-gray-200">
                        Analyzing…
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results panel */}
          <div className="h-80 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Query Results
              </h3>
              <div className="flex space-x-2">
                <SmallBtn>
                  <FileText size={14} className="mr-1" />
                  PDF
                </SmallBtn>
                <SmallBtn>
                  <ImageIcon size={14} className="mr-1" />
                  PNG
                </SmallBtn>
                <SmallBtn>
                  <FileDown size={14} className="mr-1" />
                  CSV
                </SmallBtn>
              </div>
            </div>

            <div className="h-full overflow-y-auto">
              {!result ? (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-16">
                  <BarChart3 size={36} className="mx-auto mb-4 opacity-50" />
                  <p>Results will appear here after you submit a query</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                      Query: “{result.queryEcho}”
                    </h4>
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      Analysis complete. Found{" "}
                      {result.featureCount.toLocaleString()} relevant data points.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4 bg-gray-50 dark:bg-gray-700">
                      <h5 className="font-semibold text-gray-800 dark:text-white mb-2">
                        Summary Statistics
                      </h5>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                        {result.stats.map((s) => (
                          <div key={s.label} className="flex justify-between">
                            <span>{s.label}:</span>
                            <span>{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-4 bg-gray-50 dark:bg-gray-700">
                      <h5 className="font-semibold text-gray-800 dark:text-white mb-2">
                        Top Regions
                      </h5>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                        {result.top.map((r) => (
                          <div key={r.name} className="flex justify-between">
                            <span>{r.name}</span>
                            <span>{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h5 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center">
                      <Lightbulb size={18} className="mr-2" />
                      Insights
                    </h5>
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      {result.insight}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Upload Data Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Geospatial Data</DialogTitle>
            <DialogDescription>Supports GeoJSON, CSV, KML files</DialogDescription>
          </DialogHeader>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center mb-4">
            <ImageIcon className="mx-auto text-gray-400 mb-3" size={36} />
            <p className="text-gray-600 dark:text-gray-300 mb-1">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500">GeoJSON, CSV, KML</p>
            <input type="file" className="hidden" accept=".geojson,.csv,.kml" />
          </div>

          <DialogFooter className="flex gap-3">
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setUploadOpen(false)}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --- tiny in-file helpers to avoid over-splitting --- */

function IconSquare({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      {children}
    </button>
  );
}

function SmallBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors inline-flex items-center"
    >
      {children}
    </button>
  );
}
