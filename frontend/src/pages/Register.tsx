import React, { useMemo, useState } from "react";
import { validateEmail, validatePassword, registerUser } from "@/lib/auth";

/** Frontend-only register form with password strength and local storage */
export default function Register({
  onRegister,
  onGoLogin,
}: {
  onRegister: (email: string) => void;
  onGoLogin: () => void;
}) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Simple client-side strength indicator (length + character variety)
  const strength = useMemo(() => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(score, 5);
  }, [pwd]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return setErr("Please enter a valid email address.");
    if (!validatePassword(pwd))
      return setErr("Password must be 8–32 characters and include both letters and numbers.");
    if (pwd !== pwd2) return setErr("Passwords do not match.");
    if (!agree) return setErr("Please agree to the Terms before continuing.");
    setErr(null);

    setSubmitting(true);
    const res = await registerUser(email, pwd); // local registration (demo-only)
    setSubmitting(false);

    if (!res.ok) return setErr(res.reason);
    onRegister(email); // consider the user logged in
  };

  const canSubmit =
    email.trim().length > 0 &&
    pwd.length >= 8 &&
    pwd2.length >= 8 &&
    agree &&
    !submitting;

  return (
    <div className="max-w-md mx-auto backdrop-blur-md bg-black/40 border border-white/10 rounded-2xl p-6 text-white shadow-xl">
      <h1 className="text-2xl font-semibold mb-1">Create your account</h1>
      <p className="text-white/70 text-sm mb-4">Join GeoQuery and start exploring</p>

      {err && (
        <div className="mb-4 rounded-lg border border-red-300/40 bg-red-500/15 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm mb-1 text-white/80">Email</label>
          <input
            id="email"
            type="email"
            className="w-full rounded-xl px-3 py-2 bg-white/95 text-gray-900 placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
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
              className="w-full rounded-xl px-3 py-2 bg-white/95 text-gray-900 placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300 pr-24"
              placeholder="At least 8 characters"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="new-password"
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

          {/* Strength meter */}
          <div className="mt-2">
            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${(strength / 5) * 100}%`,
                  background:
                    strength < 3
                      ? "rgba(239,68,68,0.9)"
                      : strength < 4
                      ? "rgba(234,179,8,0.95)"
                      : "rgba(34,197,94,0.95)",
                }}
              />
            </div>
            <p className="mt-1 text-xs text-white/70">
              {strength < 3 ? "Weak" : strength < 4 ? "Medium" : "Strong"} password
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="password2" className="block text-sm mb-1 text-white/80">Confirm password</label>
          <input
            id="password2"
            type="password"
            className="w-full rounded-xl px-3 py-2 bg-white/95 text-gray-900 placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            placeholder="Re-enter your password"
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-white/80">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          I agree to the Terms and Privacy Policy
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-white text-purple-700 font-medium py-2.5 shadow-sm hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>

      <div className="mt-4 text-sm text-white/80">
        Already have an account?{" "}
        <button onClick={onGoLogin} className="underline hover:text-white">Sign in</button>
      </div>
    </div>
  );
}
