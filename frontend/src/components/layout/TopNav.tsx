import React, { useEffect, useMemo, useState } from "react";
import { Menu, X, Sun, Moon, User } from "lucide-react";

export type TopNavLink = {
  label:
    | "Home"
    | "Dashboard"
    | "History"
    | "Result"
    | "Tutorials"
    | "About";
  onClick?: () => void;
};

export type TopNavProps = {
  brand?: string;
  links: TopNavLink[];
  rightArea?: React.ReactNode;
  isAuthenticated?: boolean;
  onAvatarClick?: () => void;
  onSignOut?: () => void;
};

// Map labels to default paths (Import removed)
const LABEL_TO_PATH: Record<TopNavLink["label"], string> = {
  Home: "/",
  Dashboard: "/dashboard",
  History: "/history",
  Result: "/result",
  Tutorials: "/tutorials",
  About: "/about",
};

// Hook to track current path (syncs with history.pushState)
function useActivePath() {
  const [path, setPath] = useState<string>(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

// Theme toggle button (dark/light)
function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(() =>
    document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") setIsDark(true);
  }, []);
  return (
    <button
      type="button"
      onClick={() => setIsDark((v) => !v)}
      aria-label="Toggle theme"
      className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border bg-background hover:bg-accent transition-colors"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

// Right side controls: theme toggle, sign out (if authed), user avatar
function TopRightArea({
  onAvatarClick,
  onSignOut,
  isAuthenticated,
}: {
  onAvatarClick?: () => void;
  onSignOut?: () => void;
  isAuthenticated?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
      {isAuthenticated && onSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          className="hidden sm:inline-flex items-center justify-center h-9 px-3 rounded-md border border-border bg-background hover:bg-accent text-sm font-medium"
          aria-label="Sign out"
        >
          Sign out
        </button>
      )}
      <button
        type="button"
        aria-label="User menu"
        onClick={onAvatarClick}
        className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-border bg-background"
      >
        <User className="h-4 w-4" />
      </button>
    </div>
  );
}

// Main TopNav component
export default function TopNav({
  brand = "GeoQuery",
  links,
  rightArea,
  isAuthenticated = false,
  onAvatarClick,
  onSignOut,
}: TopNavProps) {
  const activePath = useActivePath();
  const [open, setOpen] = useState(false);

  // Filter links: hide History if not authenticated
  const filtered = useMemo(() => {
    return links
      .filter((l) => (l.label === "History" ? isAuthenticated : true))
      .map((l) => ({ ...l, href: LABEL_TO_PATH[l.label] }));
  }, [links, isAuthenticated]);

  // Handle navigation (pushState)
  const handleNavigate = (href: string, onClick?: () => void) => {
    if (onClick) {
      onClick();
      setOpen(false);
      return;
    }
    if (window.location.pathname !== href) {
      window.history.pushState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
    setOpen(false);
  };

  return (
    <header role="banner" className="sticky top-0 z-50 bg-background border-b border-border">
      <nav
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center"
        aria-label="Top Navigation"
        role="navigation"
      >
        {/* Brand */}
        <div className="flex items-center gap-2">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate("/");
            }}
            className="text-base font-semibold tracking-wide"
          >
            {brand}
          </a>
        </div>

        {/* Desktop nav links */}
        <div className="ml-6 hidden md:flex items-center gap-1">
          {filtered.map(({ label, href, onClick }) => {
            const active = activePath === href;
            return (
              <button
                key={label}
                onClick={() => handleNavigate(href, onClick)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Right side controls (desktop) */}
        <div className="hidden md:flex items-center">
          {rightArea ?? (
            <TopRightArea
              onAvatarClick={onAvatarClick}
              onSignOut={onSignOut}
              isAuthenticated={isAuthenticated}
            />
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="ml-2 inline-flex md:hidden items-center justify-center h-9 w-9 rounded-md border border-border"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </nav>

      {/* Mobile nav drawer */}
      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-3 space-y-1">
            {filtered.map(({ label, href, onClick }) => {
              const active = activePath === href;
              return (
                <button
                  key={label}
                  onClick={() => handleNavigate(href, onClick)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                    active ? "bg-accent" : "hover:bg-accent"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {label}
                </button>
              );
            })}
            {/* Mobile right area */}
            <div className="pt-2 flex items-center gap-3">
              {rightArea ?? (
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                  {isAuthenticated && onSignOut && (
                    <button
                      type="button"
                      onClick={onSignOut}
                      className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-border bg-background hover:bg-accent text-sm font-medium"
                      aria-label="Sign out"
                    >
                      Sign out
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="User menu"
                    onClick={onAvatarClick}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-border bg-background"
                  >
                    <User className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}


