"use client";

import Link from "next/link";
import { useState } from "react";

export function ExtensionConnect({ code, identity }: { code: string; identity: string }) {
  const [state, setState] = useState<"ready" | "connecting" | "connected" | "error">("ready");
  async function connect() {
    setState("connecting");
    try {
      const response = await fetch("/api/extension/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (!response.ok) throw new Error();
      setState("connected");
    } catch {
      setState("error");
    }
  }
  return <div className="extension-connect-state"><div className="loader-mark">A</div><h1>{state === "ready" ? "Connect this account?" : state === "connecting" ? "Connecting…" : state === "connected" ? "Extension connected." : "Couldn’t connect."}</h1><p>{state === "ready" ? `The extension will sync with ${identity}. Confirm that this is the account you want.` : state === "connected" ? "Your coding notes now sync only with this Atelier account. You can close this tab." : state === "error" ? "Return to the extension and try pairing again." : "Pairing Atelier Problem Notes with your account."}</p>{state === "ready" ? <div className="extension-connect-actions"><button type="button" onClick={() => void connect()}>Connect this account</button><Link href="/profile">Use a different account</Link></div> : null}</div>;
}
