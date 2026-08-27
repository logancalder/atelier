import { readFile } from "node:fs/promises";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const email = "lcalder2022@gmail.com";
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const app = getApps()[0] || initializeApp({
  credential: process.env.FIREBASE_CLIENT_EMAIL && privateKey
    ? cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey })
    : applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID,
});
const problems = JSON.parse(await readFile(new URL("../data/prova-seed.json", import.meta.url), "utf8"));
const user = await getAuth(app).getUserByEmail(email);
const reference = getFirestore(app).collection("users").doc(user.uid).collection("snapshots").doc("prova");
await reference.set({ problems, updatedAt: FieldValue.serverTimestamp(), source: "prova-json-migration" });
await getFirestore(app).collection("users").doc(user.uid).set({ updatedAt: FieldValue.serverTimestamp() }, { merge: true });
const written = await reference.get();
const count = written.data()?.problems?.length ?? 0;
if (count !== problems.length) throw new Error(`Expected ${problems.length} problems but read back ${count}.`);
console.log(JSON.stringify({ email, uid: user.uid, migrated: count, path: `users/${user.uid}/snapshots/prova` }));
