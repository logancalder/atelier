import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebase-admin";

const EXTENSION_TOKEN_TTL_MS = 30 * 24 * 60 * 60_000;

export const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");

export function extensionTokenRecord(uid: string) {
  return { uid, createdAt: FieldValue.serverTimestamp(), lastUsedAt: FieldValue.serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + EXTENSION_TOKEN_TTL_MS) };
}

export async function extensionOwner(authorization: string | null) {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const snapshot = await adminDb().collection("extensionTokens").doc(hashToken(token)).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const uid = typeof data?.uid === "string" ? data.uid : null;
  const createdAt = data?.createdAt?.toMillis?.();
  const storedExpiresAt = data?.expiresAt?.toMillis?.();
  const expiresAt = Number.isFinite(storedExpiresAt) ? storedExpiresAt : createdAt + EXTENSION_TOKEN_TTL_MS;
  if (!uid || !Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await snapshot.ref.delete();
    return null;
  }
  const user = await adminAuth().getUser(uid).catch(() => null);
  const tokensValidAfter = user?.tokensValidAfterTime ? Date.parse(user.tokensValidAfterTime) : 0;
  if (!user || user.disabled || (Number.isFinite(tokensValidAfter) && createdAt < tokensValidAfter)) {
    await snapshot.ref.delete();
    return null;
  }
  await snapshot.ref.update({
    lastUsedAt: FieldValue.serverTimestamp(),
    ...(Number.isFinite(storedExpiresAt) ? {} : { expiresAt: Timestamp.fromMillis(expiresAt) }),
  });
  if (uid && process.env.VERCEL) {
    const { hydrateDataForUser } = await import("./cloud-sync");
    await hydrateDataForUser(uid);
  }
  return uid;
}
