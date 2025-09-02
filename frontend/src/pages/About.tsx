// src/pages/About.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Users, Code2, Target, Globe } from "lucide-react";

export default function About() {
  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Header */}
      <header className="text-center mb-10">
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
          <Lightbulb className="w-8 h-8 text-foreground" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">About GeoQuery</h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
          A language-based geographic reasoning platform developed as part of the{" "}
          <span className="font-semibold text-foreground">CITS5206 Capstone Project</span> at UWA.
        </p>
      </header>

      {/* Project Aim */}
      <Card className="backdrop-blur-sm bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Target className="w-5 h-5" /> Project Aim
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-3">
          <p>
            GeoQuery bridges the gap between natural language and geospatial data.
            Our goal is to empower users—researchers, decision makers, and the
            public—to query maps and spatial datasets in plain English and receive
            clear, interactive visualizations.
          </p>
          <p>
            By combining natural language processing, smart analytics, and
            geospatial visualization, we aim to make geographic insights
            accessible without requiring technical GIS expertise.
          </p>
        </CardContent>
      </Card>

      {/* Key Features */}
      <Card className="backdrop-blur-sm bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Globe className="w-5 h-5" /> Key Features
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6 text-muted-foreground">
          <div>
            <h3 className="font-semibold text-foreground mb-1">Natural Language Queries</h3>
            <p>Ask geographic questions in plain English and get meaningful results.</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Interactive Dashboard</h3>
            <p>Dynamic sidebar, history of queries, and customizable map layers.</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Smart Analytics</h3>
            <p>Automatic calculation of statistics, top regions, and insights.</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Export Options</h3>
            <p>Download results in PDF, CSV, or PNG formats for reports and sharing.</p>
          </div>
        </CardContent>
      </Card>

      {/* Technology Stack */}
      <Card className="backdrop-blur-sm bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Code2 className="w-5 h-5" /> Technology Stack
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li>Frontend: React, TypeScript, TailwindCSS, shadcn/ui components</li>
            <li>Mapping: Planned integration with Leaflet / Mapbox</li>
            <li>Backend (future): Flask / FastAPI for query processing</li>
            <li>Data: Natural Earth datasets & other open geospatial sources</li>
            <li>Deployment: Docker, Vite, GitHub CI/CD</li>
          </ul>
        </CardContent>
      </Card>

      {/* Team Section */}
      <Card className="backdrop-blur-sm bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Users className="w-5 h-5" /> Project Team
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2">
          <p>
            This project was developed by a dedicated student team under{" "}
            <span className="font-semibold text-foreground">The University of Western Australia</span>.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><span className="font-medium text-foreground">Anandhu Raveendran</span> – Frontend Development</li>
            <li>Yao Qin – UI Components & Design</li>
            <li>Other teammates – Backend, Data Integration, Documentation</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
