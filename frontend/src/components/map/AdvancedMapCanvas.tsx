/**
 * AdvancedMapCanvas — advanced map canvas component
 *
 * What it does (smart visualization core):
 * - Detects data type and picks the best visualization mode (area / countries / economy / terrain / general)
 * - Parses WKB geometry to render real boundaries
 * - Interactions: zoom, pan, reset, click-to-select
 * - Four professional visualization modes:
 *   • Area distribution: color by country area size
 *   • Country distribution: color by continent
 *   • Economic heatmap: color by GDP level
 *   • Terrain features: color by geographic feature type
 * - Dynamic legend and mode indicator
 *
 * Usage: main map display area for query results
 */

import React, { useEffect, useMemo, useRef, useState, useImperativeHandle } from "react";
// Toolbar icons are encapsulated inside VerticalToolbar
import VerticalToolbar from '@/components/ui/VerticalToolbar';
import { RowItem, VisualizationMode } from '@/types/result';
import { parseWKBGeometry, calculateOptimalLabelAnchor } from '@/utils/geometry';
import { getVisualizationMode } from '@/utils/visualization';
import {
  renderAreaVisualization,
  renderCountriesVisualization,
  renderEconomyVisualization,
  renderTerrainVisualization,
  renderGeneralVisualization
} from './MapRenderers';

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
  // Whether to show the internal right-docked vertical toolbar (default: true)
  showInternalToolbar?: boolean;
}

export const AdvancedMapCanvas = React.forwardRef<AdvancedMapCanvasControlsHandle, AdvancedMapCanvasProps>(({ 
  items,
  width = 980,
  height = 500,
  className,
  showInternalToolbar = true
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [selectedItem, setSelectedItem] = useState<RowItem | null>(null);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  
  const mode = getVisualizationMode(items);
  
  // Parse geometry and extract coordinates
  const processedItems = useMemo(() => {
    return items.map(item => {
      console.log('Processing item:', item.name, 'has geometry:', !!item.raw?.geometry);
      if (item.raw?.geometry) {
        const geometry = parseWKBGeometry(item.raw.geometry);
        console.log('Parsed geometry:', (geometry as any)?.type, geometry);
        const centroid = geometry ? calculateOptimalLabelAnchor(geometry) : null;
        console.log('Calculated centroid:', centroid);
        return {
          ...item,
          geometry,
          lat: centroid?.[0] || item.lat,
          lon: centroid?.[1] || item.lon,
        };
      }
      console.log('Item final coords:', item.lat, item.lon);
      return item;
    });
  }, [items]);

  // Render function
  const renderMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    
    // Apply zoom and pan
    ctx.save();
    ctx.translate(width / 2 + panX, height / 2 + panY);
    ctx.scale(zoom, zoom);
    ctx.translate(-width / 2, -height / 2);
    
    // Background
    ctx.fillStyle = "#F1F5F9"; // slate-100
    ctx.fillRect(0, 0, width, height);
    
    // Grid
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
    
    // Render by visualization mode
    console.log('Rendering mode:', mode, 'with', processedItems.length, 'processed items');
    switch (mode) {
      case 'area':
        renderAreaVisualization(ctx, processedItems, width, height);
        break;
      case 'countries':
        renderCountriesVisualization(ctx, processedItems, width, height);
        break;
      case 'economy':
        renderEconomyVisualization(ctx, processedItems, width, height);
        break;
      case 'terrain':
        renderTerrainVisualization(ctx, processedItems, width, height);
        break;
      default:
        renderGeneralVisualization(ctx, processedItems, width, height);
    }
    
    ctx.restore();
    
    // Selected item info
    if (selectedItem) {
      renderSelectedInfo(ctx, selectedItem, width, height);
    }
  };

  // Draw selected item info box
  const renderSelectedInfo = (ctx: CanvasRenderingContext2D, item: RowItem, _w: number, h: number) => {
    const infoText = `${item.name || 'Unknown'}`;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(10, h - 60, 200, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px system-ui';
    ctx.fillText(infoText, 20, h - 35);
  };

  // Mouse click handler — find nearest point
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    let closestItem: RowItem | null = null;
    let minDistance = Infinity;
    
    processedItems.forEach(item => {
      if (typeof item.lat === 'number' && typeof item.lon === 'number') {
        const itemX = ((item.lon + 180) / 360) * width;
        const itemY = ((90 - item.lat) / 180) * height;
        const distance = Math.sqrt((x - itemX) ** 2 + (y - itemY) ** 2);
        
        if (distance < 20 && distance < minDistance) {
          minDistance = distance;
          closestItem = item;
        }
      }
    });
    
    setSelectedItem(closestItem);
  };

  useEffect(() => {
    renderMap();
  }, [processedItems, zoom, panX, panY, selectedItem, width, height]);

  // Expose external controls
  useImperativeHandle(ref, () => ({
    zoomIn: () => setZoom(z => Math.min(z * 1.2, 5)),
    zoomOut: () => setZoom(z => Math.max(z / 1.2, 0.5)),
    reset: () => { setZoom(1); setPanX(0); setPanY(0); setSelectedItem(null); }
  }), []);

  return (
    <div className="relative w-full flex justify-center">
      {/* Right-docked vertical toolbar */}
      {showInternalToolbar && (
        <VerticalToolbar
          onZoomIn={() => setZoom(z => Math.min(z * 1.2, 5))}
          onZoomOut={() => setZoom(z => Math.max(z / 1.2, 0.5))}
          onRefresh={() => { setZoom(1); setPanX(0); setPanY(0); setSelectedItem(null); }}
        />
      )}
      
      {/* Mode indicator */}
      <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-md text-sm font-medium">
        {mode === 'countries' && '🌍 Country distribution'}
        {mode === 'economy' && '💰 Economic heatmap'}
        {mode === 'terrain' && '🏔️ Terrain features'}
        {mode === 'general' && '📍 General map'}
        {mode === 'empty' && '⚪ No data'}
      </div>
      
      <canvas
        ref={canvasRef}
        style={{ width, height, maxWidth: '100%' }}
        className={`border border-slate-200 rounded-xl cursor-crosshair ${className ?? ''}`}
        onClick={handleCanvasClick}
      />
      
      {/* Legend */}
      <MapLegend mode={mode} />
    </div>
  );
});

AdvancedMapCanvas.displayName = 'AdvancedMapCanvas';

// Map legend component
const MapLegend: React.FC<{ mode: VisualizationMode }> = ({ mode }) => (
  <div className="mt-4 text-sm text-slate-600">
    {mode === 'countries' && (
      <div className="flex items-center gap-4 flex-wrap">
        <span>🔴 Asia</span>
        <span>🔵 Europe</span>
        <span>🟢 Africa</span>
        <span>🟡 North America</span>
        <span>🟣 South America</span>
        <span>🩶 Antarctica</span>
      </div>
    )}
    {mode === 'economy' && (
      <div className="flex items-center gap-4">
        <span>🟢 Low GDP</span>
        <span>🟡 Medium GDP</span>
        <span>🔴 High GDP</span>
      </div>
    )}
    {mode === 'terrain' && (
      <div className="flex items-center gap-4">
        <span>🔺 Peaks</span>
        <span>🟤 Mountain ranges</span>
        <span>🟫 Plateaus</span>
      </div>
    )}
  </div>
);
