import { randomBytes } from "node:crypto";
import { demos, type Demo } from "@/lib/demos";
import { activeDemo, deviceDescription, digest, equal, verifyPassword } from "@/lib/demo-security";
export const runtime = "nodejs";
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const match = /^Bearer ([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(auth);
  if (!match) return reply({ error: "Unauthorized" }, 401);
  const text = await request.text();
  if (text.length > 4096) return reply({ error: "Request too large" }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return reply({ error: "Invalid request" }, 400); }
  if (!body || typeof body !== "object") return reply({ error: "Invalid request" }, 400);
  const ref = demos().doc(match[1]);
  try {
    const initial = (await ref.get()).data() as Demo | undefined;
    if (!initial || !equal(initial.apiKeyHash, digest(match[2]))) return reply({ error: "Unauthorized" }, 401);
    if (!activeDemo(initial)) return reply({ error: "Preview unavailable or expired" }, 403);
    if (body.action === "validate") {
      if (typeof body.session !== "string" || !/^[a-f0-9]{64}$/.test(body.session)) return reply({ valid: false }, 401);
      const valid = await ref.firestore.runTransaction(async tx => {
        const site = (await tx.get(ref)).data() as Demo;
        const session = (await tx.get(ref.collection("sessions").doc(digest(body.session)))).data();
        return activeDemo(site) && equal(site.apiKeyHash, digest(match[2])) && !!session && session.version === site.version && Date.parse(session.expiresAt) > Date.now();
      });
      return reply({ valid }, valid ? 200 : 401);
    }
    if (body.action !== "login" || typeof body.password !== "string" || body.password.length > 256) return reply({ error: "Invalid request" }, 400);
    const allowed = await ref.firestore.runTransaction(async tx => {
      const rate = ref.collection("limits").doc("login");
      const record = (await tx.get(rate)).data();
      const window = Math.floor(Date.now() / 900000);
      const count = record?.window === window ? record.count : 0;
      if (count >= 100) return false;
      tx.set(rate, { window, count: count + 1 }); return true;
    });
    if (!allowed) return reply({ error: "Too many attempts. Try again later." }, 429);
    if (!(await verifyPassword(body.password, initial.passwordHash))) return reply({ error: "Incorrect password" }, 401);
    const token = randomBytes(32).toString("hex");
    const expiresAt = await ref.firestore.runTransaction(async tx => {
      const current = (await tx.get(ref)).data() as Demo;
      if (!activeDemo(current) || current.version !== initial.version || !equal(current.apiKeyHash, digest(match[2]))) return null;
      const now = Date.now();
      const expiry = new Date(Math.min(now + 86400000, current.expiresAt ? Date.parse(current.expiresAt) : Infinity)).toISOString();
      tx.set(ref.collection("sessions").doc(digest(token)), { version: current.version, expiresAt: expiry });
      tx.set(ref.collection("logins").doc(), { at: new Date(now).toISOString(), device: deviceDescription(typeof body.userAgent === "string" ? body.userAgent.slice(0, 512) : "") });
      return expiry;
    });
    return expiresAt ? reply({ session: token, expiresAt }) : reply({ error: "Preview unavailable or expired" }, 403);
  } catch { return reply({ error: "Preview service temporarily unavailable" }, 503); }
}
