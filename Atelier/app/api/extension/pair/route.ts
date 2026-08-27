import { randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { hashToken } from "@/lib/extension-auth";
import { adminDb } from "@/lib/firebase-admin";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS" };

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { code } = await request.json().catch(() => ({ code: "" }));
  if (typeof code !== "string" || code.length < 32) return Response.json({ error: "Invalid pairing code" }, { status: 400 });
  const token = randomBytes(32).toString("base64url");
  await adminDb().collection("extensionPairings").doc(hashToken(code)).set({ uid: user.uid, token, expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60_000), createdAt: FieldValue.serverTimestamp() });
  return Response.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  if (code.length < 32) return Response.json({ error: "Invalid pairing code" }, { status: 400, headers: cors });
  const reference = adminDb().collection("extensionPairings").doc(hashToken(code));
  const snapshot = await reference.get();
  if (!snapshot.exists) return Response.json({ pending: true }, { status: 202, headers: cors });
  const data = snapshot.data();
  if (!data?.token || !data?.uid || data.expiresAt?.toMillis() < Date.now()) { await reference.delete(); return Response.json({ error: "Pairing expired" }, { status: 410, headers: cors }); }
  await adminDb().collection("extensionTokens").doc(hashToken(data.token)).set({ uid: data.uid, createdAt: FieldValue.serverTimestamp(), lastUsedAt: FieldValue.serverTimestamp() });
  await reference.delete();
  return Response.json({ token: data.token, accountId: data.uid }, { headers: cors });
}

export function OPTIONS() { return new Response(null, { status: 204, headers: cors }); }

export async function DELETE(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  await adminDb().collection("extensionTokens").doc(hashToken(token)).delete();
  return Response.json({ ok: true }, { headers: cors });
}
