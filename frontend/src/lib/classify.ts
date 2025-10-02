import { tokenize } from "./text/tokenize";

export type Classification = { category: string; confidence: number };

const RULES: { category: string; keywords: string[] }[] = [
  { category: "Ranking",        keywords: ["top","largest","smallest","rank","highest","lowest"] },
  { category: "Filter",         keywords: ["show","find","with","where","over","under","greater","less","population","gdp","per capita"] },
  { category: "Comparison",     keywords: ["compare","vs","versus","between","difference"] },
  { category: "Map Highlight",  keywords: ["highlight","outline","shade","emphasize"] },
  { category: "Map Thematic",   keywords: ["choropleth","heatmap","density","per capita"] },
  { category: "Spatial Relation", keywords: ["border","borders","neighbor","within","intersect"] },
  { category: "Aggregation",    keywords: ["count","sum","avg","average","total"] },
  { category: "Lookup",         keywords: ["list","what is","capital","name","names"] },
];

export function classifyQuestion(q: string): Classification {
  const text = q.toLowerCase();
  const toks = new Set(tokenize(q));
  let best = "General";
  let score = 0;

  for (const r of RULES) {
    let hits = 0;
    for (const kw of r.keywords) {
      if (kw.includes(" ")) { if (text.includes(kw)) hits++; }
      else if (toks.has(kw)) { hits++; }
    }
    if (hits > score) { score = hits; best = r.category; }
  }
  return { category: best, confidence: Math.min(1, score / 3) };
}
