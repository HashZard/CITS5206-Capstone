/**
 * SingleCountryMapCanvas 单国家地图画布组件
 * 
 * 功能：为单个国家/地区创建专属地图视图
 * - 自动计算几何边界，优化视图缩放和居中
 * - 渲染国家的真实边界形状（非圆圈）
 * - 智能投影系统，确保最佳显示效果
 * - 数据驱动的颜色编码（面积/GDP/大洲）
 * - 显示详细标签：国家名、面积、GDP、大洲
 * - 自适应网格坐标系
 * 
 * 使用场景：国家卡片内的小地图，展示该国家的详细地理形状
 */

import React, { useEffect, useMemo, useRef } from "react";
import { RowItem } from '@/types/result';
import { parseWKBGeometry, calculateOptimalLabelAnchor, drawGeometryWithProjection, getFitTransform } from '@/utils/geometry';
import { formatArea, formatGDP, continentColors } from '@/utils/visualization';

interface SingleCountryMapCanvasProps {
  item: RowItem;
  width?: number;
  height?: number;
  className?: string;
  debugFrames?: boolean;
}

export const SingleCountryMapCanvas: React.FC<SingleCountryMapCanvasProps> = ({ 
  item, 
  width = 520, 
  height = 180, 
  className,
  debugFrames = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  
  // 处理几何数据
  const processedItem = useMemo(() => {
    if (item.raw?.geometry) {
      const geometry = parseWKBGeometry(item.raw.geometry);
      const centroid = geometry ? calculateOptimalLabelAnchor(geometry) : null;
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
    
    // 以实际CSS尺寸为准，防止形变；父容器控制style宽高
    const rect = canvas.getBoundingClientRect();
    const viewW = Math.max(1, Math.floor(rect.width) || width);
    const viewH = Math.max(1, Math.floor(rect.height) || height);
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, viewW, viewH);
    
    // 背景
    ctx.fillStyle = "#F8FAFC"; // slate-50
    ctx.fillRect(0, 0, viewW, viewH);
    
    if (processedItem.geometry) {
      // 计算统一fit变换，保证完整显示+留白
      const { scale, tx, ty, normalizedGeometry } = getFitTransform(processedItem.geometry, { width: viewW, height: viewH, padding: 14 });

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
        
        // 在未变换坐标下投影到 width/height 空间，然后整体应用 fit 变换
        const projectCoord = (coord: [number, number]): [number, number] => {
          const [lon, lat] = coord;
          const x = ((lon + 180) / 360) * viewW;
          const y = ((90 - lat) / 180) * viewH;
          return [x, y];
        };

        ctx.save();
        ctx.translate(tx, ty);
        ctx.scale(scale, scale);
        // 细线宽，随DPR调整；并使用偶数-奇数填充保证洞
        const strokeW = Math.max(1 / dpr, 0.75);
        ctx.lineWidth = strokeW;
        // 自定义填充采用 evenodd：在工具函数内部执行 ctx.fill()，此处不重复
        drawGeometryWithProjection(ctx, normalizedGeometry, fillStyle, '#374151', projectCoord);
        // 调试框
        if (debugFrames) {
          // 内容框
          ctx.strokeStyle = '#22c55e';
          ctx.strokeRect((14), (14), (viewW - 28), (viewH - 28));
        }
        ctx.restore();
        
        // 添加标签信息
        renderLabels(ctx, processedItem, area, gdp, continent, viewW);
    } else {
      // 没有几何数据时显示占位符
      ctx.fillStyle = "#94A3B8"; // slate-400
      ctx.font = "16px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No geometry data available", (canvas.width/dpr) / 2, (canvas.height/dpr) / 2);
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
