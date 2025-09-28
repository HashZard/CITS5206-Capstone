// src/components/result/ResultsTable.tsx
import React, { useMemo, useState } from "react";
import type { RowItem } from "@/types/result";

type AnyRow = RowItem | Record<string, any>;

interface ResultsTableProps {
  rows: AnyRow[];
  title?: string;
}

const numberLike = (v: unknown) =>
  typeof v === "number" ||
  (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)));

const fmtNum = (v: unknown) =>
  v === null || v === undefined
    ? ""
    : typeof v === "number"
    ? v.toLocaleString()
    : numberLike(v)
    ? Number(v).toLocaleString()
    : String(v);

const fmtCoord = (v: unknown) =>
  v === null || v === undefined
    ? ""
    : numberLike(v)
    ? Number(v).toFixed(3)
    : String(v);

const formatCell = (col: string, val: unknown) => {
  if (val === null || val === undefined) return "";
  const lc = col.toLowerCase();

  if (lc.match(/^(lat|latitude|y)$/)) return fmtCoord(val);
  if (lc.match(/^(lon|lng|longitude|x)$/)) return fmtCoord(val);

  if (
    lc.match(/(population|pop|gdp|area|count|total|size|weight)$/) ||
    typeof val === "number"
  ) {
    // special case area_km2 like values
    if (lc.includes("area") && numberLike(val)) {
      const n = Number(val);
      return `${Math.round(n).toLocaleString()} km²`;
    }
    return fmtNum(val);
  }
  return String(val);
};

const ResultsTable: React.FC<ResultsTableProps> = ({ rows, title }) => {
  // Collect all keys across rows (excluding huge/raw blobs)
  const columns = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      Object.keys(r as Record<string, any>).forEach((k) => {
        if (k === "raw" || k === "geometry") return;
        set.add(k);
      });
    }
    // Put some common columns earlier if present
    const preferred = [
      "id",
      "ne_id",
      "name",
      "country",
      "region",
      "continent",
      "incomeGroup",
      "population",
      "lat",
      "lon",
    ];
    const rest = [...set].filter((k) => !preferred.includes(k));
    return [...preferred.filter((k) => set.has(k)), ...rest];
  }, [rows]);

  // Mark numeric columns (for right-align & sorting)
  const numericCols = useMemo(() => {
    const map: Record<string, boolean> = {};
    columns.forEach((c) => {
      // sample the first non-null value to decide
      const sample = rows.find(
        (r) => (r as any)[c] !== null && (r as any)[c] !== undefined
      );
      map[c] = numberLike(sample ? (sample as any)[c] : undefined);
    });
    return map;
  }, [columns, rows]);

  const [sortKey, setSortKey] = useState<string>("");
  const [asc, setAsc] = useState<boolean>(true);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const dir = asc ? 1 : -1;
    const isNum = !!numericCols[sortKey];

    return [...rows].sort((a, b) => {
      const va = (a as any)[sortKey];
      const vb = (b as any)[sortKey];

      if (va === vb) return 0;
      if (va === undefined || va === null) return 1;
      if (vb === undefined || vb === null) return -1;

      if (isNum && (numberLike(va) || numberLike(vb))) {
        const na = Number(va);
        const nb = Number(vb);
        return (na - nb) * dir;
        }
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [rows, sortKey, asc, numericCols]);

  if (!rows || rows.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
      {title && (
        <div className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-800">
          {title}
        </div>
      )}

      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            {columns.map((col) => {
              const active = sortKey === col;
              return (
                <th
                  key={col}
                  onClick={() => {
                    if (sortKey === col) setAsc((v) => !v);
                    else {
                      setSortKey(col);
                      setAsc(true);
                    }
                  }}
                  className={`px-3 py-2 font-medium whitespace-nowrap cursor-pointer select-none border-b border-slate-200 ${
                    numericCols[col] ? "text-right" : "text-left"
                  } ${active ? "bg-slate-100" : ""}`}
                  title="Click to sort"
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    {active && <span>{asc ? "▲" : "▼"}</span>}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {sorted.map((row, idx) => (
            <tr
              key={(row as any).ne_id ?? (row as any).id ?? idx}
              className="border-t border-slate-200"
            >
              {columns.map((col) => (
                <td
                  key={col}
                  className={`px-3 py-2 text-slate-800 whitespace-nowrap ${
                    numericCols[col] ? "text-right" : "text-left"
                  }`}
                >
                  <span
                    className={
                      /^(name|country|continent|region|sub)/i.test(col)
                        ? "float-left"
                        : ""
                    }
                  >
                    {formatCell(col, (row as any)[col])}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-200">
        {rows.length.toLocaleString()} row{rows.length === 1 ? "" : "s"} ·{" "}
        {columns.length} column{columns.length === 1 ? "" : "s"}
      </div>
    </div>
  );
};

export default ResultsTable;
