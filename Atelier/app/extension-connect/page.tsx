import { redirect } from "next/navigation";
import { ExtensionConnect } from "@/components/extension-connect";
import { currentUser } from "@/lib/auth";

export default async function ExtensionConnectPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  if (!code || code.length < 32) redirect("/coding");
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/extension-connect?code=${code}`)}`);
  return <main className="extension-connect-page"><ExtensionConnect code={code} identity={user.email || user.name || "this Atelier account"} /></main>;
}
