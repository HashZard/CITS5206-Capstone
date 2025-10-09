/**
 * SingleCountryMapCanvas - Single country map canvas component
 * 
 * Features: Create dedicated map view for a single country/region
 * - Automatically calculate geometric boundaries, optimize view scaling and centering
 * - Render real boundary shapes of countries (not circles)
 * - Smart projection system, ensure optimal display effects
 * - Data-driven color coding (area/GDP/continent)
 * - Display detailed labels: country name, area, GDP, continent
 * - Adaptive grid coordinate system
 * 
 * Use cases: Mini map within country cards, showing detailed geographic shape of the country
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
  
  // Process geometry data
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

  // Render single country map
  const renderSingleCountryMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Use actual CSS dimensions to prevent distortion; parent container controls style width/height
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
    
    // Background
    ctx.fillStyle = "#F8FAFC"; // slate-50
    ctx.fillRect(0, 0, viewW, viewH);
    
    if (processedItem.geometry) {
      // Calculate unified fit transformation, ensure complete display + padding
      const { scale, tx, ty, normalizedGeometry } = getFitTransform(processedItem.geometry, { width: viewW, height: viewH, padding: 14 });

      // Draw country geometric boundaries
        const area = processedItem.raw?.area_km2 || 0;
        const gdp = processedItem.raw?.gdp_md || 0;
        const continent = processedItem.raw?.continent || '';
        
        // Select color based on data type
        let fillStyle = 'rgba(124, 58, 237, 0.6)'; // Default purple
        
        if (area > 0) {
          // Area mode: blue to red
          const maxArea = 17000000; // Approximately Russia's area
          const intensity = Math.min(area / maxArea, 1);
          const red = Math.floor(255 * intensity);
          const blue = Math.floor(255 * (1 - intensity));
          fillStyle = `rgba(${red}, 100, ${blue}, 0.7)`;
        } else if (gdp > 0) {
          // GDP mode: green to red
          const maxGDP = 25000000; // Approximately US GDP
          const intensity = Math.min(gdp / maxGDP, 1);
          const red = Math.floor(255 * intensity);
          const green = Math.floor(255 * (1 - intensity));
          fillStyle = `rgba(${red}, ${green}, 0, 0.7)`;
        } else if (continent) {
          // Continent mode
          fillStyle = continentColors[continent] || 'rgba(124, 58, 237, 0.6)';
        }
        
        // Project to width/height space under untransformed coordinates, then apply overall fit transformation
        const projectCoord = (coord: [number, number]): [number, number] => {
          const [lon, lat] = coord;
          const x = ((lon + 180) / 360) * viewW;
          const y = ((90 - lat) / 180) * viewH;
          return [x, y];
        };

        ctx.save();
        ctx.translate(tx, ty);
        ctx.scale(scale, scale);
        // Thin line width, adjust with DPR; use even-odd fill to ensure holes
        const strokeW = Math.max(1 / dpr, 0.75);
        ctx.lineWidth = strokeW;
        // Custom fill uses evenodd: ctx.fill() executed inside utility function, no duplication here
        drawGeometryWithProjection(ctx, normalizedGeometry, fillStyle, '#374151', projectCoord);
        // Debug frame
        if (debugFrames) {
          // Content frame
          ctx.strokeStyle = '#22c55e';
          ctx.strokeRect((14), (14), (viewW - 28), (viewH - 28));
        }
        ctx.restore();
        
        // Add label information
        renderLabels(ctx, processedItem, area, gdp, continent, viewW);
    } else {
      // Show placeholder when no geometry data
      ctx.fillStyle = "#94A3B8"; // slate-400
      ctx.font = "16px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No geometry data available", (canvas.width/dpr) / 2, (canvas.height/dpr) / 2);
    }
  };

  // Render label information
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
    
    // Data information
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
