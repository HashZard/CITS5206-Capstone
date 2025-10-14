/**
 * AdvancedMapCanvas — smart map visualization with zoom + pan (drag).
 *
 * Now with a world basemap: a light equirectangular image drawn UNDER the result features.
 * - Always visible basemap (if the image loads), even when there is no geometry in results.
 * - Same interactions: zoom/pan/reset/select
 */
 
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
} from "react";
import VerticalToolbar from "@/components/ui/VerticalToolbar";
import { RowItem, VisualizationMode } from "@/types/result";
import { parseWKBGeometry, calculateOptimalLabelAnchor } from "@/utils/geometry";
import { getVisualizationMode } from "@/utils/visualization";
import {
  renderAreaVisualization,
  renderCountriesVisualization,
  renderEconomyVisualization,
  renderTerrainVisualization,
  renderGeneralVisualization,
} from "./MapRenderers";
 
export interface AdvancedMapCanvasControlsHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}
 
interface AdvancedMapCanvasProps {
  items: RowItem[];
  width?: number;
  height?: number;
  className?: string;
  /** Show the internal right-docked toolbar (defaults to true) */
  showInternalToolbar?: boolean;
  /** Path to an equirectangular basemap image in /public (e.g. "/world-light.png") */
  basemapSrc?: string;
}
 
export const AdvancedMapCanvas = React.forwardRef<
  AdvancedMapCanvasControlsHandle,
  AdvancedMapCanvasProps
