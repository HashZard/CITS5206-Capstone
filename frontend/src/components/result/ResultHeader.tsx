/**
 * ResultHeader - Result page header component
 * 
 * Features: Display title and metadata for query result page
 * - Display user input query statement
 * - Show AI model information used
 * - Indicate if in fallback mode
 * - Beautiful gradient background design
 * 
 * Use cases: Top title area of query result page
 */

import React from "react";
import { MetaData } from '@/types/result';

interface ResultHeaderProps {
  query: string;
  meta: MetaData;
}

export const ResultHeader: React.FC<ResultHeaderProps> = ({ query, meta }) => (
  <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-2xl p-8 mb-8 relative overflow-hidden">
    <div className="absolute inset-0 bg-white/60 rounded-2xl"></div>
    <div className="relative z-10">
      <h1 className="text-3xl font-semibold mb-2 text-slate-800">Search Results</h1>
      <p className="text-slate-700 text-lg">"{query}"</p>
      {meta.model && (
        <p className="text-slate-600 text-sm mt-2">
          model: {meta.model} {meta.isFallback ? "(fallback)" : ""}
        </p>
      )}
    </div>
  </div>
);
