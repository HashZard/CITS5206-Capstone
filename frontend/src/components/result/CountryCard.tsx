/**
 * CountryCard 国家信息卡片组件
 * 
 * 功能：展示单个国家/地区的详细信息
 * - 显示国家名称、人口、收入组、面积等基本信息
 * - 显示查询原因和解释
 * - 可选择显示该国家的单独地图（真实边界）
 * - 支持一键复制国家详细信息
 * - 响应式设计，适配不同屏幕尺寸
 * 
 * 使用场景：详细结果列表中的每个国家展示
 */

import React from "react";
// export button removed for detailed cards per request
import { RowItem } from '@/types/result';
import { SingleCountryMapCanvas } from '@/components/map/SingleCountryMapCanvas';

interface CountryCardProps {
  item: RowItem;
  showMiniMap: boolean;
  onCopy: (message: string) => void; // kept for Toast, but Copy is removed
  large?: boolean;
}

export const CountryCard: React.FC<CountryCardProps> = ({
  item,
  showMiniMap,
  large = false,
}) => {
  // kept for interface compatibility; export replaces copy

  // 小地图始终渲染；内部会根据几何是否存在自行回退

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all relative">
      <div className="p-6 relative">

        {/* 标题 */}
        <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.name ?? item.id}</h3>
        {item.population != null && <p className="text-slate-700 text-sm">Population: {item.population}</p>}
        {item.incomeGroup && <p className="text-slate-700 text-sm">Income Group: {item.incomeGroup}</p>}
        {item.raw?.area_km2 && <p className="text-slate-700 text-sm">Area: {Math.round(item.raw.area_km2).toLocaleString()} km²</p>}
        {item.raw?.featurecla && <p className="text-slate-700 text-sm">Feature Class: {item.raw.featurecla}</p>}

        {/* reason：始终显示 */}
        <p className="text-slate-500 italic text-sm mt-2">Reason: {item.reason ?? "暂无解释说明"}</p>

        {/* 规则：结果>1 且该条有坐标 → 显示卡片内小地图 */}
        {showMiniMap && (
          <div className="mt-4 rounded-xl overflow-hidden border border-slate-200">
            <SingleCountryMapCanvas item={item} width={large ? 760 : 520} height={large ? 260 : 180} />
          </div>
        )}
      </div>
    </div>
  );
};
