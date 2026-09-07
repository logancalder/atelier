"use client";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { saveDemo } from "@/app/demos/actions";
import { Button, Card, Field, Input } from "./ui";
import type { DemoView } from "@/lib/demos";
const subscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(subscribe, () => true, () => false);
function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function DemoForm({ demo }: { demo?: DemoView }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  if (!hydrated) return <p>Loading settings…</p>;
  return <form className="grid max-w-2xl gap-4" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setMessage("");
    const element = event.currentTarget;
    const data = new FormData(element);
    const date = String(data.get("expiresAt") || "");
    data.set("expiresAt", date ? new Date(date).toISOString() : "");
    try {
      const result = await saveDemo(data);
      if (result.error) setMessage(result.error);
      else { setMessage("Saved. Changes apply on the next page request."); if (result.key) { setKey(result.key); element.reset(); } else { (element.elements.namedItem("password") as HTMLInputElement).value = ""; } router.refresh(); }
    } catch { setMessage("Unable to save. Please try again."); } finally { setBusy(false); }
  }}>
    {demo && <input type="hidden" name="id" value={demo.id} />}
    <Field label="Demo name"><Input name="name" defaultValue={demo?.name} maxLength={100} required /></Field>
    <Field label="Website address"><Input name="url" type="url" placeholder="https://your-demo.vercel.app" defaultValue={demo?.url} required /></Field>
    <Field label={demo ? "New password" : "Password"} hint={demo ? "Leave blank to keep the current password. Changing it signs out existing visitors." : "At least 10 characters. Passwords are stored as salted hashes."}><Input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={256} required={!demo} /></Field>
    <Field label="Expires at" hint="Your device's local time. Leave blank for no expiry."><Input name="expiresAt" type="datetime-local" defaultValue={localDate(demo?.expiresAt ?? null)} /></Field>
    <label className="flex items-center gap-2"><input type="checkbox" name="enabled" defaultChecked={demo?.enabled ?? true} /> Preview enabled</label>
    <Button disabled={busy}>{busy ? "Saving…" : demo ? "Save changes" : "Create demo"}</Button>
    {message && <p role="status">{message}</p>}
    {key && <div className="break-all rounded border border-line p-4"><p className="mb-2">Copy this server key now; it is shown only once. Set ATELIER_DEMO_KEY on the demo host.</p><code>{key}</code></div>}
  </form>;
}
export function DemoList({ demos }: { demos: DemoView[] }) {
  const hydrated = useHydrated();
  if (!hydrated) return <p>Loading demos…</p>;
  return <div>{demos.map(demo => <Card key={demo.id}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-2xl">{demo.name}</h2><a href={demo.url} target="_blank" rel="noreferrer" className="underline">Open demo ↗</a></div>
    <p className="mb-4 text-mute">{!demo.enabled ? "Disabled" : demo.expired ? "Expired" : "Active"}{demo.expiresAt ? ` · Expires ${new Date(demo.expiresAt).toLocaleString()}` : " · No expiry"}</p>
    <details className="mb-6"><summary className="cursor-pointer">Password & access settings</summary><div className="mt-4"><DemoForm demo={demo} /></div></details>
    <h3 className="mb-3 text-lg">Recent successful logins</h3>
    {demo.logins.length ? <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th className="py-2 pr-5 font-medium">Login time (your timezone)</th><th className="py-2 font-medium">Reported device</th></tr></thead><tbody>{demo.logins.map(log => <tr key={log.id} className="border-t border-line"><td className="py-3 pr-5"><time dateTime={log.at}>{new Date(log.at).toLocaleString()}</time></td><td className="py-3">{log.device}</td></tr>)}</tbody></table><p className="mt-2 text-mute">Latest 50 logins. Refresh to see new activity.</p></div> : <p className="text-mute">No successful logins yet.</p>}
  </Card>)}</div>;
}
