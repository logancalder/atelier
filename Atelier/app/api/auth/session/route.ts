import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { hydrateDataForUser, mirrorDataForUser } from "@/lib/cloud-sync";
import { adminAuth } from "@/lib/firebase-admin";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const expiresIn = 60 * 60 * 24 * 5 * 1000;

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const { idToken } = await request.json().catch(() => ({ idToken: null }));
  if (typeof idToken !== "string") return Response.json({ error: "Missing ID token." }, { status: 400 });
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) return Response.json({ error: "Recent sign-in required." }, { status: 401 });
    const session = await adminAuth().createSessionCookie(idToken, { expiresIn });
    (await cookies()).set(SESSION_COOKIE, session, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: expiresIn / 1000, path: "/" });
    const userRef = adminDb().collection("users").doc(decoded.uid);
    const existing = (await userRef.get()).data();
    await userRef.set({
      email: decoded.email ?? existing?.email ?? "",
      displayName: existing?.displayName || decoded.name || "",
      photoURL: existing?.photoURL || decoded.picture || "",
      firstProvider: existing?.firstProvider || decoded.firebase?.sign_in_provider || "password",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await hydrateDataForUser(decoded.uid);
    await mirrorDataForUser(decoded.uid);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Unable to create Firebase session", error);
    return Response.json({ error: "Unable to create session." }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return Response.json({ error: "Invalid origin." }, { status: 403 });
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
