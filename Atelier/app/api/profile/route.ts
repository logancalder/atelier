import { currentUser } from "@/lib/auth";
import { extensionOwner } from "@/lib/extension-auth";
import { adminDb, firebaseAdminConfigured } from "@/lib/firebase-admin";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization", "Access-Control-Allow-Methods": "GET, OPTIONS" };

export async function GET(request: Request) {
  if (!firebaseAdminConfigured) return Response.json({ displayName: "Local Atelier", email: "Local data", photoURL: "" });
  const sessionUser = await currentUser();
  const uid = await extensionOwner(request.headers.get("authorization")) ?? sessionUser?.uid;
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  const stored = (await adminDb().collection("users").doc(uid).get()).data() ?? {};
  if (sessionUser?.uid === uid) return Response.json({ displayName: stored.displayName || sessionUser.name || "", email: sessionUser.email || "", photoURL: stored.photoURL || sessionUser.picture || "" }, { headers: cors });
  const authUser = await (await import("@/lib/firebase-admin")).adminAuth().getUser(uid);
  return Response.json({ displayName: stored.displayName || authUser.displayName || "", email: authUser.email || "", photoURL: stored.photoURL || authUser.photoURL || "" }, { headers: cors });
}

export function OPTIONS() { return new Response(null, { status: 204, headers: cors }); }
