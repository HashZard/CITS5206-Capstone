import React from "react";
import { Copy } from "lucide-react";
import { RowItem } from '@/types/result';
import { SingleCountryMapCanvas } from '@/components/map/SingleCountryMapCanvas';

interface CountryCardProps {
  item: RowItem;
  showMiniMap: boolean;
  onCopy: (message: string) => void;
}

export const CountryCard: React.FC<CountryCardProps> = ({
  item,
  showMiniMap,
  onCopy,
}) => {
  const text =
    `${item.name ?? "(unknown)"}\n` +
    (item.population != null ? `Population: ${item.population}\n` : "") +
    (item.incomeGroup ? `Income Group: ${item.incomeGroup}\n` : "") +
    (item.reason ? `Reason: ${item.reason}\n` : "");

  const hasCoords = typeof item.lat === "number" && typeof item.lon === "number";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all relative">
      <div className="p-6 relative">
        <button
          onClick={() => navigator.clipboard.writeText(text).then(() => onCopy("Copied!"))}
          className="absolute top-4 right-4 p-2 bg-slate-100 border border-slate-200 rounded-md hover:bg-purple-600 hover:text-white transition-all"
          title="Copy details"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.name ?? item.id}</h3>
        {item.population != null && <p className="text-slate-700 text-sm">Population: {item.population}</p>}
        {item.incomeGroup && <p className="text-slate-700 text-sm">Income Group: {item.incomeGroup}</p>}
        {item.raw?.area_km2 && <p className="text-slate-700 text-sm">Area: {Math.round(item.raw.area_km2).toLocaleString()} km²</p>}
        {item.raw?.featurecla && <p className="text-slate-700 text-sm">Feature Class: {item.raw.featurecla}</p>}

        {/* reason：始终显示 */}
        <p className="text-slate-500 italic text-sm mt-2">Reason: {item.reason ?? "暂无解释说明"}</p>

        {/* 规则：结果>1 且该条有坐标 → 显示卡片内小地图 */}
        {showMiniMap && hasCoords && (
          <div className="mt-4 rounded-xl overflow-hidden border border-slate-200">
            <SingleCountryMapCanvas item={item} width={520} height={180} />
          </div>
        )}
      </div>
    </div>
  );
};
