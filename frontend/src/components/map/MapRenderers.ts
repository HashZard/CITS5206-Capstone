import { RowItem } from '@/types/result';
import { drawGeometry } from '@/utils/geometry';
import { formatArea, formatGDP, continentColors, terrainColors } from '@/utils/visualization';

// 面积分布可视化渲染器
export const renderAreaVisualization = (
  ctx: CanvasRenderingContext2D, 
  items: RowItem[], 
  w: number, 
  h: number
) => {
  console.log('Rendering area visualization with', items.length, 'items');
  const maxArea = Math.max(...items.map(item => item.raw?.area_km2 || 0));
  console.log('Max area:', maxArea);
  
  items.forEach((item, index) => {
    console.log(`Item ${index}:`, item.name, 'area:', item.raw?.area_km2, 'has geometry:', !!item.geometry);
    const area = item.raw?.area_km2 || 0;
    const intensity = maxArea > 0 ? area / maxArea : 0;
    
    // 颜色基于面积大小：小面积蓝色 -> 大面积红色
    const red = Math.floor(255 * intensity);
    const blue = Math.floor(255 * (1 - intensity));
    const fillStyle = `rgba(${red}, 100, ${blue}, 0.6)`;
    
    if (item.geometry) {
      // 绘制真实几何边界
      console.log(`Drawing geometry for ${item.name} with area ${area}`);
      drawGeometry(ctx, item.geometry, w, h, fillStyle, '#374151');
      
      // 在质心位置添加标签
      if (typeof item.lat === 'number' && typeof item.lon === 'number') {
        const x = ((item.lon + 180) / 360) * w;
        const y = ((90 - item.lat) / 180) * h;
        
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeText(item.name || `${index + 1}`, x, y);
        ctx.fillText(item.name || `${index + 1}`, x, y);
        
        // 面积信息
        if (area > 0) {
          ctx.font = '10px system-ui';
          const areaText = formatArea(area);
          ctx.strokeText(areaText, x, y + 15);
          ctx.fillText(areaText, x, y + 15);
        }
      }
    } else if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      // 回退到圆圈显示
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
      
      if (radius > 10) {
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(item.name || `${index + 1}`, x, y + radius + 15);
      }
    }
  });
};

