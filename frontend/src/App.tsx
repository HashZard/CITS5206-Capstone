import React, { useEffect, useState } from "react";
import { MapPin, BarChart3, Globe, Send, Sparkles } from "lucide-react";
import TopNav, { TopNavLink } from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import UserPage from "@/pages/User";
import GeoQueryResults from "@/pages/Result";
import HistoryPage from "@/pages/History";
import AboutPage from "@/pages/About"; // <-- NEW

import { getStoredUser, setStoredUser, User } from "@/lib/auth";

/** Top navigation links */
const links: TopNavLink[] = [
  { label: "Home" },
  { label: "Dashboard" },
  { label: "History" },
  { label: "Result" },
  { label: "Tutorials" },
  { label: "About" },
];

/** Homepage content extracted for conditional rendering */
function HomeView({ onQuery }: { onQuery: (query: string) => void }) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    onQuery(query.trim());
    setIsLoading(false);
  };

  const suggestions = [
    "Find the largest cities near rivers in Europe",
    "Show population density of coastal areas in Asia",
    "What are the highest mountains in South America?",
    "Analyze forest coverage in tropical regions",
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  return (
    <div className="max-w-6xl mx-auto">
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

        {/* Query Input Section */}
        <div className="max-w-4xl mx-auto mb-8">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative backdrop-blur-sm bg-white/10 border border-white/20 rounded-2xl p-2">
              <div className="flex items-center">
                <div className="flex-1 relative">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask about geographic data, locations, demographics, climate patterns..."
                    className="w-full bg-transparent text-white placeholder-white/60 border-none outline-none resize-none px-4 py-3 text-lg leading-6 min-h-[3rem] max-h-32"
                    rows={1}
                    style={{
                      resize: "none",
                      overflow: "hidden",
                      height: "auto",
                      minHeight: "3rem",
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = Math.min(target.scrollHeight, 128) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  className="ml-2 mr-2 p-3 bg白/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed rounded-xl transition-all duration-200 group"
                >
                  {isLoading ? (
                    <Sparkles className="w-5 h-5 text-white/70 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 text白 group-hover:text-white/90 disabled:text-white/50" />
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Query Suggestions */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-sm rounded-full border border-white/20 hover:border-white/30 transition-all duration-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <div className="backdrop-blur-sm bg-white/10 border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 rounded-lg p-6">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-white text-xl text-center mb-1">Natural Language</h3>
          <p className="text-white/70 text-center">Ask questions in plain English.</p>
        </div>
        <div className="backdrop-blur-sm bg-white/10 border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 rounded-lg p-6">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-white text-xl text-center mb-1">Smart Analytics</h3>
          <p className="text-white/70 text-center">Get instant insights and visualizations.</p>
        </div>
        <div className="backdrop-blur-sm bg白/10 border白/20 hover:bg白/15 transition-all duration-300 hover:scale-105 rounded-lg p-6">
          <div className="w-16 h-16 bg白/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text白" />
          </div>
          <h3 className="text白 text-xl text-center mb-1">Interactive Maps</h3>
          <p className="text白/70 text-center">Explore data with dynamic mapping.</p>
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-600/80 to-blue-600/85">
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

        {path === "/about" && <AboutPage />}{/* <-- NEW */}

        {/* Default homepage (mutually exclusive) */}
        {["/login", "/register", "/user", "/result", "/history", "/about"].includes(path)
          ? null
          : <HomeView onQuery={handleQuery} />}
      </main>

      <Footer brand="GeoQuery" />
    </div>
  );
}