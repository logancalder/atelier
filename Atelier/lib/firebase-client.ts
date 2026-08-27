import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseClientConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

export function clientAuth() {
  if (!firebaseClientConfigured) throw new Error("Firebase client environment variables are not configured.");
  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  void setPersistence(auth, inMemoryPersistence);
  return auth;
}
