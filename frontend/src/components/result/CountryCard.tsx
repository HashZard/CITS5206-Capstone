/**
 * CountryCard - Country information card component
 * 
 * Features: Display detailed information for a single country/region
 * - Show basic information like country name, population, income group, area, etc.
 * - Display query reason and explanation
 * - Optionally show individual map for the country (real boundaries)
 * - Support one-click copy of country detailed information
 * - Responsive design, adapts to different screen sizes
 * 
 * Use cases: Display each country in detailed result list
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

  // Mini map always renders; internally handles fallback based on geometry existence

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all relative">
      <div className="p-6 relative">

        {/* Title */}
        <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.name ?? item.id}</h3>
        {item.population != null && <p className="text-slate-700 text-sm">Population: {item.population}</p>}
        {item.incomeGroup && <p className="text-slate-700 text-sm">Income Group: {item.incomeGroup}</p>}
        {item.raw?.area_km2 && <p className="text-slate-700 text-sm">Area: {Math.round(item.raw.area_km2).toLocaleString()} km²</p>}
        {item.raw?.featurecla && <p className="text-slate-700 text-sm">Feature Class: {item.raw.featurecla}</p>}

        {/* reason: always display */}
        <p className="text-slate-500 italic text-sm mt-2">Reason: {item.reason ?? "No explanation available"}</p>

        {/* Rule: results>1 and item has coordinates → show mini map in card */}
        {showMiniMap && (
          <div className="mt-4 rounded-xl overflow-hidden border border-slate-200">
            <SingleCountryMapCanvas item={item} width={large ? 760 : 520} height={large ? 260 : 180} />
          </div>
        )}
      </div>
    </div>
  );
};
