import React, { useState } from "react";
import { validateEmail, validatePassword } from "@/lib/auth";

/** Frontend-only register form; after success, considered logged-in */
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
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return setErr("Please enter a valid email.");
    if (!validatePassword(pwd))
      return setErr("Password must be 8-32 chars, include letters and numbers.");
    if (pwd !== pwd2) return setErr("Passwords do not match.");
    setErr(null);
    onRegister(email); // consider the user logged in
  };

  return (
    <div className="max-w-md mx-auto bg-white/10 border border-white/20 rounded-xl p-6 text-white">
      <h1 className="text-2xl font-semibold mb-4">Register</h1>
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
          autoComplete="new-password"
        />
        <input
          type="password"
          className="w-full rounded-md px-3 py-2 bg-white/90 text-gray-800"
          placeholder="Confirm Password"
          value={pwd2}
          onChange={(e) => setPwd2(e.target.value)}
          autoComplete="new-password"
        />
        <button
          type="submit"
          className="w-full bg-white text-purple-700 font-medium py-2 rounded-md hover:bg-gray-100"
        >
          Create account
        </button>
      </form>
      <div className="mt-4 text-sm text-white/80">
        Already have an account?{" "}
        <button onClick={onGoLogin} className="underline hover:text-white">
          Sign in
        </button>
      </div>
    </div>
  );
}
