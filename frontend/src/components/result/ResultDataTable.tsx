import React from "react";
import { Download, Copy, Table, ChevronUp, ChevronDown } from "lucide-react";

/**
 * A schema-agnostic table:
 * - Auto-detects columns from `items`
 * - Skips huge/geometry fields
 * - Sortable, filterable, scrollable
 * - CSV copy / download (frontend only)
 */
type AnyRow = Record<string, unknown>;

type Props = {
  items: AnyRow[];
  title?: string;
};

const EXCLUDE_KEYS = new Set([
  "geometry", "geom", "wkb_geometry", "shape", "shapefile", "geojson",
  "coordinates", "bbox", "bounds", "polygons", "linestring",
  // often very verbose
  "reason", "raw_sql", "sql", "query_plan"
]);

// Preferred columns (if present)
const PREFERRED_ORDER = [
  "id", "name", "name_en", "brk_name", "formal_en", "featurecla",
  "iso_a3", "abbrev", "continent", "region", "subregion", "unregion",
  "economy", "income_group", "gdp", "gdp_per_capita", "population",
  "population_rank", "area_km2", "density", "lat", "lon", "centroid_lat", "centroid_lon"
];

const nf = new Intl.NumberFormat();
const formatVal = (v: unknown) => {
  if (v == null) return "—";
  if (typeof v === "number") return nf.format(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.length > 4 ? `[${v.slice(0, 4).join(", ")}…]` : `[${v.join(", ")}]`;
  if (typeof v === "object") {
    // try a small, readable object preview
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return "{}";
    const sample = keys.slice(0, 3).map(k => `${k}: ${(obj[k] as any)?.toString?.().slice(0, 20) ?? "…"}`).join(", ");
    return `{ ${sample}${keys.length > 3 ? ", …" : ""} }`;
  }
  return String(v);
};

function detectColumns(items: AnyRow[]): string[] {
  const counts = new Map<string, number>();
  const types = new Map<string, Set<string>>();

  for (const it of items) {
    for (const [k, v] of Object.entries(it)) {
      if (EXCLUDE_KEYS.has(k)) continue;
      counts.set(k, (counts.get(k) || 0) + 1);
      const t = typeof v;
      const set = types.get(k) ?? new Set<string>();
      set.add(t);
      types.set(k, set);
    }
  }

  // keep columns that are mostly primitive (string/number/boolean) or null/undefined
  const keep: string[] = [];
  for (const k of counts.keys()) {
    const ts = types.get(k)!;
    const acceptable = [...ts].every(t => t === "string" || t === "number" || t === "boolean" || t === "undefined" || t === "object"); // allow null
    // if "object" exists, it might be null; skip obvious non-primitive like arrays/objects by sampling a few rows
    if (acceptable) keep.push(k);
  }

  // Preferred columns first (if present), then alphabetical of the rest
  const presentPreferred = PREFERRED_ORDER.filter(k => keep.includes(k));
  const rest = keep.filter(k => !presentPreferred.includes(k)).sort((a, b) => a.localeCompare(b));
  // Compact default: limit to ~12 columns to keep it readable
  const compact = [...presentPreferred, ...rest].slice(0, 12);
  return compact.length ? compact : rest.slice(0, 12);
}

function makeCSV(columns: string[], rows: AnyRow[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = columns.map(esc).join(",");
  const body = rows
    .map(r => columns.map(c => {
      const raw = r[c];
      const val = raw == null ? "" :
        typeof raw === "number" ? String(raw) :
        typeof raw === "boolean" ? (raw ? "true" : "false") :
        Array.isArray(raw) ? raw.join("; ") :
        typeof raw === "object" ? JSON.stringify(raw) :
        String(raw);
      return esc(val);
    }).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

const ResultDataTable: React.FC<Props> = ({ items, title = "Data Table" }) => {
  const [filter, setFilter] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [showAllCols, setShowAllCols] = React.useState(false);

  const allColumns = React.useMemo(() => {
    // if user wants full schema, compute all primitive-ish keys union (many columns)
    if (showAllCols) {
      const set = new Set<string>();
      for (const it of items) {
        for (const k of Object.keys(it)) {
          if (!EXCLUDE_KEYS.has(k)) set.add(k);
        }
      }
      return Array.from(set);
    }
    return detectColumns(items);
  }, [items, showAllCols]);

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(r => {
      for (const c of allColumns) {
        const v = r[c];
        if (v != null && String(v).toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [items, allColumns, filter]);

  const sorted = React.useMemo(() => {
    if (!sortKey) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey as keyof AnyRow];
      const bv = b[sortKey as keyof AnyRow];
      const an = typeof av === "number";
      const bn = typeof bv === "number";
      if (an && bn) return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
      const as = String(av ?? "");
      const bs = String(bv ?? "");
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const onSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleCopyCSV = async () => {
    const csv = makeCSV(allColumns, sorted);
    try {
      await navigator.clipboard.writeText(csv);
      alert("CSV copied to clipboard");
    } catch {
      alert("Copy failed. You can use Download instead.");
    }
  };

  const handleDownloadCSV = () => {
    const csv = makeCSV(allColumns, sorted);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "results.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Table className="w-5 h-5 text-slate-700" />
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {sorted.length} rows
          </span>
          {!showAllCols && (
            <button
              onClick={() => setShowAllCols(true)}
              className="text-xs text-purple-700 underline"
              title="Show all columns"
            >
              show all columns
            </button>
          )}
          {showAllCols && (
            <button
              onClick={() => setShowAllCols(false)}
              className="text-xs text-purple-700 underline"
              title="Show compact columns"
            >
              compact view
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter rows…"
            className="text-sm border border-slate-300 rounded-lg px-2 py-1"
          />
          <button
            onClick={handleCopyCSV}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm"
            title="Copy CSV"
          >
            <Copy className="w-4 h-4" />
            Copy CSV
          </button>
          <button
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm"
            title="Download CSV"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {allColumns.map((c) => (
                <th
                  key={c}
                  onClick={() => onSort(c)}
                  className="text-left px-3 py-2 font-medium text-slate-700 whitespace-nowrap select-none cursor-pointer"
                  title={`Sort by ${c}`}
                >
                  <div className="inline-flex items-center gap-1">
                    {c}
                    {sortKey === c ? (
                      sortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className={i % 2 ? "bg-white" : "bg-slate-50/50"}>
                {allColumns.map((c) => (
                  <td key={c} className="px-3 py-2 text-slate-800 whitespace-nowrap">
                    {formatVal(row[c])}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={allColumns.length || 1}>
                  No rows to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500 mt-2">
        Note: very large geometry fields are hidden to keep the table fast.
      </p>
    </div>
  );
};

export default ResultDataTable;