// 国家分布可视化渲染器
export const renderCountriesVisualization = (
  ctx: CanvasRenderingContext2D, 
  items: RowItem[], 
  w: number, 
  h: number
) => {
  items.forEach((item, index) => {
    console.log(`Country ${index}:`, item.name, 'continent:', item.raw?.continent, 'has geometry:', !!item.geometry);
    const continent = item.raw?.continent || 'Unknown';
    const fillStyle = continentColors[continent] || 'rgba(107, 114, 128, 0.7)';
    
    if (item.geometry) {
      // 绘制真实国家边界
      console.log(`Drawing country geometry for ${item.name} (${continent})`);
      drawGeometry(ctx, item.geometry, w, h, fillStyle, '#374151');
      
      // 在质心位置添加国家标签
      if (typeof item.lat === 'number' && typeof item.lon === 'number') {
        const x = ((item.lon + 180) / 360) * w;
        const y = ((90 - item.lat) / 180) * h;
        
        ctx.fillStyle = '#1e293b';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeText(item.name || item.raw?.iso3 || `${index + 1}`, x, y);
        ctx.fillText(item.name || item.raw?.iso3 || `${index + 1}`, x, y);
        
        // GDP信息（如果有）
        if (item.raw?.gdp_md) {
          ctx.font = '9px system-ui';
          const gdpText = formatGDP(item.raw.gdp_md);
          ctx.strokeText(gdpText, x, y + 12);
          ctx.fillText(gdpText, x, y + 12);
        }
      }
    } else if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      // 回退到圆点显示
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
};

// 经济热力图可视化渲染器
export const renderEconomyVisualization = (
  ctx: CanvasRenderingContext2D, 
  items: RowItem[], 
  w: number, 
  h: number
) => {
  const maxGDP = Math.max(...items.map(item => item.raw?.gdp_md || 0));
  console.log('Max GDP:', maxGDP);
  
  items.forEach((item, index) => {
    console.log(`Economy ${index}:`, item.name, 'GDP:', item.raw?.gdp_md, 'has geometry:', !!item.geometry);
    const gdp = item.raw?.gdp_md || 0;
    const intensity = maxGDP > 0 ? gdp / maxGDP : 0;
    
    // 热力图颜色：低GDP绿色 -> 高GDP红色
    const red = Math.floor(255 * intensity);
    const green = Math.floor(255 * (1 - intensity));
    const fillStyle = `rgba(${red}, ${green}, 0, 0.7)`;
    
    if (item.geometry) {
      // 绘制真实国家边界，颜色基于GDP
      console.log(`Drawing economy geometry for ${item.name} with GDP ${gdp}`);
      drawGeometry(ctx, item.geometry, w, h, fillStyle, '#374151');
      
      // 在质心位置添加GDP标签
      if (typeof item.lat === 'number' && typeof item.lon === 'number') {
        const x = ((item.lon + 180) / 360) * w;
        const y = ((90 - item.lat) / 180) * h;
        
        // 国家名称
        ctx.fillStyle = '#1e293b';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeText(item.name || `${index + 1}`, x, y - 8);
        ctx.fillText(item.name || `${index + 1}`, x, y - 8);
        
        // GDP值
        if (gdp > 0) {
          ctx.font = '10px system-ui';
          const gdpText = formatGDP(gdp);
          ctx.strokeText(gdpText, x, y + 8);
          ctx.fillText(gdpText, x, y + 8);
        }
      }
    } else if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      // 回退到圆圈显示
      const x = ((item.lon + 180) / 360) * w;
      const y = ((90 - item.lat) / 180) * h;
      const radius = Math.max(4, intensity * 25);
      
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // GDP值标签
      if (gdp > maxGDP * 0.1) {
        ctx.fillStyle = '#1e293b';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        const gdpText = formatGDP(gdp);
        ctx.fillText(gdpText, x, y + radius + 12);
      }
    }
  });
};

// 地形特征可视化渲染器
export const renderTerrainVisualization = (
  ctx: CanvasRenderingContext2D, 
  items: RowItem[], 
  w: number, 
  h: number
) => {
  items.forEach((item, index) => {
    console.log(`Terrain ${index}:`, item.name, 'featurecla:', item.raw?.featurecla, 'has geometry:', !!item.geometry);
    const featurecla = item.raw?.featurecla || 'Unknown';
    const fillStyle = terrainColors[featurecla] || 'rgba(139, 69, 19, 0.7)';
    
    if (item.geometry) {
      // 绘制真实地形几何边界
      console.log(`Drawing terrain geometry for ${item.name} (${featurecla})`);
      drawGeometry(ctx, item.geometry, w, h, fillStyle, '#654321');
      
      // 在质心位置添加地形标签
      if (typeof item.lat === 'number' && typeof item.lon === 'number') {
        const x = ((item.lon + 180) / 360) * w;
        const y = ((90 - item.lat) / 180) * h;
        
        ctx.fillStyle = '#2d1b0e';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeText(item.name || `${index + 1}`, x, y);
        ctx.fillText(item.name || `${index + 1}`, x, y);
        
        // 地形类型
        if (featurecla !== 'Unknown') {
          ctx.font = '8px system-ui';
          ctx.strokeText(featurecla, x, y + 12);
          ctx.fillText(featurecla, x, y + 12);
        }
      }
    } else if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      // 回退到符号显示
      const x = ((item.lon + 180) / 360) * w;
      const y = ((90 - item.lat) / 180) * h;
      const scalerank = item.raw?.scalerank || 10;
      const size = Math.max(3, 15 - scalerank);
      
      ctx.fillStyle = fillStyle;
      
      // 山峰用三角形，其他用圆形
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
};

// 通用可视化渲染器
export const renderGeneralVisualization = (
  ctx: CanvasRenderingContext2D, 
  items: RowItem[], 
  w: number, 
  h: number
) => {
  console.log('General visualization - items count:', items.length);
  
  // 如果没有数据，显示一些测试点
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
    ctx.fillText("显示测试数据点", w / 2, h / 2 + 100);
    return;
  }
  
  items.forEach((item, index) => {
    console.log('Drawing item:', item.name, 'has geometry:', !!item.geometry, 'at', item.lat, item.lon);
    
    if (item.geometry) {
      // 绘制真实几何边界
      console.log(`Drawing general geometry for ${item.name}`);
      drawGeometry(ctx, item.geometry, w, h, 'rgba(124, 58, 237, 0.6)', '#7C3AED');
      
      // 在质心位置添加标签
      if (typeof item.lat === 'number' && typeof item.lon === 'number') {
        const x = ((item.lon + 180) / 360) * w;
        const y = ((90 - item.lat) / 180) * h;
        
        ctx.fillStyle = '#1e293b';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeText(item.name || `${index + 1}`, x, y);
        ctx.fillText(item.name || `${index + 1}`, x, y);
      }
    } else if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      // 回退到圆点显示
      const x = ((item.lon + 180) / 360) * w;
      const y = ((90 - item.lat) / 180) * h;
      
      ctx.fillStyle = '#7C3AED';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = '#1e293b';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(item.name || `${index + 1}`, x, y + 15);
    }
  });
};
