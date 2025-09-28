/**
 * GeoQueryResults — main results page component (mock-aware)
 *
 * Responsibilities:
 * - Accept a user query and call the backend API to fetch results
 * - Smart map visualization using AdvancedMapCanvas
 * - ResultsTable: tabular view (always when items exist)
 * - Single result: large reason/explanation block
 * - Multiple results: CountryCard grid
 * - QueryDetails: SQL + reasoning
 * - Toast: action feedback
 */

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RowItem, ToastState, MetaData, ApiError } from "@/types/result";
import { Toast } from "@/components/ui/Toast";
import { ExportButton } from "@/components/ui/ExportButton";
import ExportModal from "@/components/ui/ExportModal";
import { LoadingBar } from "@/components/ui/LoadingBar";
import {
  AdvancedMapCanvas,
  AdvancedMapCanvasControlsHandle,
} from "@/components/map/AdvancedMapCanvas";
import { ZoomIn, ZoomOut, RotateCcw, Globe } from "lucide-react";
import { CountryCard } from "@/components/result/CountryCard";
import { ResultHeader } from "@/components/result/ResultHeader";
import { QueryDetails } from "@/components/result/QueryDetails";
import { QueryService } from "@/services/queryService";
import ResultsTable from "@/components/result/ResultsTable";

interface GeoQueryResultsProps {
  query: string;
  /** If provided by parent, it wins; otherwise we read ?tc= from URL */
  testCase?: number;
}

const GeoQueryResults: React.FC<GeoQueryResultsProps> = ({ query, testCase }) => {
  const initialTc = useMemo(() => {
    if (typeof testCase === "number") return testCase;
    const p = new URLSearchParams(window.location.search).get("tc");
    const n = p ? Number(p) : 1;
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [testCase]);

  const [mockCase, setMockCase] = useState<number>(initialTc);
  const [items, setItems] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>({ message: "", isVisible: false });
  const [meta, setMeta] = useState<MetaData>({});

  const showToast = (message: string) => setToast({ message, isVisible: true });
  const hideToast = () => setToast({ message: "", isVisible: false });

  // Keep ?tc= in the URL when user changes the mock case
  const updateQueryString = (tcValue: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tc", String(tcValue));
    window.history.replaceState({}, "", url.toString());
  };

  useEffect(() => {
    if (!query) return;

    const run = async () => {
      try {
        setLoading(true);
        const [result] = await Promise.all([
          QueryService.executeQuery(query, mockCase),
          new Promise((r) => setTimeout(r, 800)), // ensure the loading bar is visible briefly
        ]);
        setItems(result.items);
        setMeta(result.meta);
      } catch (error: any) {
        const msg =
          (error?.response?.data as ApiError)?.detail ||
          error?.message ||
          "Query failed, please try again";
        showToast(msg);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [query, mockCase]);

  const exportTargetRef = React.useRef<HTMLDivElement>(null);
  const [isExportOpen, setExportOpen] = React.useState(false);
  const mapRef = React.useRef<AdvancedMapCanvasControlsHandle>(null);

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
      <div 
        ref={exportTargetRef}
        className="relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen max-w-[1200px] lg:max-w-[1400px] xl:max-w-[1600px]"
      >
        <LoadingBar
          isLoading={loading}
          message="Analyzing your geographic query..."
          color="blue"
        />

        {/* Header + mock case picker */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <ResultHeader query={query} meta={meta} />
          <div className="shrink-0 flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30">
              <Globe className="w-4 h-4 text-blue-300" />
              <span className="text-blue-200 text-sm font-medium">Live Results</span>
            </div>
            <div>
              <label className="text-sm text-white/80 mr-2">Mock case</label>
              <select
                className="border border-white/30 rounded-md px-2 py-1 text-sm bg-white/10 text-white backdrop-blur-sm"
                value={mockCase}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setMockCase(next);
                  updateQueryString(next);
                }}
                title="Select mock test_case (backend /api/query/mock)"
              >
                {/* Adjust to match the number of cases in mock.json */}
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n} className="bg-gray-800">
                    #{n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* No results */}
        {items.length === 0 && !loading && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-12 border border-white/20">
            <p className="text-white/80 text-center text-lg">No results found for your query.</p>
          </div>
        )}

        {/* Map */}
        {items.length >= 1 && (
          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 sm:p-6 relative mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white text-center mb-4 bg-gradient-to-r from-blue-200 to-green-200 bg-clip-text text-transparent">
              Interactive Geo Visualization
            </h2>

            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              {/* Badge */}
              <div className="px-3 py-1 text-sm font-medium rounded-full bg-white/10 border border-white/20 text-white/90">
                Area Analysis
              </div>

              <div className="flex items-center gap-2 ml-auto" data-export-ignore>
                <button
                  aria-label="Zoom in"
                  title="Zoom in"
                  onClick={() => mapRef.current?.zoomIn()}
                  className="p-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-200"
                >
                  <ZoomIn className="w-4 h-4 text-white" />
                </button>
                <button
                  aria-label="Zoom out"
                  title="Zoom out"
                  onClick={() => mapRef.current?.zoomOut()}
                  className="p-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-200"
                >
                  <ZoomOut className="w-4 h-4 text-white" />
                </button>
                <button
                  aria-label="Reset view"
                  title="Reset view"
                  onClick={() => mapRef.current?.reset()}
                  className="p-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-200"
                >
                  <RotateCcw className="w-4 h-4 text-white" />
                </button>
                <ExportButton onOpen={() => setExportOpen(true)} />
              </div>
            </div>

            <div className="w-full flex justify-center">
              <AdvancedMapCanvas
                ref={mapRef}
                items={items}
                width={1200}
                height={560}
                showInternalToolbar={false}
              />
            </div>
          </div>
        )}

        {/* Tabular results (always when items exist) */}
        {items.length >= 1 && (
          <div className="mb-12">
            <ResultsTable rows={items} title="Tabular Results" />
          </div>
        )}

        {/* Single item explanation */}
        {items.length === 1 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 relative mb-12 border border-white/20">
            <div className="absolute top-4 right-4">
              <ExportButton onOpen={() => setExportOpen(true)} />
            </div>
            <p className="text-white/80 leading-relaxed pr-12">
              {items[0].reason ?? "No explanation available"}
            </p>
          </div>
        )}

        {/* Detailed results */}
        {items.length >= 1 && (
          <>
            <h2 className="text-2xl font-semibold mb-6 text-white">Detailed Results</h2>
            {items.length === 1 ? (
              <div className="flex justify-center">
                <div className="max-w-4xl w-full">
                  <CountryCard
                    key={items[0].id}
                    item={items[0]}
                    showMiniMap={true}
                    onCopy={showToast}
                    large
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {items.map((item) => (
                  <CountryCard
                    key={item.id}
                    item={item}
                    showMiniMap={true}
                    onCopy={showToast}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* SQL & Reasoning */}
        <QueryDetails meta={meta} />

        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setExportOpen(false)}
          targetRef={exportTargetRef}
        />
        <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} />
      </div>
    </div>
  );
};

export default GeoQueryResults;