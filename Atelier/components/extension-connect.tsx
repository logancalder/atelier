"use client";


import { useRouter } from "next/navigation";
import { useState } from "react";

export function ExtensionConnect({ code, identity, provider = "" }: { code: string; identity: string; provider?: string }) {
  const router=useRouter();
  const [state, setState] = useState<"ready" | "connecting" | "connected" | "error">("ready");
  async function switchAccount() {
    setState('connecting');
    let response:Response;
    try { response=await fetch('/api/auth/session',{method:'DELETE'}); } catch { setState('error'); return; }
    if (!response.ok) { setState('error'); return; }
    const destination='/extension-connect?code='+encodeURIComponent(code)+'&provider='+encodeURIComponent(provider);
    router.push('/login?provider='+encodeURIComponent(provider)+'&next='+encodeURIComponent(destination));
    router.refresh();
  }
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
  return <div className="extension-connect-state"><div className="loader-mark">A</div><h1>{state === "ready" ? "Connect this account?" : state === "connecting" ? "Connecting…" : state === "connected" ? "Extension connected." : "Couldn’t connect."}</h1><p>{state === "ready" ? `The extension will sync with ${identity}. Confirm that this is the account you want.` : state === "connected" ? "Your coding notes now sync only with this Atelier account. You can close this tab." : state === "error" ? "Return to the extension and try pairing again." : "Pairing Atelier Problem Notes with your account."}</p>{state === "ready" ? <div className="extension-connect-actions"><button type="button" onClick={() => void connect()}>Connect this account</button><button type="button" onClick={()=>void switchAccount()}>Use a different account</button></div> : null}</div>;
}
