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
          <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-200 to-green-200 bg-clip-text text-transparent">Create your account</h1>
          <p className="text-white/70 text-sm mb-6">Join GeoQuery and start exploring</p>

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
                  placeholder="At least 8 characters"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  autoComplete="new-password"
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

              {/* Strength meter */}
              <div className="mt-3">
                <div className="h-2 w-full bg-black/60 border border-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(strength / 5) * 100}%`,
                      background:
                        strength < 3 ? "rgba(239,68,68,0.9)" : strength < 4 ? "rgba(234,179,8,0.95)" : "rgba(34,197,94,0.95)",
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/70">
                  {strength < 3 ? "Weak" : strength < 4 ? "Medium" : "Strong"} password
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="password2" className="block text-sm mb-2 text-white/80">Confirm password</label>
              <input
                id="password2"
                type="password"
                className="w-full rounded-xl px-4 py-3 bg-black/60 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="Re-enter your password"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <label className="inline-flex items-center gap-3 text-sm text-white/80 p-3 bg-black/60 rounded-xl border border-white/20">
              <input 
                type="checkbox" 
                checked={agree} 
                onChange={(e) => setAgree(e.target.checked)}
                className="rounded border-white/30 bg-black/40"
              />
              I agree to the Terms and Privacy Policy
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-white text-black font-semibold py-3.5 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              {submitting ? "Creating…" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-sm text-white/80 text-center">
            Already have an account?{" "}
            <button onClick={onGoLogin} className="underline hover:text-white transition-colors font-medium">
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}