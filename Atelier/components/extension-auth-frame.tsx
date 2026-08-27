"use client";

import { useEffect } from "react";
import { createUserWithEmailAndPassword, GithubAuthProvider, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";

export function ExtensionAuthFrame() {
  useEffect(() => {
    async function authenticate(event: MessageEvent) {
      if (!event.origin.startsWith("chrome-extension://") || event.data?.type !== "atelier-extension-auth") return;
      try {
        const auth = clientAuth();
        const { provider, email, password, mode } = event.data;
        const credential = provider === "google"
          ? await signInWithPopup(auth, new GoogleAuthProvider())
          : provider === "github"
            ? await signInWithPopup(auth, new GithubAuthProvider())
            : mode === "signup"
              ? await createUserWithEmailAndPassword(auth, email, password)
              : await signInWithEmailAndPassword(auth, email, password);
        const idToken = await credential.user.getIdToken();
        event.source?.postMessage({ type: "atelier-extension-auth-result", idToken }, { targetOrigin: event.origin });
      } catch (caught) {
        const message = caught instanceof Error ? caught.message.replace(/^Firebase:\s*/, "") : "Sign-in failed.";
        event.source?.postMessage({ type: "atelier-extension-auth-result", error: message }, { targetOrigin: event.origin });
      }
    }
    globalThis.addEventListener("message", authenticate);
    return () => globalThis.removeEventListener("message", authenticate);
  }, []);
  return <p>Atelier extension authentication bridge.</p>;
}
