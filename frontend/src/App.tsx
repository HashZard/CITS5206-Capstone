import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, BarChart3, Globe } from "lucide-react";

import TopNav, { TopNavLink } from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";
import ImportPage from "@/pages/Import"; // 新增导入页面

const links: TopNavLink[] = [
  { label: "Home" },       // -> /
  { label: "Dashboard" },  // -> /dashboard
  { label: "History" },    // -> /history
  { label: "Import" },     // -> /upload
  { label: "Result" },     // -> /result
  { label: "Tutorials" },  // -> /tutorials
  { label: "About" },      // -> /about
];

// 提取首页现有内容为一个组件，方便条件渲染
function HomeView() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center mb-6">
          <MapPin className="w-12 h-12 text-white mr-3" />
          <h1 className="text-5xl font-bold text-white">GeoQuery</h1>
        </div>
        <p className="text-xl text-white/90 mb-2">Ask Your Map Anything</p>
        <p className="text-white/80 max-w-2xl mx-auto">
          Transform natural language into powerful geographic insights. Query,
          analyze, and visualize spatial data like never before.
        </p>
      </div>

      {/* Search Section */}
      <div className="max-w-4xl mx-auto mb-16">
        <div className="flex gap-4">
          <Input
            placeholder="Try: 'Show me population density in California'"
            className="bg-white/90 backdrop-blur-sm border-0 rounded-lg px-6 py-4 text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-white/30 text-lg flex-1"
          />
          <Button className="bg-white text-purple-600 hover:bg-gray-50 font-medium px-8 py-4 text-lg transition-all duration-200 hover:scale-105">
            Try Demo →
          </Button>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <Card className="backdrop-blur-sm bg-white/10 border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-white text-xl">Natural Language</CardTitle>
            <CardDescription className="text-white/80">
              Ask questions in plain English
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/70 text-center">
              Transform your questions into powerful geographic insights with our advanced natural language processing.
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-white/10 border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-white text-xl">Smart Analytics</CardTitle>
            <CardDescription className="text-white/80">
              Get instant insights and visualizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/70 text-center">
              Analyze spatial data with intelligent algorithms that provide meaningful insights and beautiful visualizations.
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-white/10 border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-white text-xl">Interactive Maps</CardTitle>
            <CardDescription className="text-white/80">
              Explore data with dynamic mapping
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-white/70 text-center">
              Interact with your data through dynamic, responsive maps that bring geographic information to life.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function App() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-600 to-blue-600">
      <TopNav brand="GeoQuery" links={links} />
      <main className="flex-1 p-8">
        {path === "/upload" ? <ImportPage /> : <HomeView />}
      </main>
      <Footer brand="GeoQuery" />
    </div>
  );
}

export default App;
