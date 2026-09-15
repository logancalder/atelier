import { redirect } from "next/navigation";
import { ExtensionConnect } from "@/components/extension-connect";
import { currentUser } from "@/lib/auth";

export default async function ExtensionConnectPage({ searchParams }: { searchParams: Promise<{ code?: string; provider?: string }> }) {
  const { code, provider } = await searchParams;
  if (!code || code.length < 32) redirect("/coding");
  const user = await currentUser();
  const chosen=["google","github","email"].includes(provider || "") ? provider : "";
  if (!user) redirect(`/login?provider=${chosen}&next=${encodeURIComponent(`/extension-connect?code=${encodeURIComponent(code)}&provider=${chosen}`)}`);
  return <main className="extension-connect-page"><ExtensionConnect provider={chosen} code={code} identity={user.email || user.name || "this Atelier account"} /></main>;
}
