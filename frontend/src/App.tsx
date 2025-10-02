import React, { useEffect, useState } from "react";
import { MapPin, BarChart3, Globe } from "lucide-react";
import TopNav, { TopNavLink } from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import UserPage from "@/pages/User";
import GeoQueryResults from "@/pages/Result";
import HistoryPage from "@/pages/History";
import AboutPage from "@/pages/About";
import TutorialsPage from "@/pages/Tutorials"; // <-- NEW

import { getStoredUser, setStoredUser, User } from "@/lib/auth";

// type-ahead input
import SuggestInput from "@/components/suggest/SuggestInput";

/** -------------------------
 * Auto-select mock testCase FROM QUERY (frontend-only)
 * -------------------------- */
function selectMockCaseFromQuery(raw: string): number {
  const q = (raw || "").toLowerCase();
  const hasAny = (kws: string[]) => kws.some(k => q.includes(k));

  // Case 4 — landforms / geography feature types / marine
  if (
    hasAny([
      "mountain", "range", "ranges", "plateau", "desert", "wetland", "tundra", "delta",
      "depression", "isthmus", "peninsula", "cape", "valley", "gorge", "foothill",
      "basin", "coast", "coastal", "lowland", "highland", "geoarea", "landform",
      "island", "archipelago", "lake", "reservoir", "fjord", "inlet", "gulf", "bay",
      "strait", "channel", "lagoon", "reef", "sound", "ocean", "sea", "marine", "rivers"
    ])
  ) return 4;

  // Case 3 — GDP / economy / income group
  if (hasAny(["gdp", "per capita", "income group", "economic", "economy", "median gdp", "gdp-to-area"])) {
    return 3;
  }

  // Case 2 — hemisphere / equator / centroid latitude
  if (
    hasAny([
      "southern hemisphere", "below the equator", "south of the equator",
      "lat < 0", "latitude < 0", "equator", "centroid", "±20", "+-20", "±20°", "latitude"
    ])
  ) {
    return 2;
  }

  // Default Case 1 — generic geography_regions / broad queries
  return 1;
}

/** Top navigation links (Dashboard removed) */
const links: TopNavLink[] = [
  { label: "Home" },
  { label: "History" },
  { label: "Result" },
  { label: "Tutorials" },
  { label: "About" },
];

/** Homepage content extracted for conditional rendering */
function HomeView({ onQuery }: { onQuery: (query: string) => void }) {
  const [query, setQuery] = useState("");

  const suggestions = [
    "Show the biggest continents or land regions by area (over 500,000 km²).",
    "List countries in the Southern Hemisphere.",
    "Highlight countries whose GDP is above their continent’s average.",
    "Show major mountain ranges worldwide."
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  return (
    // Make the home section a flex column with a min height so we can push the cards to the bottom
    <div className="max-w-6xl mx-auto flex flex-col min-h-[80vh]">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-6">
          <MapPin className="w-12 h-12 text-white mr-3" />
          <h1 className="text-5xl font-bold text-white">GeoQuery</h1>
        </div>
        <p className="text-xl text-white/90 mb-2">Ask Your Map Anything</p>
        <p className="text-white/80 max-w-2xl mx-auto mb-8">
          Transform natural language into powerful geographic insights. Query,
          analyze, and visualize spatial data like never before.
        </p>

        {/* Black-tinted glass container for input + chips */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="backdrop-blur-md bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl">
            <SuggestInput
              value={query}
              onChange={setQuery}
              onSubmit={(val) => {
                if (!val) return;
                onQuery(val);
              }}
              // placeholder="Ask about geographic data, locations, demographics, climate patterns..."
              // minChars={2}
              // maxItems={8}
            />

            {/* Quick chips inside the glass card */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-sm rounded-full border border-white/10 transition-all duration-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer pushes the next block (feature cards) to the bottom of this section */}
      <div className="flex-1" />

      {/* Feature cards at the bottom */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto pb-2">
        <div className="backdrop-blur-md bg-black/40 border border-white/20 hover:bg-black/50 transition-all duration-300 hover:scale-105 rounded-lg p-6 shadow-lg">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-white text-xl text-center mb-1">Natural Language</h3>
          <p className="text-white/70 text-center">Ask questions in plain English.</p>
        </div>
        <div className="backdrop-blur-md bg-black/40 border border-white/20 hover:bg-black/50 transition-all duration-300 hover:scale-105 rounded-lg p-6 shadow-lg">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-white text-xl text-center mb-1">Smart Analytics</h3>
          <p className="text-white/70 text-center">Get instant insights and visualizations.</p>
        </div>
        <div className="backdrop-blur-md bg-black/40 border border-white/20 hover:bg-black/50 transition-all duration-300 hover:scale-105 rounded-lg p-6 shadow-lg">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-white text-xl text-center mb-1">Interactive Maps</h3>
          <p className="text-white/70 text-center">Explore data with dynamic mapping.</p>
        </div>
      </div>
    </div>
  );
}

/** App shell with naive client-side routing and frontend-only auth */
export default function App() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [userQuery, setUserQuery] = useState<string>("");
  const [mockCase, setMockCase] = useState<number>(1); // auto-selected per query

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const isAuthed = !!user;

  const go = (to: string) => {
    if (window.location.pathname !== to) {
      window.history.pushState({}, "", to);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const handleQuery = (query: string) => {
    setUserQuery(query);
    setMockCase(selectMockCaseFromQuery(query)); // auto-pick testCase here
    go("/result");
  };

  const handleLogin = (email: string) => {
    const next = { email };
    setUser(next);
    setStoredUser(next);
    go("/");
  };

  const handleRegister = (email: string) => {
    const next = { email };
    setUser(next);
    setStoredUser(next);
    go("/");
  };

  const handleLogout = () => {
    setUser(null);
    setStoredUser(null);
    go("/");
  };

  const onAvatarClick = () => {
    if (!isAuthed) go("/login");
    else go("/user");
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background image (earth.jpg must be in /public) */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/earth.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
          }}
        />
      </div>

      <TopNav
        brand="GeoQuery"
        links={links}
        isAuthenticated={isAuthed}
        onAvatarClick={onAvatarClick}
        onSignOut={handleLogout}
      />

      <main className="flex-1 p-8">
        {path === "/login" && (
          <Login onLogin={handleLogin} onGoRegister={() => go("/register")} />
        )}

        {path === "/register" && (
          <Register onRegister={handleRegister} onGoLogin={() => go("/login")} />
        )}

        {path === "/user" && isAuthed && <UserPage email={user!.email} />}

        {/* Pass the auto-selected test case to Results */}
        {path === "/result" && <GeoQueryResults query={userQuery} testCase={mockCase} />}

        {path === "/history" && <HistoryPage />}

        {path === "/about" && <AboutPage />}

        {/* NEW: Tutorials route */}
        {path === "/tutorials" && <TutorialsPage />}

        {/* Default homepage (mutually exclusive) */}
        {[
          "/login",
          "/register",
          "/user",
          "/result",
          "/history",
          "/about",
          "/tutorials", // <-- include here so Home doesn't render underneath
        ].includes(path)
          ? null
          : <HomeView onQuery={handleQuery} />}
      </main>

      <Footer brand="GeoQuery" />
    </div>
  );
}
