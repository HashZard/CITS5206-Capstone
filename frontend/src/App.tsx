import React, { useEffect, useState } from "react";
import { MapPin, BarChart3, Globe, Send, Sparkles } from "lucide-react";
import TopNav, { TopNavLink } from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import UserPage from "@/pages/User";
import GeoQueryResults from "@/pages/Result";
import HistoryPage from "@/pages/History";
import AboutPage from "@/pages/About";
import TutorialsPage from "@/pages/Tutorials";


import { getStoredUser, setStoredUser, User } from "@/lib/auth";
import "@/styles/theme.css"; // your palette utilities (btn-primary, chip, card-glass, etc.)

const links: TopNavLink[] = [
  { label: "Home" },
  { label: "History" },
  { label: "Result" },
  { label: "Tutorials" },
  { label: "About" },
];

function HomeView({ onQuery }: { onQuery: (query: string) => void }) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    onQuery(query.trim());
    setIsLoading(false);
  };

  const suggestions = [
    "Find the largest cities near rivers in Europe",
    "Show population density of coastal areas in Asia",
    "What are the highest mountains in South America?",
    "Analyze forest coverage in tropical regions",
  ];

  return (
    <>
      <div className="relative -mx-8 -mt-8">
        <section
          className="relative min-h-[75vh] bg-cover bg-center"
          style={{ backgroundImage: "url(/earth.jpg)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70" />
          <div className="relative z-10 max-w-6xl mx-auto px-8 py-16">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center mb-6">
                <MapPin className="w-12 h-12 text-white mr-3" />
                <h1 className="text-5xl font-bold text-white">GeoQuery</h1>
              </div>
              <p className="text-xl text-white/90 mb-2">Ask Your Map Anything</p>
              <p className="text-white/85 max-w-2xl mx-auto mb-8">
                Transform natural language into powerful geographic insights. Query,
                analyze, and visualize spatial data like never before.
              </p>

              <div className="max-w-4xl mx-auto mb-8">
                <form onSubmit={handleSubmit} className="relative">
                  <div className="relative card-glass rounded-2xl p-2">
                    <div className="flex items-center">
                      <div className="flex-1 relative">
                        <textarea
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Ask about geographic data, locations, demographics, climate patterns..."
                          className="w-full bg-transparent text-white placeholder-white/65 border-none outline-none resize-none px-4 py-3 text-lg leading-6 min-h-[3rem] max-h-32"
                          rows={1}
                          style={{
                            resize: "none",
                            overflow: "hidden",
                            height: "auto",
                            minHeight: "3rem",
                          }}
                          onInput={(e) => {
                            const t = e.target as HTMLTextAreaElement;
                            t.style.height = "auto";
                            t.style.height = Math.min(t.scrollHeight, 128) + "px";
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
                        className="ml-2 mr-2 btn-primary disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <Sparkles className="w-5 h-5 text-black/60 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5 text-black/80" />
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  {suggestions.map((s, i) => (
                    <button key={i} className="chip" onClick={() => setQuery(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* black section below hero */}
      <div className="-mx-8 bg-black">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto py-12 px-8">
          <div className="backdrop-blur-sm bg-white/10 border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 rounded-lg p-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(178,201,173,.28)" }}
            >
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-white text-xl text-center mb-1">Natural Language</h3>
            <p className="text-white/75 text-center">Ask questions in plain English.</p>
          </div>

          <div className="backdrop-blur-sm bg-white/10 border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 rounded-lg p-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(178,201,173,.28)" }}
            >
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-white text-xl text-center mb-1">Smart Analytics</h3>
            <p className="text-white/75 text-center">Get instant insights and visualizations.</p>
          </div>

          <div className="backdrop-blur-sm bg-white/10 border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 rounded-lg p-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(178,201,173,.28)" }}
            >
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-white text-xl text-center mb-1">Interactive Maps</h3>
            <p className="text-white/75 text-center">Explore data with dynamic mapping.</p>
          </div>
        </div>
      </div>
    </>
  );
}

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
    <div className="min-h-screen flex flex-col bg-black">
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

        {[
            "/login",
            "/register",
            "/user",
            "/result",
            "/history",
            "/about",
            "/tutorials"       // <-- add this
          ].includes(path)
            ? null
            : <HomeView onQuery={handleQuery} />}

      </main>

      <Footer brand="GeoQuery" />
    </div>
  );
}
