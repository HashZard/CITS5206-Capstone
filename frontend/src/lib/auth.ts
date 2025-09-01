/** Minimal frontend-only auth helpers (no backend involved) */

export type User = { email: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Password rule: 8-32 chars, at least one letter and one number
const PASS_RE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-={}[\]|:;"'<>,.?/~`]{8,32}$/;

export function validateEmail(email: string) {
  return EMAIL_RE.test(email);
}

export function validatePassword(pwd: string) {
  return PASS_RE.test(pwd);
}

const KEY = "geoquery_user";

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null) {
  if (user) {
    localStorage.setItem(KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEY);
  }
}
