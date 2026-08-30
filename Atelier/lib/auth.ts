import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, firebaseAdminConfigured } from "./firebase-admin";

export const SESSION_COOKIE = "atelier_session";

export async function currentUser(): Promise<DecodedIdToken | null> {
  if (!firebaseAdminConfigured) return null;
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!session) return null;
  let user: DecodedIdToken;
  try { user = await adminAuth().verifySessionCookie(session, true); }
  catch { return null; }
  if (process.env.VERCEL) {
    const { hydrateDataForUser } = await import("./cloud-sync");
    await hydrateDataForUser(user.uid);
  }
  return user;
}

export async function dataOwnerId() {
  return (await currentUser())?.uid ?? "local";
}
