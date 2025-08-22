import React, { useEffect, useMemo, useState } from "react";
import { Menu, X, Sun, Moon, User } from "lucide-react";

export type TopNavLink = {
  label: "Dashboard" | "Upload Data" | "Saved Queries" | "Tutorials";
  onClick?: () => void;
};

export type TopNavProps = {
  brand?: string;
  links: TopNavLink[];
  rightArea?: React.ReactNode; // custom right-side area (overrides default Theme+Avatar)
};

const LABEL_TO_PATH: Record<TopNavLink["label"], string> = {
  "Dashboard": "/",
  "Upload Data": "/upload",
  "Saved Queries": "/history",   // per your request
  "Tutorials": "/tutorials",
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

function DefaultRightArea() {
  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
      <AvatarPlaceholder />
    </div>
  );
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
    // hydrate from saved preference
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setIsDark(true);
    }
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

function AvatarPlaceholder() {
  return (
    <button
      type="button"
      aria-label="User menu"
      className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-border bg-background"
    >
      <User className="h-4 w-4" />
    </button>
  );
}

export default function TopNav({ brand = "GeoAnswering", links, rightArea }: TopNavProps) {
  const activePath = useActivePath();
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () =>
      links.map((l) => ({
        ...l,
        href: LABEL_TO_PATH[l.label],
      })),
    [links]
  );

  const handleNavigate = (href: string, onClick?: () => void) => {
    if (onClick) {
      onClick();
      return;
    }
    // naive client-side navigation (works without react-router)
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
        {/* Left: Brand */}
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

        {/* Desktop Links */}
        <div className="ml-6 hidden md:flex items-center gap-1">
          {items.map(({ label, href, onClick }) => {
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Area */}
        <div className="hidden md:flex items-center">{rightArea ?? <DefaultRightArea />}</div>

        {/* Mobile Toggle */}
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

      {/* Mobile Drawer */}
      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-3 space-y-1">
            {items.map(({ label, href, onClick }) => {
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
              {rightArea ?? <DefaultRightArea />}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
