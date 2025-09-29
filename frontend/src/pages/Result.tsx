/**
 * GeoQueryResults - Main component for the results page
 *
 * Purpose: display a complete results experience for a geographic query
 * - Accept a user query and call the backend API to get results
 * - Smart map visualization: automatically pick the best rendering mode
 * - Results: detailed explanation for a single item, card grid for multiple
 * - Interactions: copy, share, view technical details
 * - Error handling: friendly error messages and loading states
 *
 * Page layout:
 * 1. Glass Header (replaces old purple header)
 * 2. SuggestPanel: classification + similar questions (frontend-only, excluded from export)
 * 3. AdvancedMapCanvas: smart map visualization
 * 4. Single result: large reason block
 * 5. Multiple results: CountryCard grid
 * 6. AutoComparisonChart (NEW)
 * 7. ResultDataTable
 * 8. QueryDetails
 * 9. Toast
 */

"use client";

import React, { useEffect, useState } from "react";
import { RowItem, ToastState, MetaData, ApiError } from "@/types/result";
import { Toast } from "@/components/ui/Toast";
import { ExportButton } from "@/components/ui/ExportButton";
import ExportModal from "@/components/ui/ExportModal";
import { LoadingBar } from "@/components/ui/LoadingBar";
import {
  AdvancedMapCanvas,
  AdvancedMapCanvasControlsHandle,
} from "@/components/map/AdvancedMapCanvas";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { CountryCard } from "@/components/result/CountryCard";
import { QueryDetails } from "@/components/result/QueryDetails";
import { QueryService } from "@/services/queryService";
import ResultDataTable from "@/components/result/ResultDataTable";
// Similar suggestions panel (frontend-only)
import SuggestPanel from "@/components/result/SuggestPanel";
// NEW: Auto chart for any numeric metric
import AutoComparisonChart from "@/components/result/AutoComparisonChart";

interface GeoQueryResultsProps {
  query: string;
  testCase?: number;
}

