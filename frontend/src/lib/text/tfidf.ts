import { tokenize } from "./tokenize";

type Doc = { id: string; text: string };

export type TfIdfIndex = {
  vocab: Map<string, number>;
  docs: Doc[];
  N: number;
};

export function buildIndex(docs: Doc[]): TfIdfIndex {
  const df = new Map<string, number>();
  for (const d of docs) {
    const toks = Array.from(new Set(tokenize(d.text)));
    for (const t of toks) df.set(t, (df.get(t) || 0) + 1);
  }
  return { vocab: df, docs, N: docs.length };
}

function tf(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) || 0) + 1);
  return m;
}

function idf(term: string, idx: TfIdfIndex): number {
  const df = idx.vocab.get(term) || 0;
  return Math.log((idx.N + 1) / (df + 1)) + 1;
}

function vec(tokens: string[], idx: TfIdfIndex): Map<string, number> {
  const tfv = tf(tokens);
  const out = new Map<string, number>();
  for (const [term, f] of tfv) out.set(term, f * idf(term, idx));
  return out;
}

function dot(a: Map<string, number>, b: Map<string, number>): number {
  let s = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const [k, v] of small) {
    const w = large.get(k);
    if (w) s += v * w;
  }
  return s;
}

function norm(a: Map<string, number>): number {
  let s = 0;
  for (const v of a.values()) s += v * v;
  return Math.sqrt(s);
}

export function topKSimilar(query: string, idx: TfIdfIndex, k = 5) {
  const qv = vec(tokenize(query), idx);
  const qn = norm(qv) || 1e-9;
  const scored = idx.docs.map(d => {
    const dv = vec(tokenize(d.text), idx);
    const dn = norm(dv) || 1e-9;
    const sim = dot(qv, dv) / (qn * dn);
    return { id: d.id, text: d.text, score: sim };
  });
  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}
