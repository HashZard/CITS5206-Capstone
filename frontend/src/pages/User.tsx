import React, { useEffect, useMemo, useState } from "react";

/** User profile & preferences page (frontend-only; no backend required) */
export default function UserPage({ email }: { email: string }) {
  // Profile
  const [displayName, setDisplayName] = useState("");
  const [editing, setEditing] = useState(false);

  // Preferences
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [compact, setCompact] = useState(false);

  // Load persisted data
  useEffect(() => {
    const savedName = localStorage.getItem("geoqa_display_name");
    if (savedName) setDisplayName(savedName);

    const savedTheme = (localStorage.getItem("geoqa_theme") as "system" | "light" | "dark") || "system";
    setTheme(savedTheme);

    const savedCompact = localStorage.getItem("geoqa_compact") === "1";
    setCompact(savedCompact);
  }, []);

  // Apply theme to document root (demo-only)
  useEffect(() => {
    const root = document.documentElement;
    const desired =
      theme === "system"
        ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : theme;

    if (desired === "dark") root.classList.add("dark");
    else root.classList.remove("dark");

    localStorage.setItem("geoqa_theme", theme);
  }, [theme]);

  // Persist and expose density to the document root
  useEffect(() => {
    localStorage.setItem("geoqa_compact", compact ? "1" : "0");
    document.documentElement.setAttribute("data-density", compact ? "compact" : "comfortable");
  }, [compact]);

  const initials = useMemo(() => {
    const src = displayName || email;
    const parts = src.replace(/@.*/, "").split(/[.\s_-]+/).filter(Boolean);
    return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
  }, [displayName, email]);

  const saveProfile = () => {
    localStorage.setItem("geoqa_display_name", displayName.trim());
    setEditing(false);
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url("/earth.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-white px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-200 to-green-200 bg-clip-text text-transparent">Account</h1>
          <p className="text-white/70 mt-2 text-sm">Manage your profile and preferences</p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile card */}
          <section className="md:col-span-1 rounded-2xl border border-white/20 bg-black/40 backdrop-blur-sm p-6 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-xl bg-black/60 border border-white/20 flex items-center justify-center text-xl font-bold">
                {initials}
              </div>
              <div>
                <div className="text-base font-medium text-white">{displayName || "Unnamed user"}</div>
                <div className="text-sm text-white/80">{email}</div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm text-white/80">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={!editing}
                className={`w-full rounded-xl px-3 py-2 bg-black/60 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                  !editing ? "opacity-75 cursor-not-allowed" : ""
                }`}
                placeholder="Your name"
              />
              <div className="flex gap-2">
                {!editing ? (
                  <button
                    type="button"
                    className="rounded-xl px-4 py-2 text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors"
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="rounded-xl px-4 py-2 text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors"
                      onClick={saveProfile}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="rounded-xl px-4 py-2 text-sm font-medium bg-black/60 border border-white/30 text-white hover:bg-black/80 transition-colors"
                      onClick={() => {
                        setEditing(false);
                        setDisplayName(localStorage.getItem("geoqa_display_name") || "");
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section className="md:col-span-2 rounded-2xl border border-white/20 bg-black/40 backdrop-blur-sm p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-6">Preferences</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm text-white/80 mb-3">Theme</label>
                <div className="flex gap-2">
                  {(["system", "light", "dark"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      className={`rounded-xl px-4 py-2 text-sm font-medium border transition-colors ${
                        theme === t 
                          ? "bg-white text-black border-white" 
                          : "bg-black/60 border-white/30 text-white hover:bg-black/80"
                      }`}
                      aria-pressed={theme === t}
                    >
                      {t[0].toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/80 mb-3">Layout density</label>
                <label className="inline-flex items-center gap-3 text-sm text-white/80 p-3 bg-black/60 rounded-xl border border-white/20">
                  <input 
                    type="checkbox" 
                    checked={compact} 
                    onChange={(e) => setCompact(e.target.checked)}
                    className="rounded border-white/30 bg-black/40"
                  />
                  Compact mode
                </label>
                <p className="mt-3 text-xs text-white/70 leading-5">
                  Compact mode reduces paddings, gaps and sometimes font sizes across the UI to show more information per
                  screen. It is remembered in this browser and can be read via the{" "}
                  <code className="px-1 rounded bg-black/60 border border-white/20">data-density</code> attribute on the{" "}
                  <code className="px-1 rounded bg-black/60 border border-white/20">&lt;html&gt;</code> element.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}