const GeoQueryResults: React.FC<GeoQueryResultsProps> = ({ query, testCase }) => {
  const [items, setItems] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>({ message: "", isVisible: false });
  const [meta, setMeta] = useState<MetaData>({});

  const showToast = (message: string) => setToast({ message, isVisible: true });
  const hideToast = () => setToast({ message: "", isVisible: false });

  useEffect(() => {
    if (!query) return;

    const executeQuery = async () => {
      try {
        setLoading(true);

        // Ensure a minimum loading duration so the animation is visible
        const [queryResult] = await Promise.all([
          QueryService.executeQuery(query, testCase),
          new Promise((resolve) => setTimeout(resolve, 800)), // show at least 800ms
        ]);

        const { items: resultItems, meta: resultMeta } = queryResult;
        setItems(resultItems);
        setMeta(resultMeta);
      } catch (error: any) {
        const msg =
          (error?.response?.data as ApiError)?.detail ||
          error?.message ||
          "Query failed. Please try again.";
        showToast(msg);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    executeQuery();
  }, [query, testCase]);

  const exportTargetRef = React.useRef<HTMLDivElement>(null);
  const [isExportOpen, setExportOpen] = React.useState(false);
  const mapRef = React.useRef<AdvancedMapCanvasControlsHandle>(null);

  return (
    <div
      ref={exportTargetRef}
      /* Neutral/light surfaces & readable text in both themes */
      className="
        mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen
        bg-white dark:bg-white
        text-slate-800 dark:text-slate-800
        max-w-[1200px] lg:max-w-[1400px] xl:max-w-[1600px]
      "
    >
      {/* Loading progress bar */}
      <LoadingBar
        isLoading={loading}
        message="Analyzing your geographic query..."
        color="purple"
      />

      {/* =================== Glass Header (3D effect) =================== */}
      <header
        className="
          mb-8 rounded-3xl
          bg-gradient-to-br from-white/80 to-white/60
          backdrop-blur-md border border-slate-200
          shadow-[0_10px_30px_rgba(2,6,23,0.08)]
          p-6 md:p-8
        "
      >
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
          Search Results
        </h1>
        {query && (
          <p className="mt-2 text-slate-700 italic">
            “{query}”
          </p>
        )}
        {meta?.model && (
          <p className="mt-3 text-xs text-slate-500">model: {String(meta.model)}</p>
        )}
      </header>
      {/* =============================================================== */}

      {/* Question Insight + Similar Suggestions (frontend-only; EXCLUDED from export) */}
      <div data-export-ignore className="text-slate-800 dark:text-slate-800">
        <SuggestPanel
          query={query}
          onPickSuggestion={(text) => {
            try {
              const key = "demo_history";
              const raw = localStorage.getItem(key);
              const arr = raw ? JSON.parse(raw) : [];
              arr.unshift({ q: text, ts: Date.now() });
              localStorage.setItem(key, JSON.stringify(arr.slice(0, 50)));
              alert(`Saved suggestion:\n${text}`);
            } catch {}
          }}
        />
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="bg-slate-50 dark:bg-slate-50 rounded-2xl p-6 mb-12 border border-slate-200">
          <p className="text-slate-700 dark:text-slate-700">No results.</p>
        </div>
      )}

      {/* Smart map visualization */}
      {items.length >= 1 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-50 p-3 sm:p-4 relative mb-12">
          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 text-center mb-2">
            Interactive Geo Visualization
          </h2>

          {/* Badge + toolbar (EXCLUDED from export) */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            {/* Left: badge */}
            <div className="px-2 py-1 text-xs font-medium rounded-full bg-white dark:bg-white border border-slate-200 text-slate-700">
              Area Distribution
            </div>

            {/* Right: toolbar */}
            <div
              className="flex items-center gap-2 ml-auto [&_*]:transition-colors"
              data-export-ignore
            >
              <button
                aria-label="Zoom in"
                title="Zoom in"
                onClick={() => mapRef.current?.zoomIn()}
                className="
                  p-2 rounded-md
                  bg-white dark:bg-white
                  border border-slate-300 dark:border-slate-300
                  hover:bg-slate-50 dark:hover:bg-slate-50
                  focus:outline-none focus:ring-2 focus:ring-purple-500
                "
              >
                <ZoomIn className="w-4 h-4 text-slate-700" />
              </button>

              <button
                aria-label="Zoom out"
                title="Zoom out"
                onClick={() => mapRef.current?.zoomOut()}
                className="
                  p-2 rounded-md
                  bg-white dark:bg-white
                  border border-slate-300 dark:border-slate-300
                  hover:bg-slate-50 dark:hover:bg-slate-50
                  focus:outline-none focus:ring-2 focus:ring-purple-500
                "
              >
                <ZoomOut className="w-4 h-4 text-slate-700" />
              </button>

              <button
                aria-label="Reset view"
                title="Reset view"
                onClick={() => mapRef.current?.reset()}
                className="
                  p-2 rounded-md
                  bg-white dark:bg-white
                  border border-slate-300 dark:border-slate-300
                  hover:bg-slate-50 dark:hover:bg-slate-50
                  focus:outline-none focus:ring-2 focus:ring-purple-500
                "
              >
                <RotateCcw className="w-4 h-4 text-slate-700" />
              </button>

              {/* Export button surface kept visible in dark mode */}
              <div className="dark:[&_button]:bg-white dark:[&_button]:text-slate-800 dark:[&_button]:border-slate-300">
                <ExportButton onOpen={() => setExportOpen(true)} />
              </div>
            </div>
          </div>

          {/* Map */}
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

      {/* Single result → large reason block */}
      {items.length === 1 && (
        <div className="bg-slate-50 dark:bg-slate-50 rounded-2xl p-6 relative mb-12 border border-slate-200">
          {/* EXCLUDED Export button (single-result corner) */}
          <div className="absolute top-4 right-4" data-export-ignore>
            <div className="dark:[&_button]:bg-white dark:[&_button]:text-slate-800 dark:[&_button]:border-slate-300">
              <ExportButton onOpen={() => setExportOpen(true)} />
            </div>
          </div>
          <p className="text-slate-700 dark:text-slate-700 leading-relaxed pr-12">
            {items[0].reason ?? "No explanation available."}
          </p>
        </div>
      )}

      {/* Detailed Results */}
      {items.length >= 1 && (
        <>
          <h2 className="text-2xl font-semibold mb-6">Detailed Results</h2>
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

      {/* ===== NEW: Automatic comparison chart for any numeric metric ===== */}
      {items.length >= 2 && (
        <div className="mt-10 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Visual Comparison</h2>
          <AutoComparisonChart
            items={items as any[]}
            title="Auto-detected metric comparison"
            maxBars={25}
            // Optional nudges for common fields:
            preferredKeys={["gdp", "gdp_per_capita", "population", "area"]}
          />
        </div>
      )}
      {/* ================================================================== */}

      {/* Data table */}
      {items.length >= 1 && (
        <div className="mt-10 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Tabular Data</h2>
          <div className="bg-white dark:bg-white border border-slate-200 rounded-2xl p-3">
            <ResultDataTable items={items as any[]} />
          </div>
        </div>
      )}

      {/* SQL & Reasoning (kept readable in dark mode) */}
      <div className="bg-white dark:bg-white text-slate-800 dark:text-slate-800 border border-slate-200 rounded-2xl p-6">
        <QueryDetails meta={meta} />
      </div>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setExportOpen(false)}
        targetRef={exportTargetRef}
      />
      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
};

export default GeoQueryResults;
