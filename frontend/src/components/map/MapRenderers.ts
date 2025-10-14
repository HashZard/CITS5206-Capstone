/**
 * MapRenderers - Map renderer collection
 * 
 * Features: Provide various professional map visualization rendering algorithms
 * - renderAreaVisualization: Area distribution renderer, colored by country area size
 * - renderCountriesVisualization: Country distribution renderer, colored by continent classification
 * - renderEconomyVisualization: Economic heatmap renderer, colored by GDP level
 * - renderTerrainVisualization: Terrain feature renderer, colored by geographic features
 * - renderGeneralVisualization: General renderer, suitable for unclassified data
 * 
 * Each renderer supports:
 * - Real geometric boundary drawing
 * - Smart color coding
 * - Text labels and data display
 * - Fallback to symbol display (when no geometry data)
 * 
 * Use cases: AdvancedMapCanvas calls appropriate renderer based on data type
 */

import { RowItem } from '@/types/result';
import { drawGeometry } from '@/utils/geometry';
import { formatArea, formatGDP, continentColors, terrainColors } from '@/utils/visualization';
import { LabelRenderer } from '@/utils/labelRenderer';

// Area distribution visualization renderer
export const renderAreaVisualization = (
  ctx: CanvasRenderingContext2D, 
  items: RowItem[], 
  w: number, 
  h: number
) => {
  console.log('Rendering area visualization with', items.length, 'items');
  const maxArea = Math.max(...items.map(item => item.raw?.area_km2 || 0));
  console.log('Max area:', maxArea);
  
  // Create label renderer
  const labelRenderer = new LabelRenderer(ctx, {
    fontSize: 12,
    fontWeight: '600',
    textColor: '#1e293b',
    haloColor: '#ffffff',
    haloWidth: 3
  });

  // First draw all geometries
  items.forEach((item, index) => {
    console.log(`Item ${index}:`, item.name, 'area:', item.raw?.area_km2, 'has geometry:', !!item.geometry);
    const area = item.raw?.area_km2 || 0;
    const intensity = maxArea > 0 ? area / maxArea : 0;
    
    // Color based on area size: small area blue -> large area red
    const red = Math.floor(255 * intensity);
    const blue = Math.floor(255 * (1 - intensity));
    const fillStyle = `rgba(${red}, 100, ${blue}, 0.6)`;
    
    if (item.geometry) {
      // Draw real geometric boundaries
      console.log(`Drawing geometry for ${item.name} with area ${area}`);
      drawGeometry(ctx, item.geometry, w, h, fillStyle, '#374151');
    } else if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      // Fallback to circle display
      const x = ((item.lon + 180) / 360) * w;
      const y = ((90 - item.lat) / 180) * h;
      const radius = Math.max(3, (area / maxArea) * 30);
      
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });

  // Then render all labels, sorted by area (largest first)
  const sortedItems = [...items].sort((a, b) => (b.raw?.area_km2 || 0) - (a.raw?.area_km2 || 0));
  
  sortedItems.forEach((item, index) => {
    const area = item.raw?.area_km2 || 0;
    const areaText = area > 0 ? formatArea(area) : undefined;
    const priority = items.length - index; // Larger area has higher priority

    if (item.geometry) {
      // Use geometry to render labels
      labelRenderer.renderGeometryLabel(
        item.geometry,
        item.name || 'Unknown',
        areaText,
        w,
        h,
        priority
      );
    } else if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      // Use point coordinates to render labels
      labelRenderer.renderPointLabel(
        item.lat,
        item.lon,
        item.name || 'Unknown',
        areaText,
        w,
        h,
        priority
      );
    }
  });
};

