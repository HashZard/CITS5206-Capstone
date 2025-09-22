import React, { useEffect, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { RowItem, VisualizationMode } from '@/types/result';
import { parseWKBGeometry, calculateCentroid } from '@/utils/geometry';
import { getVisualizationMode } from '@/utils/visualization';
import {
  renderAreaVisualization,
  renderCountriesVisualization,
  renderEconomyVisualization,
  renderTerrainVisualization,
  renderGeneralVisualization
} from './MapRenderers';

interface AdvancedMapCanvasProps {
  items: RowItem[];
  width?: number;
  height?: number;
  className?: string;
}

export const AdvancedMapCanvas: React.FC<AdvancedMapCanvasProps> = ({ 
  items, 
  width = 980, 
  height = 500, 
  className 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [selectedItem, setSelectedItem] = useState<RowItem | null>(null);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  
  const mode = getVisualizationMode(items);
  
  // 解析几何数据并提取坐标
  const processedItems = useMemo(() => {
    return items.map(item => {
      console.log('Processing item:', item.name, 'has geometry:', !!item.raw?.geometry);
      if (item.raw?.geometry) {
        const geometry = parseWKBGeometry(item.raw.geometry);
        console.log('Parsed geometry:', (geometry as any)?.type, geometry);
        const centroid = geometry ? calculateCentroid(geometry) : null;
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

  // 渲染函数
  const renderMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    
    // 应用缩放和平移
    ctx.save();
    ctx.translate(width / 2 + panX, height / 2 + panY);
    ctx.scale(zoom, zoom);
    ctx.translate(-width / 2, -height / 2);
    
    // 背景
    ctx.fillStyle = "#F1F5F9"; // slate-100
    ctx.fillRect(0, 0, width, height);
    
    // 网格
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
    
    // 根据不同模式渲染
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
    
    // 渲染选中项信息
    if (selectedItem) {
      renderSelectedInfo(ctx, selectedItem, width, height);
    }
  };

  // 渲染选中项信息
  const renderSelectedInfo = (ctx: CanvasRenderingContext2D, item: RowItem, _w: number, h: number) => {
    const infoText = `${item.name || 'Unknown'}`;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(10, h - 60, 200, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px system-ui';
    ctx.fillText(infoText, 20, h - 35);
  };

  // 鼠标事件处理
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 找到最近的数据点
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

  return (
    <div className="relative">
      {/* 地图控制按钮 */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => setZoom(z => Math.min(z * 1.2, 5))}
          className="p-2 bg-white/90 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          title="放大"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(z / 1.2, 0.5))}
          className="p-2 bg-white/90 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          title="缩小"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {setZoom(1); setPanX(0); setPanY(0); setSelectedItem(null);}}
          className="p-2 bg-white/90 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          title="重置视图"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      
      {/* 地图模式指示器 */}
      <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-md text-sm font-medium">
        {mode === 'area' && '📊 面积分布图'}
        {mode === 'countries' && '🌍 国家分布图'}
        {mode === 'economy' && '💰 经济热力图'}
        {mode === 'terrain' && '🏔️ 地形特征图'}
        {mode === 'general' && '📍 通用地图'}
        {mode === 'empty' && '⚪ 无数据'}
      </div>
      
      <canvas
        ref={canvasRef}
        style={{ width, height }}
        className={`border border-slate-200 rounded-xl cursor-crosshair ${className}`}
        onClick={handleCanvasClick}
      />
      
      {/* 图例 */}
      <MapLegend mode={mode} />
    </div>
  );
};

// 地图图例组件
const MapLegend: React.FC<{ mode: VisualizationMode }> = ({ mode }) => (
  <div className="mt-4 text-sm text-slate-600">
    {mode === 'area' && (
      <div className="flex items-center gap-4">
        <span>🔵 小面积区域</span>
        <span>🟡 中等面积区域</span>
        <span>🔴 大面积区域</span>
      </div>
    )}
    {mode === 'countries' && (
      <div className="flex items-center gap-4 flex-wrap">
        <span>🔴 亚洲</span>
        <span>🔵 欧洲</span>
        <span>🟢 非洲</span>
        <span>🟡 北美洲</span>
        <span>🟣 南美洲</span>
        <span>🩶 南极洲</span>
      </div>
    )}
    {mode === 'economy' && (
      <div className="flex items-center gap-4">
        <span>🟢 低GDP</span>
        <span>🟡 中等GDP</span>
        <span>🔴 高GDP</span>
      </div>
    )}
    {mode === 'terrain' && (
      <div className="flex items-center gap-4">
        <span>🔺 山峰</span>
        <span>🟤 山脉</span>
        <span>🟫 高原</span>
      </div>
    )}
  </div>
);
