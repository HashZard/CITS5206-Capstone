// src/components/result/AutoComparisonChart.tsx
import React, { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

type AnyRec = Record<string, any>;

type Props = {
  items: AnyRec[];
  title?: string;
  maxBars?: number;          // show top N (default 25)
  preferredKeys?: string[];  // optional: boost these keys to the top of the selector
  excludeKeys?: string[];    // optional: add more keys to exclude
};

/** A tiny helper to read nested value: prefer item[key], else item.raw[key] */
function readValue(it: AnyRec, key: string): any {
  if (it == null) return undefined;
  if (Object.prototype.hasOwnProperty.call(it, key)) return it[key];
  if (it.raw && Object.prototype.hasOwnProperty.call(it.raw, key)) return it.raw[key];
  return undefined;
}

function isFiniteNumber(v: any) {
  return typeof v === "number" && Number.isFinite(v);
}

function variance(arr: number[]) {
  const n = arr.length;
  if (n <= 1) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / n;
  return arr.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1);
}

const DEFAULT_EXCLUDES = new Set([
  "id", "uuid", "gid", "code", "abbr", "abbr2", "iso", "iso2", "iso3",
  "lat", "latitude", "lon", "lng", "longitude",
  "name", "country", "region", "subregion", "continent",
  "reason", "geometry", "geom", "wkb", "wkt", "raw", "type",
]);

/**
 * AutoComparisonChart (Line only)
 * - detects numeric fields across items
 * - lets user select a field and renders a LINE chart
 * - pure SVG (no external chart libs)
 */
const AutoComparisonChart: React.FC<Props> = ({
  items,
  title = "Comparison Chart",
  maxBars = 25,
  preferredKeys = ["gdp", "gdp_usd", "gdp_total", "gdp_per_capita", "population", "area"],
  excludeKeys = [],
}) => {
  // 1) discover candidate numeric keys
  const { metrics, defaultMetric } = useMemo(() => {
    const extraExcludes = new Set(excludeKeys.map(k => k.toLowerCase()));
    const counts: Record<string, number> = {};
    const samples: Record<string, number[]> = {};

    for (const it of items) {
      const pools: AnyRec[] = [it];
      if (it?.raw && typeof it.raw === "object") pools.push(it.raw);

      for (const obj of pools) {
        for (const [k, v] of Object.entries(obj || {})) {
          const kl = k.toLowerCase();
          if (DEFAULT_EXCLUDES.has(kl) || extraExcludes.has(kl)) continue;
          if (isFiniteNumber(v)) {
            counts[kl] = (counts[kl] ?? 0) + 1;
            (samples[kl] = samples[kl] ?? []).push(Number(v));
          }
        }
      }
    }

    // keep keys that appear with at least 2 numeric values & have variance
    let keys = Object.keys(counts).filter(
      k => (counts[k] ?? 0) >= 2 && variance(samples[k] ?? []) > 0
    );

    // sort: preferred first, then by frequency desc
    const prefWeight = (k: string) => {
      const idx = preferredKeys.findIndex(pk => k.includes(pk.toLowerCase()));
      return idx === -1 ? 999 : idx;
    };
    keys.sort((a, b) => {
      const pa = prefWeight(a), pb = prefWeight(b);
      if (pa !== pb) return pa - pb;
      return (counts[b] ?? 0) - (counts[a] ?? 0);
    });

    const best = keys[0] || null;
    return { metrics: keys, defaultMetric: best };
  }, [items, preferredKeys, excludeKeys]);

  const [metric, setMetric] = useState<string | null>(defaultMetric);

  // 2) shape data for the selected metric
  const data = useMemo(() => {
    if (!metric) return [];
    const rows = items.map(it => {
      const label =
        it.name ||
        it.country ||
        it.raw?.name ||
        it.raw?.properties?.name ||
        it.id ||
        "—";
      const value = readValue(it, metric);
      return { label: String(label), value: isFiniteNumber(value) ? Number(value) : NaN };
    }).filter(d => Number.isFinite(d.value));

    // sort desc and cap
    rows.sort((a, b) => b.value - a.value);
    return rows.slice(0, maxBars);
  }, [items, metric, maxBars]);

  const width = 1000;      // intrinsic SVG width (scales with CSS)
  const height = 360;
  const margin = { top: 24, right: 20, bottom: 80, left: 80 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // scales
  const [min, max] = useMemo(() => {
    if (data.length === 0) return [0, 1];
    const v = data.map(d => d.value);
    return [Math.min(...v, 0), Math.max(...v)];
  }, [data]);

  const xStep = innerW / Math.max(data.length, 1);
  const y = (v: number) => {
    if (max === min) return margin.top + innerH / 2;
    const t = (v - min) / (max - min);
    return margin.top + (1 - t) * innerH;
  };

  if (!metric || metrics.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-slate-800 font-medium">{title}</div>
        <p className="text-slate-600 mt-1">
          No numeric fields found to chart. (The chart appears automatically when the result contains numeric metrics.)
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      {/* Header / Controls */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-slate-800 font-semibold text-lg">{title}</div>

        <div className="flex items-center gap-2">
          {/* metric selector */}
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Metric:</span>
          </label>
          <select
            value={metric ?? ""}
            onChange={(e) => setMetric(e.target.value || null)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
          >
            {metrics.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Line Chart */}
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[680px]">
          {/* y axis ticks (5) + grid */}
          {Array.from({ length: 5 }).map((_, i) => {
            const t = i / 4;
            const val = min + (max - min) * (1 - t);
            const yy = margin.top + t * innerH;
            return (
              <g key={i}>
                <line x1={margin.left} x2={margin.left + innerW} y1={yy} y2={yy} stroke="#e2e8f0" strokeDasharray="3 4" />
                <text x={margin.left - 8} y={yy} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#334155">
                  {formatNumber(val)}
                </text>
              </g>
            );
          })}

          {/* line path + points */}
          <g>
            <polyline
              fill="none"
              stroke="#0ea5e9"        // teal-ish for contrast
              strokeWidth="2.5"
              points={data.map((d, i) => {
                const cx = margin.left + i * xStep + xStep / 2;
                const cy = y(d.value);
                return `${cx},${cy}`;
              }).join(" ")}
            />
            {data.map((d, i) => {
              const cx = margin.left + i * xStep + xStep / 2;
              const cy = y(d.value);
              return <circle key={i} cx={cx} cy={cy} r={3} fill="#0ea5e9" />;
            })}
          </g>

          {/* x labels (rotated) */}
          {data.map((d, i) => {
            const cx = margin.left + i * xStep + xStep / 2;
            const yy = height - margin.bottom + 14;
            return (
              <g key={i} transform={`translate(${cx}, ${yy}) rotate(35)`}>
                <text textAnchor="start" fontSize="11" fill="#334155">
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* footnote */}
      <div className="mt-2 text-xs text-slate-500">
        Showing top {data.length} by <span className="font-medium">{metric}</span>. Min: {formatNumber(min)} · Max: {formatNumber(max)}
      </div>
    </div>
  );
};

function formatNumber(n: number) {
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export default AutoComparisonChart;
