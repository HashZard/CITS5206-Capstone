import React, { useEffect, useState } from "react";
import { MapPin, BarChart3, Globe } from "lucide-react";
import TopNav, { TopNavLink } from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";

import ImportPage from "@/pages/Import";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import UserPage from "@/pages/User";

import { getStoredUser, setStoredUser, User } from "@/lib/auth";

const links: TopNavLink[] = [
  { label: "Home" },
  { label: "Dashboard" },
  { label: "History" },
  { label: "Import" },
  { label: "Result" },
  { label: "Tutorials" },
  { label: "About" },
];

function HomeView() {
  return (
    <div className="max-w-6xl mx-auto">
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

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <div className="backdrop-blur-sm bg-white/10 border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 rounded-lg p-6">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-white text-xl text-center mb-1">Natural Language</h3>
          <p className="text-white/70 text-center">
            Ask questions in plain English.
          </p>
        </div>
        <div className="backdrop-blur-sm bg-white/10 border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 rounded-lg p-6">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-white text-xl text-center mb-1">Smart Analytics</h3>
          <p className="text-white/70 text-center">
            Get instant insights and visualizations.
          </p>
        </div>
        <div className="backdrop-blur-sm bg-white/10 border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 rounded-lg p-6">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-white text-xl text-center mb-1">Interactive Maps</h3>
          <p className="text-white/70 text-center">
            Explore data with dynamic mapping.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [user, setUser] = useState<User | null>(() => getStoredUser());

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!user && path === "/upload") {
      window.history.pushState({}, "", "/login");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [user, path]);

  const isAuthed = !!user;

  const go = (to: string) => {
    if (window.location.pathname !== to) {
      window.history.pushState({}, "", to);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-600 to-blue-600">
      <TopNav brand="GeoQuery" links={links} isAuthenticated={isAuthed} onAvatarClick={onAvatarClick} />
      <main className="flex-1 p-8">
        {path === "/login" && (
          <Login
            onLogin={handleLogin}
            onGoRegister={() => go("/register")}
          />
        )}
        {path === "/register" && (
          <Register
            onRegister={handleRegister}
            onGoLogin={() => go("/login")}
          />
        )}
        {path === "/user" && isAuthed && <UserPage email={user!.email} />}
        {path === "/upload" && isAuthed && <ImportPage />}
        {path !== "/login" && path !== "/register" && path !== "/user" && path !== "/upload" && <HomeView />}

        {isAuthed && (
          <div className="fixed bottom-4 right-4">
            <button
              onClick={handleLogout}
              className="bg-white text-purple-700 font-medium py-2 px-4 rounded-md hover:bg-gray-100"
              aria-label="Sign out"
            >
              Sign out
            </button>
          </div>
        )}
      </main>
      <Footer brand="GeoQuery" />
    </div>
  );
}

