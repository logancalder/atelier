import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
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

const user = await getAuth(app).getUserByEmail(email);
const db = getFirestore(app);
const snapshotRef = db.collection("users").doc(user.uid).collection("snapshots").doc("coding");
const snapshot = await snapshotRef.get();
if (!snapshot.exists) throw new Error("The coding snapshot does not exist.");

const notebook = snapshot.data();
const problems = Array.isArray(notebook?.problems) ? notebook.problems : [];
const removed = problems.filter((problem) => problem.key?.startsWith("leetcode:"));
const kept = problems.filter((problem) => !problem.key?.startsWith("leetcode:"));
const next = { problems: kept, updatedAt: new Date().toISOString() };

await snapshotRef.set({ ...next, syncedAt: FieldValue.serverTimestamp() });
const localFile = path.join(process.cwd(), "data", "users", user.uid, "coding.json");
mkdirSync(path.dirname(localFile), { recursive: true });
const temporary = `${localFile}.tmp`;
writeFileSync(temporary, JSON.stringify(next, null, 2));
renameSync(temporary, localFile);

const verified = await snapshotRef.get();
const verifiedProblems = verified.data()?.problems ?? [];
if (verifiedProblems.some((problem) => problem.key?.startsWith("leetcode:"))) {
  throw new Error("A LeetCode-only problem remained after removal.");
}
console.log(JSON.stringify({ email, uid: user.uid, removed: removed.map((problem) => problem.key), remaining: verifiedProblems.length, firestorePath: `users/${user.uid}/snapshots/coding` }));