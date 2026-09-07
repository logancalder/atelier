import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function equal(a: string, b: string) {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export async function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${(await derive(password, salt, 64) as Buffer).toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const salt = hash.split(":")[0];
  return !!salt && equal(await hashPassword(password, salt), hash);
}
export function activeDemo(demo: { enabled: boolean; expiresAt: string | null }, now = Date.now()) {
  return demo.enabled && (demo.expiresAt === null || Date.parse(demo.expiresAt) > now);
}
export function deviceDescription(ua: string) {
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS / iPadOS" : /Windows/i.test(ua) ? "Windows" : /Macintosh|Mac OS/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Unknown OS";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /Chrome|CriOS/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "Unknown browser";
  const kind = /iPad|Tablet/i.test(ua) ? "Tablet" : /Mobile|iPhone|Android/i.test(ua) ? "Mobile" : "Desktop / other";
  return `${browser} · ${os} · ${kind}`;
}
