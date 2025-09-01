import React, { useState } from "react";
import { validateEmail, validatePassword } from "@/lib/auth";

/** Frontend-only login form with basic validation */
export default function Login({
  onLogin,
  onGoRegister,
}: {
  onLogin: (email: string) => void;
  onGoRegister: () => void;
}) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return setErr("Please enter a valid email.");
    if (!validatePassword(pwd))
      return setErr("Password must be 8-32 chars, include letters and numbers.");
    setErr(null);
    onLogin(email);
  };

  return (
    <div className="max-w-md mx-auto bg-white/10 border border-white/20 rounded-xl p-6 text-white">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      {err && <p className="mb-3 text-red-200">{err}</p>}
      <form onSubmit={submit} className="space-y-4">
        <input
          type="email"
          className="w-full rounded-md px-3 py-2 bg-white/90 text-gray-800"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          type="password"
          className="w-full rounded-md px-3 py-2 bg-white/90 text-gray-800"
          placeholder="Password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          autoComplete="current-password"
        />
        <button
          type="submit"
          className="w-full bg-white text-purple-700 font-medium py-2 rounded-md hover:bg-gray-100"
        >
          Sign in
        </button>
      </form>
      <div className="mt-4 text-sm text-white/80">
        Don’t have an account?{" "}
        <button onClick={onGoRegister} className="underline hover:text-white">
          Sign up
        </button>
      </div>
    </div>
  );
}
