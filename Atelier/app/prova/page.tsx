import { Shell } from "@/components/shell";
import { ProvaWorkspace } from "@/components/prova-workspace";
import { currentUser } from "@/lib/auth";
import { readProva, syncCodingProblemsToProva } from "@/lib/prova";
import { readCodingNotebook } from "@/lib/coding-db";

export default async function ProvaPage() {
  const user = await currentUser();
  let problems = await readProva(user);
  if (user) {
    const sync = await syncCodingProblemsToProva(user.uid, readCodingNotebook(user.uid).problems);
    if (sync.matched) problems = await readProva(user);
  }
  return <Shell className="prova-page" eyebrow="Coding workspace" title="Prova"><ProvaWorkspace seed={problems} /></Shell>;
}
