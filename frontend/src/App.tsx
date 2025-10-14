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
import TutorialsPage from "@/pages/Tutorials";
import RawValuePage from "@/pages/RawValue"; // raw backend payloads

import { getStoredUser, setStoredUser, User } from "@/lib/auth";
import SuggestInput from "@/components/suggest/SuggestInput";

/** Top navigation links */
const links: TopNavLink[] = [
  { label: "Home" },
  { label: "History" },
  { label: "Result" },
  { label: "Tutorials" },
  { label: "About" },
  { label: "Raw" }, // goes to /raw (TopNav), App also supports /rawvalue
];

/** Homepage content */
function HomeView({ onQuery }: { onQuery: (query: string) => void }) {
  const [query, setQuery] = useState("");

  const suggestions = [
    "Show the biggest continents or land regions by area (over 500,000 km²).",
    "List countries in the Southern Hemisphere.",
    "Highlight countries whose GDP is above their continent’s average.",
    "Show major mountain ranges worldwide.",
  ];

  const handleSuggestionClick = (suggestion: string) => setQuery(suggestion);

  return (
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

        {/* Search glass */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="backdrop-blur-md bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl">
            <SuggestInput
              value={query}
              onChange={setQuery}
              onSubmit={(val) => {
                if (!val) return;
                onQuery(val);
              }}
            />
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

      {/* Spacer pushes cards down */}
      <div className="flex-1" />

      {/* Feature cards */}
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
      {/* Background image (keep earth.jpg site-wide) */}
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

        {path === "/result" && <GeoQueryResults query={userQuery} />}

        {path === "/history" && <HistoryPage />}

        {path === "/about" && <AboutPage />}

        {path === "/tutorials" && <TutorialsPage />}

        {/* Raw page: support both /raw (nav) and /rawvalue (legacy) */}
        {(path === "/raw" || path === "/rawvalue") && <RawValuePage />}

        {/* Default homepage */}
        {[
          "/login",
          "/register",
          "/user",
          "/result",
          "/history",
          "/about",
          "/tutorials",
          "/raw",
          "/rawvalue",
        ].includes(path)
          ? null
          : <HomeView onQuery={handleQuery} />}
      </main>

      <Footer brand="GeoQuery" />
    </div>
  );
}