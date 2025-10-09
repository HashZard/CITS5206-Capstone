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
import { convertToGeoJSONFallback, hasAnyGeographicInfo } from "@/utils/geoMapping";
// Similar suggestions panel (frontend-only)
import SuggestPanel from "@/components/result/SuggestPanel";
// NEW: Auto chart for any numeric metric
import AutoComparisonChart from "@/components/result/AutoComparisonChart";

interface GeoQueryResultsProps {
  query: string;
}

const GeoQueryResults: React.FC<GeoQueryResultsProps> = ({ query }) => {
  const [items, setItems] = useState<RowItem[]>([]);
  const [rawResults, setRawResults] = useState<any[]>([]);  // 原始后端数据
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>({ message: "", isVisible: false });
  const [meta, setMeta] = useState<MetaData>({});
  const [hasGeometry, setHasGeometry] = useState(false);  // 🗺️ 几何探测结果

  const showToast = (message: string, type: 'success' | 'error' = 'success') => 
    setToast({ message, isVisible: true, type });
  const hideToast = () => setToast({ message: "", isVisible: false });

  // 🔍 几何字段探测函数（优先级顺序）
  const detectGeometry = (items: RowItem[]): boolean => {
    if (!items || items.length === 0) return false;
    
    // 检查第一行是否有任何几何数据
    const firstItem = items[0];
    const raw = firstItem?.raw;
    
    if (!raw) return false;
    
    // 探测顺序：geometry (EWKB/WKB) → geom → center → lon+lat
    const hasGeometryField = !!(
      raw.geometry || 
      raw.geom || 
      raw.wkb_geometry || 
      raw.center || 
      (raw.lon && raw.lat) || 
      (raw.lng && raw.lat) || 
      (raw.longitude && raw.latitude)
    );
    
    console.log('🔍 Geometry detection:', {
      hasGeometry: hasGeometryField,
      fields: Object.keys(raw).filter(k => 
        k.includes('geom') || k.includes('center') || 
        ['lon', 'lat', 'lng', 'latitude', 'longitude'].includes(k)
      )
    });
    
    return hasGeometryField;
  };

  useEffect(() => {
    if (!query) return;

    const executeQuery = async () => {
      try {
        setLoading(true);

        // Ensure a minimum loading duration so the animation is visible
        const [queryResult] = await Promise.all([
          QueryService.executeQuery(query),
          new Promise((resolve) => setTimeout(resolve, 800)), // show at least 800ms
        ]);

        const { items: resultItems, rawResults: resultRawData, meta: resultMeta } = queryResult;
        
        // 🔍 探测几何字段
        const hasGeo = detectGeometry(resultItems);
        
        // 🗺️ 地理映射回退系统
        let enhancedItems = resultItems;
        if (!hasGeo) {
          console.warn('⚠️ No real geometry detected, attempting geographic name mapping...');
          
          // 检查是否有地理信息（地名或坐标）
          if (hasAnyGeographicInfo(resultRawData)) {
            const fallbackGeoJSON = convertToGeoJSONFallback(resultRawData);
            
            if (fallbackGeoJSON && fallbackGeoJSON.features) {
              // 将映射的几何数据添加到 items
              enhancedItems = resultItems.map((item, index) => {
                const feature = fallbackGeoJSON.features[index];
                if (feature && feature.geometry) {
                  return {
                    ...item,
                    raw: {
                      ...item.raw,
                      _mapped_geometry: feature.geometry  // 使用特殊字段名避免冲突
                    }
                  };
                }
                return item;
              });
              
              console.log(`✅ Enhanced ${enhancedItems.length} items with mapped geometries`);
              setHasGeometry(true);  // 标记为有几何数据（映射的）
            } else {
              console.warn('⚠️ Geographic mapping failed, map will be hidden');
              setHasGeometry(false);
            }
          } else {
            console.warn('⚠️ No geographic information found (no names, no coordinates)');
            setHasGeometry(false);
          }
        } else {
          console.log('✅ Using real geometry from backend');
          setHasGeometry(true);
        }
        
        setItems(enhancedItems);
        setRawResults(resultRawData);  // 保存原始数据
        setMeta(resultMeta);
      } catch (error: any) {
        console.error('❌ Query execution failed:', error);
        
        // 构建详细的错误消息
        let msg = "Query failed. Please try again.";
        
        if (error?.response) {
          // HTTP 错误响应
          const status = error.response.status;
          const detail = (error.response.data as ApiError)?.detail;
          const code = (error.response.data as any)?.code;
          
          if (detail) {
            msg = `Error ${status}: ${detail}`;
          } else if (code) {
            msg = `Error ${status} (${code})`;
          } else {
            msg = `Server error ${status}: ${error.response.statusText || 'Unknown error'}`;
          }
          
          // 特殊处理 500 错误
          if (status === 500) {
            msg += "\n\nPlease check:\n• Backend server is running\n• Database connection is available\n• LLM service is configured";
          }
        } else if (error?.request) {
          // 请求发送了但没有收到响应
          msg = "No response from server. Please check:\n• Backend is running on port 8000\n• Network connection is available";
        } else {
          // 其他错误
          msg = error?.message || msg;
        }
        
        showToast(msg, 'error');
        setItems([]);
        setRawResults([]);  // 清空原始数据
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

      {/* 🗺️ 无几何数据提示 - 优雅降级 */}
      {items.length >= 1 && !hasGeometry && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 mb-12">
          <div className="text-center text-slate-600">
            <p className="text-sm">
              ℹ️ This query returned data without geographic coordinates or geometry.
              <br />
              The map visualization is not available, but you can view the data in the table below.
            </p>
          </div>
        </div>
      )}

      {/* Smart map visualization - 🔍 条件渲染：仅当有几何数据时显示 */}
      {items.length >= 1 && hasGeometry && (
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
          <div className="text-slate-700 dark:text-slate-700 leading-relaxed pr-12">
            <h3 className="text-lg font-semibold mb-3">Query Analysis</h3>
            <p className="whitespace-pre-wrap">
              {meta.reasoning || items[0].reason || "No explanation available."}
            </p>
          </div>
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
            // Optional nudges for common geographic/economic fields:
            preferredKeys={["area_km2", "population", "gdp", "gdp_per_capita", "pop_est", "gdp_md_est", "density"]}
          />
        </div>
      )}
      {/* ================================================================== */}

      {/* Data table */}
      {rawResults.length >= 1 && (
        <div className="mt-10 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Tabular Data</h2>
          <div className="bg-white dark:bg-white border border-slate-200 rounded-2xl p-3">
            <ResultDataTable items={rawResults} />
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
        type={toast.type}
      />
    </div>
  );
};

export default GeoQueryResults;
