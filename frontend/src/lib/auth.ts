/**
 * Auth utilities for the GeoQuery frontend.
 * Includes:
 * - Email/password validation (UI-only)
 * - Frontend-only "demo auth" (localStorage + salted SHA-256)
 * - Lightweight session storage helpers (get/set current user)
 *
 * IMPORTANT: The "demo auth" is for classroom demos and prototypes only.
 * Do NOT use this file as-is in production.
 */

/* =========================
 * Validation helpers (UI)
 * ========================= */

/** Basic email validator for UI feedback (not RFC-perfect, but practical). */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  // Simplified check: something@something.domain
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Password policy used in the UI:
 * - Length: 8–32
 * - Contains at least one letter and one number
 * Adjust as needed for your class/demo requirements.
 */
export function validatePassword(pwd: string): boolean {
  if (typeof pwd !== "string") return false;
  if (pwd.length < 8 || pwd.length > 32) return false;
  const hasLetter = /[A-Za-z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  return hasLetter && hasNumber;
}

/* =========================================
 * Session storage for "logged-in" frontend
 * ========================================= */

/** Minimal representation of a signed-in user on the frontend. */
export type User = { email: string };

const LS_CURR = "geoqa_current_user";

/** Get the currently "logged-in" user from localStorage (frontend-only). */
export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(LS_CURR);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

/** Set or clear the current user in localStorage (frontend-only). */
export function setStoredUser(u: User | null) {
  if (!u) localStorage.removeItem(LS_CURR);
  else localStorage.setItem(LS_CURR, JSON.stringify(u));
}

/* ==========================================================
 * Demo-only local auth (register/verify in the browser ONLY)
 * ==========================================================
 *
 * This block implements a small "fake backend" so you can
 * register and login during demos without a server:
 * - Users are stored in localStorage under `geoqa_users`
 * - Passwords are salted + hashed with SHA-256 (Web Crypto)
 * - All logic is visible/modifiable by anyone in DevTools
 * - Clearing the browser storage removes all accounts
 */

export type DemoUserRecord = { email: string; saltHex: string; hashHex: string };

const LS_USERS = "geoqa_users";

/** Safe parse of the local user list. */
function getUsers(): DemoUserRecord[] {
  try {
    const raw = localStorage.getItem(LS_USERS);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as DemoUserRecord[]) : [];
  } catch {
    return [];
  }
}

/** Persist the local user list. */
function setUsers(users: DemoUserRecord[]) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

/** Text → UTF-8 bytes. */
function enc(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** Uint8Array → hex string. */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** hex string → Uint8Array. */
function fromHex(hex: string): Uint8Array {
  const clean = hex.trim();
  if (clean.length % 2 !== 0) throw new Error("Invalid hex length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Hash = SHA-256( salt || password )
 * This is for DEMO ONLY. For real auth:
 * - Use PBKDF2/scrypt/Argon2 **on the server**
 * - Never trust a browser-only verification
 */
async function hashPassword(password: string, salt: Uint8Array): Promise<Uint8Array> {
  // Ensure Web Crypto exists (it does in browsers).
  if (!("crypto" in globalThis) || !("subtle" in crypto)) {
    throw new Error("Web Crypto API is not available in this environment.");
  }
  const body = enc(password);
  const buf = new Uint8Array(salt.length + body.length);
  buf.set(salt, 0);
  buf.set(body, salt.length);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return new Uint8Array(digest);
}

/** Constant-time comparison to reduce timing-based differences (still client-side). */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Register a new demo user in localStorage.
 * Returns { ok: true } on success or { ok: false, reason } if the email exists.
 */
export async function registerUser(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const users = getUsers();
  const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) return { ok: false, reason: "Email is already registered." };

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await hashPassword(password, salt);

  users.push({ email, saltHex: toHex(salt), hashHex: toHex(hash) });
  setUsers(users);
  return { ok: true };
}

/**
 * Verify a user's credentials against the localStorage list.
 * Returns true if the email exists and the password matches.
 */
export async function verifyUser(email: string, password: string): Promise<boolean> {
  const users = getUsers();
  const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u) return false;
  const hash = await hashPassword(password, fromHex(u.saltHex));
  return timingSafeEqual(hash, fromHex(u.hashHex));
}

/** Utility for demos: clear all locally stored demo users. */
export function clearAllDemoUsers() {
  localStorage.removeItem(LS_USERS);
}