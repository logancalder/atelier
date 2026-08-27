import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export const firebaseAdminConfigured = Boolean(process.env.FIREBASE_PROJECT_ID);

function adminApp() {
  if (!firebaseAdminConfigured) throw new Error("Firebase Admin environment variables are not configured.");
  if (getApps().length) return getApps()[0];
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return initializeApp({
    credential: process.env.FIREBASE_CLIENT_EMAIL && privateKey
      ? cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey })
      : applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

export function adminAuth() { return getAuth(adminApp()); }
export function adminDb() { return getFirestore(adminApp()); }
