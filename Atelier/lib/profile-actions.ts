"use server";

import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { currentUser } from "./auth";
import { adminDb } from "./firebase-admin";

export async function saveProfile(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  await adminDb().collection("users").doc(user.uid).set({
    displayName: String(formData.get("displayName") ?? "").trim(),
    timezone: String(formData.get("timezone") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    email: user.email ?? "",
    photoURL: user.picture ?? "",
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  redirect("/profile?saved=1");
}
