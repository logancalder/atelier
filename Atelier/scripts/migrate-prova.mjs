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
const source = process.env.PROVA_DATA_FILE || new URL("../../leetcode/data.json", import.meta.url);
const problems = JSON.parse(await readFile(source, "utf8"));
const user = await getAuth(app).getUserByEmail(email);
const reference = getFirestore(app).collection("users").doc(user.uid).collection("snapshots").doc("prova");
await reference.set({ problems, updatedAt: FieldValue.serverTimestamp(), source: "prova-json-migration" });
await getFirestore(app).collection("users").doc(user.uid).set({ updatedAt: FieldValue.serverTimestamp() }, { merge: true });
const written = await reference.get();
const writtenProblems = written.data()?.problems ?? [];
const count = writtenProblems.length;
if (count !== problems.length) throw new Error(`Expected ${problems.length} problems but read back ${count}.`);
console.log(JSON.stringify({ email, uid: user.uid, migrated: count, solved: writtenProblems.filter((problem) => problem.solved).length, path: `users/${user.uid}/snapshots/prova` }));