// Country distribution visualization renderer
export const renderCountriesVisualization = (
  ctx: CanvasRenderingContext2D, 
  items: RowItem[], 
  w: number, 
  h: number
) => {
  // Create label renderer
  const labelRenderer = new LabelRenderer(ctx, {
    fontSize: 11,
    fontWeight: '600',
    textColor: '#1e293b',
    haloColor: '#ffffff',
    haloWidth: 2
  });

  // First draw all geometries
  items.forEach((item, index) => {
    console.log(`Country ${index}:`, item.name, 'continent:', item.raw?.continent, 'has geometry:', !!item.geometry);
    const continent = item.raw?.continent || 'Unknown';
    const fillStyle = continentColors[continent] || 'rgba(107, 114, 128, 0.7)';
    
    if (item.geometry) {
      // Draw real country boundaries
      console.log(`Drawing country geometry for ${item.name} (${continent})`);
      drawGeometry(ctx, item.geometry, w, h, fillStyle, '#374151');
    } else if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      // Fallback to dot display
      const x = ((item.lon + 180) / 360) * w;
      const y = ((90 - item.lat) / 180) * h;
      
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });

  // Then render all labels
  items.forEach((item, index) => {
    const gdpText = item.raw?.gdp_md ? formatGDP(item.raw.gdp_md) : undefined;
    const priority = items.length - index;

    if (item.geometry) {
      // Use geometry to render labels
      labelRenderer.renderGeometryLabel(
        item.geometry,
        item.name || item.raw?.iso3 || 'Unknown',
        gdpText,
        w,
        h,
        priority
      );
    } else if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      // Use point coordinates to render labels
      labelRenderer.renderPointLabel(
        item.lat,
        item.lon,
        item.name || item.raw?.iso3 || 'Unknown',
        gdpText,
        w,
        h,
        priority
      );
    }
  });
};

// Economic heatmap visualization renderer
export const renderEconomyVisualization = (
  ctx: CanvasRenderingContext2D, 
  items: RowItem[], 
  w: number, 
  h: number
) => {
  const maxGDP = Math.max(...items.map(item => item.raw?.gdp_md || 0));
  console.log('Max GDP:', maxGDP);
  
  // Create label renderer
  const labelRenderer = new LabelRenderer(ctx, {
    fontSize: 11,
    fontWeight: '600',
    textColor: '#1e293b',
    haloColor: '#ffffff',
    haloWidth: 2
  });

  // First draw all geometries
  items.forEach((item, index) => {
    console.log(`Economy ${index}:`, item.name, 'GDP:', item.raw?.gdp_md, 'has geometry:', !!item.geometry);
    const gdp = item.raw?.gdp_md || 0;
    const intensity = maxGDP > 0 ? gdp / maxGDP : 0;
    
    // Heatmap color: low GDP green -> high GDP red
    const red = Math.floor(255 * intensity);
    const green = Math.floor(255 * (1 - intensity));
    const fillStyle = `rgba(${red}, ${green}, 0, 0.7)`;
    
    if (item.geometry) {
      // Draw real country boundaries, colored by GDP
      console.log(`Drawing economy geometry for ${item.name} with GDP ${gdp}`);
      drawGeometry(ctx, item.geometry, w, h, fillStyle, '#374151');
    } else if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      // Fallback to circle display
      const x = ((item.lon + 180) / 360) * w;
      const y = ((90 - item.lat) / 180) * h;
      const radius = Math.max(4, intensity * 25);
      
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Then render all labels, sorted by GDP (highest first)
  const sortedItems = [...items].sort((a, b) => (b.raw?.gdp_md || 0) - (a.raw?.gdp_md || 0));
  
  sortedItems.forEach((item, index) => {
    const gdp = item.raw?.gdp_md || 0;
    const gdpText = gdp > 0 ? formatGDP(gdp) : undefined;
    const priority = items.length - index; // Higher GDP has higher priority

    if (item.geometry) {
      // Use geometry to render labels
      labelRenderer.renderGeometryLabel(
        item.geometry,
        item.name || 'Unknown',
        gdpText,
        w,
        h,
        priority
      );
    } else if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      // Use point coordinates to render labels
      labelRenderer.renderPointLabel(
        item.lat,
        item.lon,
        item.name || 'Unknown',
        gdpText,
        w,
        h,
        priority
      );
    }
  });
};

// Terrain feature visualization renderer
export const renderTerrainVisualization = (
  ctx: CanvasRenderingContext2D, 
  items: RowItem[], 
  w: number, 
  h: number
) => {
  // Create label renderer
  const labelRenderer = new LabelRenderer(ctx, {
    fontSize: 10,
    fontWeight: '600',
    textColor: '#2d1b0e',
    haloColor: '#ffffff',
    haloWidth: 2
  });

  // First draw all geometries
  items.forEach((item, index) => {
    console.log(`Terrain ${index}:`, item.name, 'featurecla:', item.raw?.featurecla, 'has geometry:', !!item.geometry);
    const featurecla = item.raw?.featurecla || 'Unknown';
    const fillStyle = terrainColors[featurecla] || 'rgba(139, 69, 19, 0.7)';
    
    if (item.geometry) {
      // Draw real terrain geometric boundaries
      console.log(`Drawing terrain geometry for ${item.name} (${featurecla})`);
      drawGeometry(ctx, item.geometry, w, h, fillStyle, '#654321');
    } else if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      // Fallback to symbol display
      const x = ((item.lon + 180) / 360) * w;
      const y = ((90 - item.lat) / 180) * h;
      const scalerank = item.raw?.scalerank || 10;
      const size = Math.max(3, 15 - scalerank);
      
      ctx.fillStyle = fillStyle;
      
      // Use triangles for peaks; circles for others
      if (featurecla.includes('Peak')) {
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x - size, y + size);
        ctx.lineTo(x + size, y + size);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });

  // Then render all labels
  items.forEach((item, index) => {
    const featurecla = item.raw?.featurecla || 'Unknown';
    const subText = featurecla !== 'Unknown' ? featurecla : undefined;
    const priority = items.length - index;

    if (item.geometry) {
      // Use geometry to render labels
      labelRenderer.renderGeometryLabel(
        item.geometry,
        item.name || 'Unknown',
        subText,
        w,
        h,
        priority
      );
    } else if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      // Use point coordinates to render labels
      labelRenderer.renderPointLabel(
        item.lat,
        item.lon,
        item.name || 'Unknown',
        subText,
        w,
        h,
        priority
      );
    }
  });
};

