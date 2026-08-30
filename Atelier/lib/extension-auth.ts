import { createHash } from "node:crypto";
import { adminDb } from "./firebase-admin";

export const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");

export async function extensionOwner(authorization: string | null) {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const snapshot = await adminDb().collection("extensionTokens").doc(hashToken(token)).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const uid = typeof data?.uid === "string" ? data.uid : null;
  if (uid && process.env.VERCEL) {
    const { hydrateDataForUser } = await import("./cloud-sync");
    await hydrateDataForUser(uid);
  }
  return uid;
}
