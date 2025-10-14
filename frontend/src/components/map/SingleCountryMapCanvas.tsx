/**
 * SingleCountryMapCanvas — minimal single-feature renderer
 *
 * Renders ONLY the filled geometry area (no background, grid, labels, or strokes).
 * - Fits the feature to the canvas with a small padding.
 * - Supports WKB geometry (geometry/geom/wkb_geometry) and GeoJSON fallback (_mapped_geometry).
 */
 
import React, { useEffect, useMemo, useRef } from "react";
import { RowItem } from "@/types/result";
import {
  parseWKBGeometry,
  calculateOptimalLabelAnchor,
  getFitTransform,
} from "@/utils/geometry";
 
interface SingleCountryMapCanvasProps {
  item: RowItem;
  width?: number;
  height?: number;
  className?: string;
  /** Fill color for the geometry */
  fillColor?: string; // default "#7C3AED" (purple)
  /** Padding in CSS px around the feature when fitting to the canvas */
  padding?: number; // default 8
}
 
export const SingleCountryMapCanvas: React.FC<SingleCountryMapCanvasProps> = ({
  item,
  width = 520,
  height = 180,
  className,
  fillColor = "#6cb7f5ff",
  padding = 8,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
 
  // Prepare a single geometry from WKB or mapped GeoJSON
  const processed = useMemo(() => {
    const raw = item.raw ?? {};
    const wkb = raw.geometry || raw.geom || raw.wkb_geometry;
    const mapped = raw._mapped_geometry;
 
    if (wkb) {
      const geometry = parseWKBGeometry(wkb);
      const centroid = geometry
        ? calculateOptimalLabelAnchor(geometry)
        : null;
      return { geometry, lat: centroid?.[0] ?? item.lat, lon: centroid?.[1] ?? item.lon };
    }
    if (mapped) {
      const geometry = mapped;
      const centroid =
        geometry.type === "Point"
          ? [geometry.coordinates[1], geometry.coordinates[0]]
          : calculateOptimalLabelAnchor(geometry);
      return { geometry, lat: centroid?.[0] ?? item.lat, lon: centroid?.[1] ?? item.lon };
    }
    return { geometry: null as any, lat: item.lat, lon: item.lon };
  }, [item]);
 
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
 
    // Use actual CSS size; maintain pixel clarity with DPR
    const rect = canvas.getBoundingClientRect();
    const viewW = Math.max(1, Math.floor(rect.width) || width);
    const viewH = Math.max(1, Math.floor(rect.height) || height);
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
 
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
 
    // Transparent canvas; no background fill
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, viewW, viewH);
 
    const geom: any = processed.geometry;
    if (!geom) {
      // Nothing to draw
      return;
    }
 
    // Fit geometry to canvas with minimal padding
    const { scale, tx, ty, normalizedGeometry } = getFitTransform(geom, {
      width: viewW,
      height: viewH,
      padding: Math.max(0, padding),
    });
 
    // lon/lat -> canvas px (equirectangular)
    const project = (coord: [number, number]) => {
      const [lon, lat] = coord;
      const x = ((lon + 180) / 360) * viewW;
      const y = ((90 - lat) / 180) * viewH;
      return [x, y] as const;
    };
 
    // Draw ONLY filled geometry (no stroke)
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);
    ctx.fillStyle = fillColor;
 
    const drawPoly = (rings: [number, number][][]) => {
      ctx.beginPath();
      rings.forEach((ring) => {
        ring.forEach(([lon, lat], i) => {
          const [px, py] = project([lon, lat]);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
      });
      ctx.fill("evenodd");
    };
 
    switch (normalizedGeometry.type) {
      case "Point": {
        const [lon, lat] = normalizedGeometry.coordinates;
        const [cx, cy] = project([lon, lat]);
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "MultiPoint": {
        normalizedGeometry.coordinates.forEach(([lon, lat]: [number, number]) => {
          const [cx, cy] = project([lon, lat]);
          ctx.beginPath();
          ctx.arc(cx, cy, 3, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
      }
      case "LineString": {
        ctx.beginPath();
        normalizedGeometry.coordinates.forEach(
          ([lon, lat]: [number, number], i: number) => {
            const [px, py] = project([lon, lat]);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
        );
        // Fill a line would do nothing; draw a thin filled strip instead:
        // To keep "only filled area" spirit, we can emulate with small circles on vertices
        // but simplest is do nothing; line features will be very thin.
        ctx.lineWidth = 0; // no stroke
        // no fill needed for lines
        break;
      }
      case "MultiLineString": {
        // same comment as LineString
        // intentionally no stroke to keep "filled only"
        break;
      }
      case "Polygon": {
        drawPoly(normalizedGeometry.coordinates);
        break;
      }
      case "MultiPolygon": {
        normalizedGeometry.coordinates.forEach(
          (poly: [number, number][][]) => drawPoly(poly)
        );
        break;
      }
      default:
        // do nothing for unknown types
        break;
    }
 
    ctx.restore();
  };
 
  useEffect(() => {
    render();
  }, [processed, width, height, fillColor, padding]);
 
  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={`rounded-lg ${className || ""}`}
    />
  );
};