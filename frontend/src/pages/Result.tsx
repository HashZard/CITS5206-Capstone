/**
 * GeoQueryResults - Main component for the results page
 * (unchanged description omitted for brevity)
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
import { convertToGeoJSONFallback, hasAnyGeographicInfo } from "@/utils/geoMapping";
import SuggestPanel from "@/components/result/SuggestPanel";
import AutoComparisonChart from "@/components/result/AutoComparisonChart";
 
interface GeoQueryResultsProps {
  query: string;
}
 
const GeoQueryResults: React.FC<GeoQueryResultsProps> = ({ query }) => {
  const [items, setItems] = useState<RowItem[]>([]);
  const [rawResults, setRawResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>({ message: "", isVisible: false });
  const [meta, setMeta] = useState<MetaData>({});
  const [hasGeometry, setHasGeometry] = useState(false);
 
  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, isVisible: true, type });
  const hideToast = () => setToast({ message: "", isVisible: false });
 
  const detectGeometry = (rows: RowItem[]): boolean => {
    if (!rows || rows.length === 0) return false;
    const raw = rows[0]?.raw;
    if (!raw) return false;
    return !!(
      raw.geometry ||
      raw.geom ||
      raw.wkb_geometry ||
      raw.center ||
      (raw.lon && raw.lat) ||
      (raw.lng && raw.lat) ||
      (raw.longitude && raw.latitude)
    );
  };
 
  useEffect(() => {
    if (!query) return;
 
    const executeQuery = async () => {
      try {
        setLoading(true);
 
        const [queryResult] = await Promise.all([
          QueryService.executeQuery(query),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ]);
 
        const {
          items: resultItems,
          rawResults: resultRawData,
          meta: resultMeta,
        } = queryResult;
 
        const hasGeo = detectGeometry(resultItems);
 
        let enhancedItems = resultItems;
        if (!hasGeo) {
          if (hasAnyGeographicInfo(resultRawData)) {
            const fallbackGeoJSON = convertToGeoJSONFallback(resultRawData);
            if (fallbackGeoJSON && fallbackGeoJSON.features) {
              enhancedItems = resultItems.map((item, index) => {
                const feature = fallbackGeoJSON.features[index];
                if (feature?.geometry) {
                  return {
                    ...item,
                    raw: {
                      ...item.raw,
                      _mapped_geometry: feature.geometry, // mark as mapped geometry
                    },
                  };
                }
                return item;
              });
              setHasGeometry(true);
            } else {
              setHasGeometry(false);
            }
          } else {
            setHasGeometry(false);
          }
        } else {
          setHasGeometry(true);
        }
 
        setItems(enhancedItems);
        setRawResults(resultRawData);
        setMeta(resultMeta);
 
        // Save for /rawvalue page
        try {
          sessionStorage.setItem(
            "geo:lastQuery",
            JSON.stringify({
              question: query,
              meta: resultMeta,
              results: resultRawData,
            })
          );
        } catch {}
      } catch (error: any) {
        let msg = "Query failed. Please try again.";
        if (error?.response) {
          const status = error.response.status;
          const detail = (error.response.data as ApiError)?.detail;
          const code = (error.response.data as any)?.code;
          if (detail) msg = `Error ${status}: ${detail}`;
          else if (code) msg = `Error ${status} (${code})`;
          else msg = `Server error ${status}: ${error.response.statusText || "Unknown error"}`;
          if (status === 500) {
            msg +=
              "\n\nPlease check:\n• Backend server is running\n• Database connection is available\n• LLM service is configured";
          }
        } else if (error?.request) {
          msg =
            "No response from server. Please check:\n• Backend is running on port 8000\n• Network connection is available";
        } else {
          msg = error?.message || msg;
        }
 
        showToast(msg, "error");
        setItems([]);
        setRawResults([]);
        setMeta({});
      } finally {
        setLoading(false);
      }
    };
 
    executeQuery();
  }, [query]);
 
  const exportTargetRef = React.useRef<HTMLDivElement>(null);
  const [isExportOpen, setExportOpen] = React.useState(false);
  const mapRef = React.useRef<AdvancedMapCanvasControlsHandle>(null);
 
  return (
    <div
      ref={exportTargetRef}
      className="
        mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen
        bg-white dark:bg-white
        text-slate-800 dark:text-slate-800
        max-w-[1200px] lg:max-w-[1400px] xl:max-w-[1600px]
      "
    >
      <LoadingBar isLoading={loading} message="Analyzing your geographic query..." color="purple" />
 
      {/* Header */}
      <header
        className="
          mb-8 rounded-3xl
          bg-gradient-to-br from-white/80 to-white/60
          backdrop-blur-md border border-slate-200
          shadow-[0_10px_30px_rgba(2,6,23,0.08)]
          p-6 md:p-8
        "
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Search Results</h1>
            {query && <p className="mt-2 text-slate-700 italic">“{query}”</p>}
            {meta?.model && (
              <p className="mt-3 text-xs text-slate-500">model: {String(meta.model)}</p>
            )}
          </div>
 
          {/* Link to Raw page */}
          <a
            href="/rawvalue"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm"
            title="See raw backend values"
          >
            View Raw
          </a>
        </div>
      </header>
 
      {/* Suggestions (frontend-only) */}
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
 
      {/* No geometry notice (but we will still render map below) */}
      {items.length >= 1 && !hasGeometry && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 mb-6">
          <div className="text-center text-slate-600">
            <p className="text-sm">
              ℹ️ This query returned data without geographic coordinates or geometry. The basemap
              is shown; result overlays may be limited.
            </p>
          </div>
        </div>
      )}
 
      {/* Smart map visualization — ALWAYS render when there are items */}
      {items.length >= 1 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 relative mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 text-center mb-2">
            Interactive Geo Visualization
          </h2>
 
          {/* Toolbar (excluded from export) */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="px-2 py-1 text-xs font-medium rounded-full bg-white border border-slate-200 text-slate-700">
              Basemap + Overlays
            </div>
 
            <div className="flex items-center gap-2 ml-auto [&_*]:transition-colors" data-export-ignore>
              <button
                aria-label="Zoom in"
                title="Zoom in"
                onClick={() => mapRef.current?.zoomIn()}
                className="
                  p-2 rounded-md
                  bg-white
                  border border-slate-300
                  hover:bg-slate-50
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
                  bg-white
                  border border-slate-300
                  hover:bg-slate-50
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
                  bg-white
                  border border-slate-300
                  hover:bg-slate-50
                  focus:outline-none focus:ring-2 focus:ring-purple-500
                "
              >
                <RotateCcw className="w-4 h-4 text-slate-700" />
              </button>
 
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
              basemapSrc="/world-light.jpg" // <-- ensure this image exists in /public
            />
          </div>
        </div>
      )}
 
      {/* Single result → large reason block */}
      {items.length === 1 && (
        <div className="bg-slate-50 dark:bg-slate-50 rounded-2xl p-6 relative mb-12 border border-slate-200">
          <div className="absolute top-4 right-4" data-export-ignore>
            <div className="dark:[&_button]:bg-white dark:[&_button]:text-slate-800 dark:[&_button]:border-slate-300">
              <ExportButton onOpen={() => setExportOpen(true)} />
            </div>
          </div>
          <div className="text-slate-700 dark:text-slate-700 leading-relaxed pr-12">
            <h3 className="text-lg font-semibold mb-3">Query Analysis</h3>
            <p className="whitespace-pre-wrap">
              {meta.reasoning || items[0].reason || "No explanation available."}
            </p>
          </div>
        </div>
      )}
 
      {/* Detailed results */}
      {items.length >= 1 && (
        <>
          <h2 className="text-2xl font-semibold mb-6">Detailed Results</h2>
          {items.length === 1 ? (
            <div className="flex justify-center">
              <div className="max-w-4xl w-full">
                <CountryCard key={items[0].id} item={items[0]} showMiniMap={true} onCopy={showToast} large />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {items.map((item) => (
                <CountryCard key={item.id} item={item} showMiniMap={true} onCopy={showToast} />
              ))}
            </div>
          )}
        </>
      )}
 
      {/* Auto comparison chart */}
      {items.length >= 2 && (
        <div className="mt-10 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Visual Comparison</h2>
          <AutoComparisonChart
            items={items as any[]}
            title="Auto-detected metric comparison"
            maxBars={25}
            preferredKeys={["area_km2", "population", "gdp", "gdp_per_capita", "pop_est", "gdp_md_est", "density"]}
          />
        </div>
      )}
 
      {/* Tabular data */}
      {rawResults.length >= 1 && (
        <div className="mt-10 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Tabular Data</h2>
          <div className="bg-white dark:bg-white border border-slate-200 rounded-2xl p-3">
            <ResultDataTable items={rawResults} />
          </div>
        </div>
      )}
 
      {/* Query details */}
      <div className="bg-white dark:bg-white text-slate-800 dark:text-slate-800 border border-slate-200 rounded-2xl p-6">
        <QueryDetails meta={meta} />
      </div>
 
      {/* Export modal + toasts */}
      <ExportModal isOpen={isExportOpen} onClose={() => setExportOpen(false)} targetRef={exportTargetRef} />
      <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} type={toast.type} />
    </div>
  );
};
 
export default GeoQueryResults;