/**
 * AdvancedMapCanvas 高级地图画布组件
 * 
 * 功能：智能地图可视化的核心组件
 * - 自动识别数据类型，选择最佳可视化模式（面积/国家/经济/地形/通用）
 * - 解析WKB几何数据，渲染真实国家边界
 * - 交互功能：缩放、平移、重置、点击选择
 * - 支持4种专业可视化模式：
 *   • 面积分布图：按国家面积大小着色
 *   • 国家分布图：按大洲分类着色  
 *   • 经济热力图：按GDP水平着色
 *   • 地形特征图：按地理特征着色
 * - 动态图例和模式指示器
 * 
 * 使用场景：查询结果的主要地图展示区域
 */

import React, { useEffect, useMemo, useRef, useState, useImperativeHandle } from "react";
// toolbar icons are encapsulated inside VerticalToolbar
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
  showInternalToolbar?: boolean; // 是否显示内部右侧垂直工具栏（默认显示）
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
  
  // 解析几何数据并提取坐标
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

  // 暴露外部控制句柄
  useImperativeHandle(ref, () => ({
    zoomIn: () => setZoom(z => Math.min(z * 1.2, 5)),
    zoomOut: () => setZoom(z => Math.max(z / 1.2, 0.5)),
    reset: () => { setZoom(1); setPanX(0); setPanY(0); setSelectedItem(null); }
  }), []);

  return (
    <div className="relative w-full flex justify-center">
      {/* 垂直工具栏（右侧停靠） */}
      {showInternalToolbar && (
        <VerticalToolbar
          onZoomIn={() => setZoom(z => Math.min(z * 1.2, 5))}
          onZoomOut={() => setZoom(z => Math.max(z / 1.2, 0.5))}
          onRefresh={() => { setZoom(1); setPanX(0); setPanY(0); setSelectedItem(null); }}
        />
      )}
      
      {/* 地图模式指示器 */}
      <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-md text-sm font-medium">
        {mode === 'countries' && '🌍 国家分布图'}
        {mode === 'economy' && '💰 经济热力图'}
        {mode === 'terrain' && '🏔️ 地形特征图'}
        {mode === 'general' && '📍 通用地图'}
        {mode === 'empty' && '⚪ 无数据'}
      </div>
      
      <canvas
        ref={canvasRef}
        style={{ width, height, maxWidth: '100%' }}
        className={`border border-slate-200 rounded-xl cursor-crosshair ${className}`}
        onClick={handleCanvasClick}
      />
      
      {/* 图例 */}
      <MapLegend mode={mode} />
    </div>
  );
});

AdvancedMapCanvas.displayName = 'AdvancedMapCanvas';

// 地图图例组件
const MapLegend: React.FC<{ mode: VisualizationMode }> = ({ mode }) => (
  <div className="mt-4 text-sm text-slate-600">
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
