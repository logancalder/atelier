"use server";
import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { demos, type Demo } from "@/lib/demos";
import { digest, hashPassword } from "@/lib/demo-security";
export async function saveDemo(form: FormData): Promise<{ error?: string; key?: string; saved?: boolean }> {
  const user = await currentUser();
  if (!user) return { error: "Sign in to manage demos." };
  const id = String(form.get("id") || "");
  if (id && !/^[a-f0-9-]{36}$/.test(id)) return { error: "Invalid demo." };
  const name = String(form.get("name") || "").trim();
  const password = String(form.get("password") || "");
  let url: URL;
  try { url = new URL(String(form.get("url"))); } catch { return { error: "Enter a valid HTTPS address." }; }
  if (url.protocol !== "https:" || url.username || url.password) return { error: "Use an HTTPS address without credentials." };
  if (!name || name.length > 100 || url.href.length > 2048) return { error: "Enter a short demo name and URL." };
  if ((!id || password) && (password.length < 10 || password.length > 256)) return { error: "Use a password with 10–256 characters." };
  const expiry = String(form.get("expiresAt") || "");
  if (expiry && !Number.isFinite(Date.parse(expiry))) return { error: "Enter a valid expiry date." };
  const expiresAt = expiry ? new Date(expiry).toISOString() : null;
  const ref = demos().doc(id || randomUUID());
  const apiSecret = randomBytes(32).toString("hex");
  const passwordHash = password ? await hashPassword(password) : null;
  try {
    await ref.firestore.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      const existing = snapshot.data() as Demo | undefined;
      if (id && (!existing || existing.ownerId !== user.uid)) throw new Error("not-owner");
      if (!id && existing) throw new Error("collision");
      const enabled = form.get("enabled") === "on";
      tx.set(ref, { ownerId: user.uid, name, url: url.href, expiresAt, enabled,
        passwordHash: passwordHash || existing!.passwordHash,
        apiKeyHash: existing?.apiKeyHash || digest(apiSecret),
        version: passwordHash || existing?.enabled !== enabled ? randomUUID() : existing.version,
        createdAt: existing?.createdAt || new Date().toISOString() } satisfies Demo);
    });
  } catch { return { error: "Could not save this demo. Please refresh and try again." }; }
  revalidatePath("/demos");
  return { saved: true, ...(!id ? { key: `${ref.id}.${apiSecret}` } : {}) };
}
