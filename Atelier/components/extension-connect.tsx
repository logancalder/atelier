"use client";

import { useEffect, useState } from "react";

export function ExtensionConnect({ code }: { code: string }) {
  const [state, setState] = useState<"connecting" | "connected" | "error">("connecting");
  useEffect(() => {
    fetch("/api/extension/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }).then((response) => { if (!response.ok) throw new Error(); setState("connected"); }).catch(() => setState("error"));
  }, [code]);
  return <div className="extension-connect-state"><div className="loader-mark">A</div><h1>{state === "connecting" ? "Connecting…" : state === "connected" ? "Extension connected." : "Couldn’t connect."}</h1><p>{state === "connected" ? "Your coding notes now sync only with this Atelier account. You can close this tab." : state === "error" ? "Return to the extension and try pairing again." : "Pairing Atelier Problem Notes with your account."}</p></div>;
}
