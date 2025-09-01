import React, { useEffect, useMemo, useState } from "react";
import { Menu, X, Sun, Moon, User } from "lucide-react";

export type TopNavLink = {
  label:
    | "Home"
    | "Dashboard"
    | "History"
    | "Import"
    | "Result"
    | "Tutorials"
    | "About";
  onClick?: () => void;
};

export type TopNavProps = {
  brand?: string;
  links: TopNavLink[];
  rightArea?: React.ReactNode;
  isAuthenticated?: boolean;       // NEW: controls guest vs logged-in behavior
  onAvatarClick?: () => void;      // NEW: hook to open login/register or user page
};

const LABEL_TO_PATH: Record<TopNavLink["label"], string> = {
  Home: "/",
  Dashboard: "/dashboard",
  History: "/history",
  Import: "/upload",
  Result: "/result",
  Tutorials: "/tutorials",
  About: "/about",
};

function useActivePath() {
  const [path, setPath] = useState<string>(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

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

function TopRightArea({ onAvatarClick }: { onAvatarClick?: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
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

export default function TopNav({
  brand = "GeoQuery",
  links,
  rightArea,
  isAuthenticated = false,
  onAvatarClick,
}: TopNavProps) {
  const activePath = useActivePath();
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return links
      .filter((l) => (l.label === "History" ? isAuthenticated : true)) // hide History for guests
      .map((l) => {
        let href = LABEL_TO_PATH[l.label];
        if (!isAuthenticated && l.label === "Import") {
          href = "/login"; // guest clicking Import leads to login
        }
        return { ...l, href };
      });
  }, [links, isAuthenticated]);

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

        <div className="ml-6 hidden md:flex items-center gap-1">
          {filtered.map(({ label, href, onClick }) => {
            const active = activePath === href;
            return (
              <button
                key={label}
                onClick={() => handleNavigate(href, onClick)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${active ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent"}
                `}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center">
          {rightArea ?? <TopRightArea onAvatarClick={onAvatarClick} />}
        </div>

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

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-3 space-y-1">
            {filtered.map(({ label, href, onClick }) => {
              const active = activePath === href;
              return (
                <button
                  key={label}
                  onClick={() => handleNavigate(href, onClick)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium
                    ${active ? "bg-accent" : "hover:bg-accent"}
                  `}
                  aria-current={active ? "page" : undefined}
                >
                  {label}
                </button>
              );
            })}
            <div className="pt-2 flex items-center gap-3">
              {rightArea ?? <TopRightArea onAvatarClick={onAvatarClick} />}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
