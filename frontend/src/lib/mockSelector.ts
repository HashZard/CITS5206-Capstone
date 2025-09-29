// src/lib/mockSelector.ts
// Decide which mock test_case (1..4) to use based on the query text.
// This is lightweight, deterministic, and entirely frontend.

const hasAny = (q: string, kws: string[]) => kws.some(k => q.includes(k));

export function selectMockCaseFromQuery(raw: string): number {
  const q = (raw || "").toLowerCase();

  // Case 4 — landforms / geography feature types (ranges, plateaus, deserts, wetlands, islands, marine terms, etc)
  if (
    hasAny(q, [
      "mountain", "range", "ranges", "plateau", "desert", "wetland", "tundra", "delta",
      "depression", "isthmus", "peninsula", "cape", "valley", "gorge", "foothill",
      "basin", "coast", "coastal",
      "island", "archipelago", "islands",
      "lake", "reservoir", "fjord", "inlet", "gulf", "bay", "strait", "channel",
      "lagoon", "reef", "sound",
      "marine", "ocean", "sea", "lowland", "highland", "geoarea", "landform"
    ])
  ) return 4;

  // Case 3 — GDP / income / economy style questions
  if (
    hasAny(q, [
      "gdp", "per capita", "income group", "median gdp", "gdp-to-area", "economic", "economy"
    ])
  ) return 3;

  // Case 2 — hemisphere / equator / centroid-latitude style questions (country-centric)
  if (
    hasAny(q, [
      "southern hemisphere", "below the equator", "lat < 0", "latitude < 0",
      "south of the equator", "equator", "centroid", "±20°", "+-20", "±20"
    ])
  ) return 2;

  // Fallback Case 1 — generic geography_regions / big areas
  return 1;
}
