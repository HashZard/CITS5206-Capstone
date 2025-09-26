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
    <div className="max-w-md mx-auto bg-white/10 border border-white/20 rounded-2xl p-6 text-white shadow-sm">
      <h1 className="text-2xl font-semibold mb-1">Sign in</h1>
      <p className="text-white/70 text-sm mb-4">Access your GeoQuery account</p>

      {err && (
        <div className="mb-4 rounded-lg border border-red-300/40 bg-red-500/10 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm mb-1 text-white/80">Email</label>
          <input
            id="email"
            type="email"
            className="w-full rounded-xl px-3 py-2 bg-white/90 text-gray-900 placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm mb-1 text-white/80">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPwd ? "text" : "password"}
              className="w-full rounded-xl px-3 py-2 bg-white/90 text-gray-900 placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300 pr-24"
              placeholder="••••••••"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium bg-gray-900/80 text-white hover:bg-gray-900"
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember email
            </label>
            <button
              type="button"
              className="text-sm underline text-white/80 hover:text-white"
              onClick={() => alert("This is a frontend-only demo.")}
            >
              Forgot password?
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-white text-purple-700 font-medium py-2.5 shadow-sm hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-4 text-sm text-white/80">
        Don’t have an account?{" "}
        <button onClick={onGoRegister} className="underline hover:text-white">Sign up</button>
      </div>
    </div>
  );
}