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
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
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
    <div
      ref={exportTargetRef}
      className="mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-white max-w-[1200px] lg:max-w-[1400px] xl:max-w-[1600px]"
    >
      <LoadingBar
        isLoading={loading}
        message="Analyzing your geographic query..."
        color="purple"
      />

      {/* Header + mock case picker */}
      <div className="flex items-center justify-between gap-4">
        <ResultHeader query={query} meta={meta} />
        <div className="shrink-0">
          <label className="text-sm text-slate-600 mr-2">Mock case</label>
          <select
            className="border rounded-md px-2 py-1 text-sm"
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
              <option key={n} value={n}>
                #{n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* No results */}
      {items.length === 0 && (
        <div className="bg-slate-50 rounded-2xl p-6 mb-12">
          <p className="text-slate-700">No results.</p>
        </div>
      )}

      {/* Map */}
      {items.length >= 1 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 relative mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 text-center mb-2">
            Interactive Geo Visualization
          </h2>

          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            {/* Badge */}
            <div className="px-2 py-1 text-xs font-medium rounded-full bg-white border border-slate-200 text-slate-700">
              Area Analysis
            </div>

            <div className="flex items-center gap-2 ml-auto" data-export-ignore>
              <button
                aria-label="Zoom in"
                title="Zoom in"
                onClick={() => mapRef.current?.zoomIn()}
                className="p-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <ZoomIn className="w-4 h-4 text-slate-700" />
              </button>
              <button
                aria-label="Zoom out"
                title="Zoom out"
                onClick={() => mapRef.current?.zoomOut()}
                className="p-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <ZoomOut className="w-4 h-4 text-slate-700" />
              </button>
              <button
                aria-label="Reset view"
                title="Reset view"
                onClick={() => mapRef.current?.reset()}
                className="p-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <RotateCcw className="w-4 h-4 text-slate-700" />
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
        <div className="bg-slate-50 rounded-2xl p-6 relative mb-12">
          <div className="absolute top-4 right-4">
            <ExportButton onOpen={() => setExportOpen(true)} />
          </div>
          <p className="text-slate-700 leading-relaxed pr-12">
            {items[0].reason ?? "No explanation available"}
          </p>
        </div>
      )}

      {/* Detailed results */}
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

      {/* SQL & Reasoning */}
      <QueryDetails meta={meta} />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setExportOpen(false)}
        targetRef={exportTargetRef}
      />
      <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} />
    </div>
  );
};

export default GeoQueryResults;
