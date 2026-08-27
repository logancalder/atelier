"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return <button className="profile-signout" onClick={async () => { await fetch("/api/auth/session", { method: "DELETE" }); router.push("/login"); router.refresh(); }}>Sign out</button>;
}
