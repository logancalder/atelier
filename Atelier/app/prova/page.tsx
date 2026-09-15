import { Shell } from "@/components/shell";
import { ProvaWorkspace } from "@/components/prova-workspace";
import { currentUser } from "@/lib/auth";
import { readProva } from "@/lib/prova";
import Link from "next/link";

export default async function ProvaPage() {
  const problems = await readProva(await currentUser());
  return <Shell className="prova-page" eyebrow="Coding workspace" title="Problem library" description="Your complete Prova library, including every problem saved by the extension."><div className="workflow-tabs"><Link href="/prova" aria-current="page">Master library</Link><Link href="/coding">Recent notes</Link></div><ProvaWorkspace seed={problems} /></Shell>;
}