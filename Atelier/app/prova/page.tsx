import { Shell } from "@/components/shell";
import { ProvaWorkspace } from "@/components/prova-workspace";
import { currentUser } from "@/lib/auth";
import { readProva } from "@/lib/prova";

export default async function ProvaPage() {
  const problems = await readProva(await currentUser());
  return <Shell eyebrow="Coding workspace" title="Prova"><ProvaWorkspace seed={problems} /></Shell>;
}
