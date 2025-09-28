import React, { useEffect, useState } from "react";
import { validateEmail, validatePassword, verifyUser } from "@/lib/auth";

/** Frontend-only login form with improved UX and local verification */
export default function Login({
  onLogin,
  onGoRegister,
}: {
  onLogin: (email: string) => void;
  onGoRegister: () => void;
}) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Prefill email if previously remembered
  useEffect(() => {
    const saved = localStorage.getItem("geoqa_login_email");
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return setErr("Please enter a valid email address.");
    if (!validatePassword(pwd))
      return setErr("Password must be 8–32 characters and include both letters and numbers.");
    setErr(null);

    // Persist remembered email
    if (remember) localStorage.setItem("geoqa_login_email", email);
    else localStorage.removeItem("geoqa_login_email");

    setSubmitting(true);
    const ok = await verifyUser(email, pwd); // local verification (demo-only)
    setSubmitting(false);

    if (!ok) return setErr("Invalid email or password.");
    onLogin(email);
  };

  const canSubmit = email.trim().length > 0 && pwd.length >= 8 && !submitting;

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
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-md w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-white shadow-lg">
          <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-200 to-green-200 bg-clip-text text-transparent">Sign in</h1>
          <p className="text-white/70 text-sm mb-6">Access your GeoQuery account</p>

          {err && (
            <div className="mb-6 rounded-xl border border-red-400/40 bg-red-500/20 px-4 py-3 text-sm text-white">
              {err}
            </div>
          )}

          <form onSubmit={submit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm mb-2 text-white/80">Email</label>
              <input
                id="email"
                type="email"
                className="w-full rounded-xl px-4 py-3 bg-black/60 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm mb-2 text-white/80">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  className="w-full rounded-xl px-4 py-3 bg-black/60 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent pr-24"
                  placeholder="••••••••"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-sm font-medium bg-black/80 border border-white/20 text-white hover:bg-black/60 transition-colors"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? "Hide" : "Show"}
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-white/80 p-2 bg-black/60 rounded-lg border border-white/20">
                  <input 
                    type="checkbox" 
                    checked={remember} 
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-white/30 bg-black/40"
                  />
                  Remember email
                </label>
                <button
                  type="button"
                  className="text-sm underline text-white/80 hover:text-white transition-colors"
                  onClick={() => alert("This is a frontend-only demo.")}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-white text-black font-semibold py-3.5 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-sm text-white/80 text-center">
            Don't have an account?{" "}
            <button onClick={onGoRegister} className="underline hover:text-white transition-colors font-medium">
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}