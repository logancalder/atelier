"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, EmailAuthProvider, GithubAuthProvider, GoogleAuthProvider, linkWithCredential, signInWithEmailAndPassword, signInWithPopup, signOut, type AuthCredential, type AuthError, type UserCredential } from "firebase/auth";
import { clientAuth, firebaseClientConfigured } from "@/lib/firebase-client";
import { ProviderIcon } from "@/components/provider-icon";

export function AuthForm({ destination = "/coding" }: { destination?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingCredential, setPendingCredential] = useState<AuthCredential | null>(null);

  async function finish(credential: UserCredential) {
    const idToken = await credential.user.getIdToken();
    const response = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
    await signOut(clientAuth());
    if (!response.ok) throw new Error((await response.json()).error || "Sign-in failed.");
    router.push(destination.startsWith("/") ? destination : "/coding");
    router.refresh();
  }

  async function run(action: () => Promise<UserCredential>, duplicateCredential?: AuthCredential) {
    setBusy(true); setError("");
    try {
      const credential = await action();
      if (pendingCredential && !credential.user.providerData.some((provider) => provider.providerId === pendingCredential.providerId)) {
        await linkWithCredential(credential.user, pendingCredential);
        setPendingCredential(null);
      }
      await finish(credential);
    } catch (caught) {
      const authError = caught as AuthError;
      const linkable = duplicateCredential || GoogleAuthProvider.credentialFromError(authError) || GithubAuthProvider.credentialFromError(authError);
      if ((authError.code === "auth/account-exists-with-different-credential" || authError.code === "auth/email-already-in-use") && linkable) {
        setPendingCredential(linkable);
        setError("That email already has an Atelier account. Sign in below with the service or password you used first; Atelier will then link this new method to the same account.");
      } else {
        setError(caught instanceof Error ? caught.message.replace(/^Firebase:\s*/, "") : "Sign-in failed.");
      }
      setBusy(false);
    }
  }

  if (!firebaseClientConfigured) return <div className="auth-config-note">Add the Firebase values from <code>.env.example</code> to <code>.env.local</code> to enable sign-in.</div>;

  return (
    <div className="auth-form">
      <button className="provider-button" onClick={() => run(() => signInWithPopup(clientAuth(), new GoogleAuthProvider()))} disabled={busy}><ProviderIcon provider="google.com" />Continue with Google</button>
      <button className="provider-button" onClick={() => run(() => signInWithPopup(clientAuth(), new GithubAuthProvider()))} disabled={busy}><ProviderIcon provider="github.com" />Continue with GitHub</button>
      <div className="auth-divider"><span>or</span></div>
      {pendingCredential ? <p className="auth-link-note">One more step: sign in with your original method to link both sign-ins.</p> : null}
      <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const email = String(data.get("email")); const password = String(data.get("password")); void run(() => mode === "signup" ? createUserWithEmailAndPassword(clientAuth(), email, password) : signInWithEmailAndPassword(clientAuth(), email, password), mode === "signup" ? EmailAuthProvider.credential(email, password) : undefined); }}>
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} required /></label>
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Opening Atelier…" : mode === "signup" ? "Create account" : "Sign in"}</button>
      </form>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="auth-mode" type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
    </div>
  );
}
