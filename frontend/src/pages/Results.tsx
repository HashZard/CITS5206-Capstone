// src/pages/Results.tsx
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map, BarChart3, ArrowLeft, Globe } from "lucide-react";

function navigateTo(href: string) {
  if (window.location.pathname !== href) {
    window.history.pushState({}, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

export default function Results() {
  const [query, setQuery] = useState("Show the largest rivers in India");
  const [results, setResults] = useState<
    { id: string; name: string; lengthKm: number; description: string }[]
  >([]);

  useEffect(() => {
    setTimeout(() => {
      setResults([
        {
          id: "ganga",
          name: "Ganga River",
          lengthKm: 2525,
          description: "The Ganga is the longest river in India and holds great cultural and spiritual importance.",
        },
        {
          id: "godavari",
          name: "Godavari River",
          lengthKm: 1465,
          description: "Known as the Dakshina Ganga, it flows eastward across the Deccan plateau.",
        },
        {
          id: "yamuna",
          name: "Yamuna River",
          lengthKm: 1376,
          description: "Originates from Yamunotri glacier and flows through Delhi before merging with Ganga.",
        },
        {
          id: "narmada",
          name: "Narmada River",
          lengthKm: 1312,
          description: "Flows westward into the Arabian Sea, forming the scenic Marble Rocks gorge.",
        },
      ]);
    }, 600);
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Query header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Query Results</h1>
          <p className="text-muted-foreground mt-1">
            Query: <span className="font-medium text-foreground">{query}</span>
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigateTo("/dashboard")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </header>

      {/* Results grid */}
      {results.length === 0 ? (
        <div className="text-center text-muted-foreground py-20">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-75" />
          <p>Loading results…</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {results.map((r) => (
            <Card key={r.id} className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Globe className="w-5 h-5" /> {r.name}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Length: {r.lengthKm.toLocaleString()} km
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Map visualization placeholder */}
                <div className="rounded-lg bg-gradient-to-br from-blue-200 to-purple-300 dark:from-blue-900 dark:to-purple-900 h-48 flex items-center justify-center">
                  <Map className="w-10 h-10 text-foreground/80" />
                  <span className="ml-2 text-foreground/90">[Map of {r.name}]</span>
                </div>
                <p className="text-muted-foreground text-sm">{r.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
