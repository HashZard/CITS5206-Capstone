import React, { useEffect, useState } from "react";
import { MapPin, BarChart3, Globe } from "lucide-react";
import TopNav, { TopNavLink } from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";

import ImportPage from "@/pages/Import";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import UserPage from "@/pages/User";

import { getStoredUser, setStoredUser, User } from "@/lib/auth";

/** Top navigation links; TopNav will hide History for guests */
const links: TopNavLink[] = [
  { label: "Home" },
  { label: "Dashboard" },
  { label: "History" },
  { label: "Import" },
  { label: "Result" },
  { label: "Tutorials" },
  { label: "About" },
];

/** Homepage content extracted for conditional rendering */
function HomeView() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
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
        <div className="backdrop-blur-sm bg-white/10 border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 rounded-lg p-6">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
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
  // Track current path to switch views without a router
  const [path, setPath] = useState(() => window.location.pathname);
  // Auth state persisted to localStorage (frontend-only)
  const [user, setUser] = useState<User | null>(() => getStoredUser());

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Guard: guests cannot access /upload; redirect to /login
  useEffect(() => {
    if (!user && path === "/upload") {
      window.history.pushState({}, "", "/login");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [user, path]);

  const isAuthed = !!user;

  /** Push-state navigation helper */
  const go = (to: string) => {
    if (window.location.pathname !== to) {
      window.history.pushState({}, "", to);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  /** Login success handler (frontend-only) */
  const handleLogin = (email: string) => {
    const next = { email };
    setUser(next);
    setStoredUser(next);
    go("/");
  };

  /** Register success handler (frontend-only) */
  const handleRegister = (email: string) => {
    const next = { email };
    setUser(next);
    setStoredUser(next);
    go("/");
  };

  /** Sign out handler */
  const handleLogout = () => {
    setUser(null);
    setStoredUser(null);
    go("/");
  };

  /** Avatar behavior: guest → /login; authed → /user */
  const onAvatarClick = () => {
    if (!isAuthed) go("/login");
    else go("/user");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-600 to-blue-600">
      {/* Top navigation: passes auth state, avatar and sign-out handlers */}
      <TopNav
        brand="GeoQuery"
        links={links}
        isAuthenticated={isAuthed}
        onAvatarClick={onAvatarClick}
        onSignOut={handleLogout}
      />

      <main className="flex-1 p-8">
        {/* Simple view switching based on pathname */}
        {path === "/login" && (
          <Login onLogin={handleLogin} onGoRegister={() => go("/register")} />
        )}

        {path === "/register" && (
          <Register onRegister={handleRegister} onGoLogin={() => go("/login")} />
        )}

        {path === "/user" && isAuthed && <UserPage email={user!.email} />}

        {path === "/upload" && isAuthed && <ImportPage />}

        {/* Fallback to homepage for other paths */}
        {path !== "/login" &&
          path !== "/register" &&
          path !== "/user" &&
          path !== "/upload" && <HomeView />}
      </main>

      <Footer brand="GeoQuery" />
    </div>
  );
}