// General visualization renderer
export const renderGeneralVisualization = (
  ctx: CanvasRenderingContext2D, 
  items: RowItem[], 
  w: number, 
  h: number
) => {
  console.log('General visualization - items count:', items.length);
  
  // If there is no data, show some test points
  if (items.length === 0) {
    console.log('No items, showing test points');
    const testPoints = [
      { lat: 35, lon: 104, name: 'Test China' },
      { lat: 40, lon: -95, name: 'Test USA' },
      { lat: 55, lon: -106, name: 'Test Canada' }
    ];
    
    testPoints.forEach(point => {
      const x = ((point.lon + 180) / 360) * w;
      const y = ((90 - point.lat) / 180) * h;
      console.log(`Drawing test point ${point.name} at (${x}, ${y})`);
      
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = '#000000';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(point.name, x, y + 20);
    });
    
    ctx.fillStyle = "rgba(71,85,105,0.7)";
    ctx.font = "18px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Show test data points", w / 2, h / 2 + 100);
    return;
  }
  
  // Create label renderer
  const labelRenderer = new LabelRenderer(ctx, {
    fontSize: 11,
    fontWeight: '600',
    textColor: '#1e293b',
    haloColor: '#ffffff',
    haloWidth: 2
  });

  // First draw all geometries
  items.forEach((item) => {
    console.log('Drawing item:', item.name, 'has geometry:', !!item.geometry, 'at', item.lat, item.lon);
    
    if (item.geometry) {
      // Draw real geometric boundaries
      console.log(`Drawing general geometry for ${item.name}`);
      drawGeometry(ctx, item.geometry, w, h, 'rgba(124, 58, 237, 0.6)', '#7C3AED');
    } else if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      // Fallback to dot display
      const x = ((item.lon + 180) / 360) * w;
      const y = ((90 - item.lat) / 180) * h;
      
      ctx.fillStyle = '#7C3AED';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });

  // Then render all labels
  items.forEach((item, index) => {
    const priority = items.length - index;

    if (item.geometry) {
      // Use geometry to render labels
      labelRenderer.renderGeometryLabel(
        item.geometry,
        item.name || 'Unknown',
        undefined,
        w,
        h,
        priority
      );
    } else if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      // Use point coordinates to render labels
      labelRenderer.renderPointLabel(
        item.lat,
        item.lon,
        item.name || 'Unknown',
        undefined,
        w,
        h,
        priority
      );
    }
  });
};
