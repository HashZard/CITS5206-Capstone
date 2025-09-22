import React, { useEffect, useMemo, useRef } from "react";
import { RowItem } from '@/types/result';
import { parseWKBGeometry, calculateCentroid, getBounds, drawGeometryWithProjection } from '@/utils/geometry';
import { formatArea, formatGDP, continentColors } from '@/utils/visualization';

interface SingleCountryMapCanvasProps {
  item: RowItem;
  width?: number;
  height?: number;
  className?: string;
}

export const SingleCountryMapCanvas: React.FC<SingleCountryMapCanvasProps> = ({ 
  item, 
  width = 520, 
  height = 180, 
  className 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  
  // 处理几何数据
  const processedItem = useMemo(() => {
    if (item.raw?.geometry) {
      const geometry = parseWKBGeometry(item.raw.geometry);
      const centroid = geometry ? calculateCentroid(geometry) : null;
      return {
        ...item,
        geometry,
        lat: centroid?.[0] || item.lat,
        lon: centroid?.[1] || item.lon,
      };
    }
    return item;
  }, [item]);

  // 渲染单国家地图
  const renderSingleCountryMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    
    // 背景
    ctx.fillStyle = "#F8FAFC"; // slate-50
    ctx.fillRect(0, 0, width, height);
    
    if (processedItem.geometry) {
      const bounds = getBounds(processedItem.geometry);
      
      if (bounds) {
        // 自定义投影函数 - 基于几何边界自动缩放
        const projectCoord = (coord: [number, number]): [number, number] => {
          const [lon, lat] = coord;
          const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * width;
          const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * height;
          return [x, y];
        };
        
        // 绘制网格（基于实际边界）
        ctx.strokeStyle = "#E2E8F0"; // slate-200
        ctx.lineWidth = 0.5;
        
        const latStep = (bounds.maxLat - bounds.minLat) / 4;
        const lonStep = (bounds.maxLon - bounds.minLon) / 6;
        
        for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += latStep) {
          const [, y] = projectCoord([bounds.minLon, lat]);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        
        for (let lon = bounds.minLon; lon <= bounds.maxLon; lon += lonStep) {
          const [x] = projectCoord([lon, bounds.minLat]);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        
        // 绘制国家几何边界
        const area = processedItem.raw?.area_km2 || 0;
        const gdp = processedItem.raw?.gdp_md || 0;
        const continent = processedItem.raw?.continent || '';
        
        // 根据数据类型选择颜色
        let fillStyle = 'rgba(124, 58, 237, 0.6)'; // 默认紫色
        
        if (area > 0) {
          // 面积模式：蓝色到红色
          const maxArea = 17000000; // 大约俄罗斯的面积
          const intensity = Math.min(area / maxArea, 1);
          const red = Math.floor(255 * intensity);
          const blue = Math.floor(255 * (1 - intensity));
          fillStyle = `rgba(${red}, 100, ${blue}, 0.7)`;
        } else if (gdp > 0) {
          // GDP模式：绿色到红色
          const maxGDP = 25000000; // 大约美国的GDP
          const intensity = Math.min(gdp / maxGDP, 1);
          const red = Math.floor(255 * intensity);
          const green = Math.floor(255 * (1 - intensity));
          fillStyle = `rgba(${red}, ${green}, 0, 0.7)`;
        } else if (continent) {
          // 大洲模式
          fillStyle = continentColors[continent] || 'rgba(124, 58, 237, 0.6)';
        }
        
        // 使用自定义投影绘制几何体
        drawGeometryWithProjection(ctx, processedItem.geometry, fillStyle, '#374151', projectCoord);
        
        // 添加标签信息
        renderLabels(ctx, processedItem, area, gdp, continent, width);
      }
    } else {
      // 没有几何数据时显示占位符
      ctx.fillStyle = "#94A3B8"; // slate-400
      ctx.font = "16px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No geometry data available", width / 2, height / 2);
    }
  };

  // 渲染标签信息
  const renderLabels = (
    ctx: CanvasRenderingContext2D,
    item: RowItem,
    area: number,
    gdp: number,
    continent: string,
    canvasWidth: number
  ) => {
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    
    const labelX = canvasWidth / 2;
    let labelY = 30;
    
    ctx.strokeText(item.name || 'Unknown', labelX, labelY);
    ctx.fillText(item.name || 'Unknown', labelX, labelY);
    
    // 数据信息
    ctx.font = '11px system-ui';
    labelY += 20;
    
    if (area > 0) {
      const areaText = `Area: ${formatArea(area)}`;
      ctx.strokeText(areaText, labelX, labelY);
      ctx.fillText(areaText, labelX, labelY);
      labelY += 15;
    }
    
    if (gdp > 0) {
      const gdpText = `GDP: ${formatGDP(gdp)}`;
      ctx.strokeText(gdpText, labelX, labelY);
      ctx.fillText(gdpText, labelX, labelY);
      labelY += 15;
    }
    
    if (continent) {
      ctx.strokeText(`Continent: ${continent}`, labelX, labelY);
      ctx.fillText(`Continent: ${continent}`, labelX, labelY);
    }
  };

  useEffect(() => {
    renderSingleCountryMap();
  }, [processedItem, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={`rounded-lg ${className}`}
    />
  );
};
