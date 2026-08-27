import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { hashToken } from "@/lib/extension-auth";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

export async function POST(request: Request) {
  const { idToken } = await request.json().catch(() => ({ idToken: "" }));
  if (typeof idToken !== "string" || !idToken) return Response.json({ error: "Missing Firebase token" }, { status: 400, headers: cors });
  try {
    const user = await adminAuth().verifyIdToken(idToken, true);
    const token = randomBytes(32).toString("base64url");
    await adminDb().collection("extensionTokens").doc(hashToken(token)).set({ uid: user.uid, createdAt: FieldValue.serverTimestamp(), lastUsedAt: FieldValue.serverTimestamp() });
    const stored = (await adminDb().collection("users").doc(user.uid).get()).data() ?? {};
    const profile = { displayName: stored.displayName || user.name || "", email: user.email || "", photoURL: stored.photoURL || user.picture || "" };
    return Response.json({ token, accountId: user.uid, profile }, { headers: cors });
  } catch { return Response.json({ error: "Firebase sign-in could not be verified" }, { status: 401, headers: cors }); }
}

export function OPTIONS() { return new Response(null, { status: 204, headers: cors }); }
