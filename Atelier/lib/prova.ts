import { FieldValue } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import seed from "@/data/prova-seed.json";
import { adminDb, firebaseAdminConfigured } from "./firebase-admin";

export type ProvaProblem = {
  id: number; problemNo: string; title: string; category: string; difficulty: string; url: string;
  dateSolved: string; solvedFirstTime: string; holeInOne: string; solvedSub20?: string;
  isCompetent: string; notes: string; solved: boolean;
};

const TARGET_EMAIL = "lcalder2022@gmail.com";
const reference = (uid: string) => adminDb().collection("users").doc(uid).collection("snapshots").doc("prova");

export function validProvaProblems(value: unknown): value is ProvaProblem[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === "object" && typeof item.id === "number" && typeof item.title === "string" && typeof item.problemNo === "string");
}

export async function readProva(user: DecodedIdToken | null) {
  if (!firebaseAdminConfigured) return seed as ProvaProblem[];
  if (!user) return [];
  const snapshot = await reference(user.uid).get();
  if (snapshot.exists) {
    const problems = snapshot.data()?.problems;
    return validProvaProblems(problems) ? problems : [];
  }
  const problems = user.email?.toLowerCase() === TARGET_EMAIL ? seed as ProvaProblem[] : [];
  await writeProva(user.uid, problems);
  return problems;
}

export async function writeProva(uid: string, problems: ProvaProblem[]) {
  if (!firebaseAdminConfigured) return problems;
  await reference(uid).set({ problems, updatedAt: FieldValue.serverTimestamp(), source: "atelier" });
  await adminDb().collection("users").doc(uid).set({ updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return problems;
}
