import extraList from "./seedQuestions.extra.json";
import { classifyQuestion } from "../lib/classify";


export type SeedQuestion = {
  id: string;
  text: string;
  category?: string;
  tags?: string[];
};

const BASE: SeedQuestion[] = [
  { id: "base1", text: "Which country has the largest GDP?", category: "Ranking" },
  { id: "base2", text: "Show countries bordering Germany.", category: "Spatial Relation" },
  { id: "base3", text: "Draw a choropleth of GDP per capita for South America.", category: "Map Thematic" },
  { id: "base4", text: "Top 10 countries by life expectancy.", category: "Ranking" }
];

const FROM_EXTRA: SeedQuestion[] = (extraList as string[]).map((text, i) => {
  const c = classifyQuestion(text);
  return { id: `u${i + 1}`, text, category: c.category };
});

export const SEED_QUESTIONS: SeedQuestion[] = [...BASE, ...FROM_EXTRA];
