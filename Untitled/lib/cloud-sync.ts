import { FieldValue } from "firebase-admin/firestore";
import { currentUser } from "./auth";
import { readCodingNotebook, replaceCodingNotebook } from "./coding-db";
import { readStudio, replaceStudio } from "./db";
import type { CodingNotebook, Studio } from "./types";
import { writePlaidConnection, type PlaidConnection } from "./plaid";
import { adminDb, firebaseAdminConfigured } from "./firebase-admin";

export async function mirrorDataForUser(uid: string) {
  if (!firebaseAdminConfigured) return;
  const user = adminDb().collection("users").doc(uid);
  const studio = readStudio(uid);
  const coding = readCodingNotebook(uid);
  const batch = adminDb().batch();
  batch.set(user, { updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  batch.set(user.collection("snapshots").doc("studio"), { ...studio, updatedAt: FieldValue.serverTimestamp() });
  batch.set(user.collection("snapshots").doc("coding"), { ...coding, syncedAt: FieldValue.serverTimestamp() });
  await batch.commit();
}

export async function hydrateDataForUser(uid: string) {
  if (!firebaseAdminConfigured) return;
  const snapshots = adminDb().collection("users").doc(uid).collection("snapshots");
  const [studio, coding, plaid] = await Promise.all([snapshots.doc("studio").get(), snapshots.doc("coding").get(), adminDb().collection("users").doc(uid).collection("private").doc("plaid").get()]);
  if (studio.exists) {
    const data = studio.data() as Studio & { updatedAt?: unknown };
    const { updatedAt: _updatedAt, ...snapshot } = data;
    void _updatedAt;
    replaceStudio(snapshot as Studio, uid);
  }
  if (coding.exists) {
    const data = coding.data() as CodingNotebook & { syncedAt?: unknown };
    const { syncedAt: _syncedAt, ...snapshot } = data;
    void _syncedAt;
    replaceCodingNotebook(snapshot as CodingNotebook, uid);
  }
  if (plaid.exists) writePlaidConnection(plaid.data() as PlaidConnection, uid);
}

export async function mirrorCurrentData() {
  const user = await currentUser();
  if (user) await mirrorDataForUser(user.uid);
}
