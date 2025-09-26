import React, { useMemo, useState } from "react";
import { Menu, X } from "lucide-react";

export type TopNavLink = {
  label: "Home" | "History" | "Result" | "Tutorials" | "About";
};

export type TopNavProps = {
  brand: string;
  links: TopNavLink[];
  isAuthenticated: boolean;
  onAvatarClick: () => void;
  onSignOut: () => void;
};

const LABEL_TO_PATH: Record<TopNavLink["label"], string> = {
  Home: "/",
  History: "/history",
  Result: "/result",
  Tutorials: "/tutorials",
  About: "/about",
};

export default function TopNav({
  brand,
  links,
  isAuthenticated,
  onAvatarClick,
  onSignOut,
}: TopNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const filtered = useMemo(() => {
    return links
      .filter((l) => (l.label === "History" ? isAuthenticated : true))
      .map((l) => ({ ...l, href: LABEL_TO_PATH[l.label] }));
  }, [links, isAuthenticated]);

  return (
    <nav className="bg-transparent text-white border-b border-white/10 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex-shrink-0 font-bold text-xl cursor-pointer">{brand}</div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center space-x-6">
            {filtered.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-gray-200 transition-colors"
              >
                {link.label}
              </a>
            ))}
            {isAuthenticated && (
              <button
                onClick={onSignOut}
                className="ml-4 px-3 py-1 text-sm bg-white/20 hover:bg-white/30 rounded-lg"
              >
                Sign out
              </button>
            )}
            <button
              onClick={onAvatarClick}
              className="ml-2 w-8 h-8 rounded-full bg-white/30 hover:bg-white/40 flex items-center justify-center"
            >
              👤
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden px-2 pt-2 pb-3 space-y-1 bg-purple-800/90">
          {filtered.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-purple-700"
            >
              {link.label}
            </a>
          ))}
          {isAuthenticated && (
            <button
              onClick={onSignOut}
              className="block w-full text-left px-3 py-2 text-base font-medium bg-white/20 hover:bg-white/30 rounded-md"
            >
              Sign out
            </button>
          )}
          <button
            onClick={onAvatarClick}
            className="mt-2 w-10 h-10 rounded-full bg-white/30 hover:bg-white/40 flex items-center justify-center"
          >
            👤
          </button>
        </div>
      )}
    </nav>
  );
}