>(
  (
    {
      items,
      width = 980,
      height = 500,
      className,
      showInternalToolbar = true,
      basemapSrc = "/world-light.png",
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
 
    // Viewport state
    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [selectedItem, setSelectedItem] = useState<RowItem | null>(null);
 
    // Drag (pan) state
    const [isPanning, setIsPanning] = useState(false);
    const lastPointer = useRef<{ x: number; y: number } | null>(null);
 
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const mode = getVisualizationMode(items);
 
    // --- Basemap image (cached) ---
    const basemapImgRef = useRef<HTMLImageElement | null>(null);
    const [basemapReady, setBasemapReady] = useState(false);
    useEffect(() => {
      if (!basemapSrc) {
        setBasemapReady(false);
        basemapImgRef.current = null;
        return;
      }
      const img = new Image();
      img.decoding = "async";
      img.crossOrigin = "anonymous";
      img.onload = () => {
        basemapImgRef.current = img;
        setBasemapReady(true);
      };
      img.onerror = () => {
        basemapImgRef.current = null;
        setBasemapReady(false);
      };
      img.src = basemapSrc;
    }, [basemapSrc]);
 
    // Preprocess geometries (centroid etc.)
    const processedItems = useMemo(() => {
      return items.map((item) => {
        // 🗺️ Prioritize real geometry, fallback to mapped geometry
        const rawGeometry = item.raw?.geometry || item.raw?.geom || item.raw?.wkb_geometry;
        const mappedGeometry = item.raw?._mapped_geometry;
 
        if (rawGeometry) {
          // Real geometry data (WKB format)
          const geometry = parseWKBGeometry(rawGeometry);
          const centroid = geometry ? calculateOptimalLabelAnchor(geometry) : null;
          return {
            ...item,
            geometry,
            lat: centroid?.[0] ?? item.lat,
            lon: centroid?.[1] ?? item.lon,
          };
        } else if (mappedGeometry) {
          // Mapped geometry data (already in GeoJSON format)
          const centroid =
            mappedGeometry.type === "Point"
              ? [mappedGeometry.coordinates[1], mappedGeometry.coordinates[0]]
              : calculateOptimalLabelAnchor(mappedGeometry);
 
          return {
            ...item,
            geometry: mappedGeometry, // Use GeoJSON directly
            lat: centroid?.[0] ?? item.lat,
            lon: centroid?.[1] ?? item.lon,
          };
        }
 
        return item;
      });
    }, [items]);
 
    // Main render
    const renderMap = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
 
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
 
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);
 
      // Apply view transform: translate (center + pan), then scale, then translate back
      ctx.save();
      ctx.translate(width / 2 + panX, height / 2 + panY);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);
 
      // ----- Basemap (always visible if available) -----
      if (basemapReady && basemapImgRef.current) {
        // Draw full equirectangular image to canvas extent
        ctx.globalAlpha = 1; // fully visible; tweak to <1 if you want lighter basemap
        ctx.drawImage(basemapImgRef.current, 0, 0, width, height);
      } else {
        // Fallback: a soft background + graticule
        ctx.fillStyle = "#F1F5F9"; // slate-100
        ctx.fillRect(0, 0, width, height);
 
        ctx.strokeStyle = "#CBD5E1"; // slate-300
        ctx.lineWidth = 0.5;
        for (let lon = -180; lon <= 180; lon += 30) {
          const x = ((lon + 180) / 360) * width;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let lat = -90; lat <= 90; lat += 30) {
          const y = ((90 - lat) / 180) * height;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }
 
      // ----- Results overlay (if any) -----
      switch (mode) {
        case "area":
          renderAreaVisualization(ctx, processedItems, width, height);
          break;
        case "countries":
          renderCountriesVisualization(ctx, processedItems, width, height);
          break;
        case "economy":
          renderEconomyVisualization(ctx, processedItems, width, height);
          break;
        case "terrain":
          renderTerrainVisualization(ctx, processedItems, width, height);
          break;
        default:
          renderGeneralVisualization(ctx, processedItems, width, height);
      }
 
      ctx.restore();
 
      // Selected info overlay (screen space)
      if (selectedItem) {
        renderSelectedInfo(ctx, selectedItem, width, height);
      }
    };
 
    const renderSelectedInfo = (
      ctx: CanvasRenderingContext2D,
      item: RowItem,
      _w: number,
      h: number
    ) => {
      const infoText = `${item.name || "Unknown"}`;
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(10, h - 60, 220, 50);
      ctx.fillStyle = "#ffffff";
      ctx.font =
        "14px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial";
      ctx.fillText(infoText, 20, h - 30);
    };
 
    // Click to select nearest item
    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
 
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
 
      let closestItem: RowItem | null = null;
      let minDistance = Infinity;
 
      processedItems.forEach((item) => {
        if (typeof item.lat === "number" && typeof item.lon === "number") {
          const itemX = ((item.lon + 180) / 360) * width;
          const itemY = ((90 - item.lat) / 180) * height;
 
          // Apply the same transforms we used in drawing to get screen coords
          const tx = (itemX - width / 2) * zoom + (width / 2 + panX);
          const ty = (itemY - height / 2) * zoom + (height / 2 + panY);
 
          const dist = Math.hypot(x - tx, y - ty);
          if (dist < 18 && dist < minDistance) {
            minDistance = dist;
            closestItem = item;
          }
        }
      });
 
      setSelectedItem(closestItem);
    };
 
    // ----- PAN (drag) handlers -----
    const beginPan = (clientX: number, clientY: number) => {
      lastPointer.current = { x: clientX, y: clientY };
      setIsPanning(true);
    };
 
    const movePan = (clientX: number, clientY: number) => {
      if (!isPanning || !lastPointer.current) return;
      const dx = clientX - lastPointer.current.x;
      const dy = clientY - lastPointer.current.y;
 
      // Make pan feel consistent regardless of zoom level
      setPanX((p) => p + dx / zoom);
      setPanY((p) => p + dy / zoom);
 
      lastPointer.current = { x: clientX, y: clientY };
    };
 
    const endPan = () => {
      setIsPanning(false);
      lastPointer.current = null;
    };
 
    // Mouse events
    const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      beginPan(e.clientX, e.clientY);
    };
    const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) =>
      movePan(e.clientX, e.clientY);
    const onMouseUp = () => endPan();
    const onMouseLeave = () => endPan();
 
    // Touch events (single-finger pan)
    const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      beginPan(t.clientX, t.clientY);
    };
    const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      movePan(t.clientX, t.clientY);
    };
    const onTouchEnd = () => endPan();
    const onTouchCancel = () => endPan();
 
    // Render on changes
    useEffect(() => {
      renderMap();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processedItems, zoom, panX, panY, selectedItem, width, height, basemapReady]);
 
    // External controls
    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => setZoom((z) => Math.min(z * 1.2, 5)),
        zoomOut: () => setZoom((z) => Math.max(z / 1.2, 0.5)),
        reset: () => {
          setZoom(1);
          setPanX(0);
          setPanY(0);
          setSelectedItem(null);
        },
      }),
      []
    );
 
    return (
      <div className="relative w-full flex justify-center">
        {/* Right-docked vertical toolbar */}
        {showInternalToolbar && (
          <VerticalToolbar
            onZoomIn={() => setZoom((z) => Math.min(z * 1.2, 5))}
            onZoomOut={() => setZoom((z) => Math.max(z / 1.2, 0.5))}
            onRefresh={() => {
              setZoom(1);
              setPanX(0);
              setPanY(0);
              setSelectedItem(null);
            }}
          />
        )}
 
 
        <canvas
          ref={canvasRef}
          style={{ width, height, maxWidth: "100%" }}
          className={`border border-slate-200 rounded-xl ${
            isPanning ? "cursor-grabbing" : "cursor-grab"
          } ${className || ""}`}
          onClick={handleCanvasClick}
          // Mouse drag
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          // Touch drag
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchCancel}
        />
      </div>
    );
  }
);
 
AdvancedMapCanvas.displayName = "AdvancedMapCanvas";