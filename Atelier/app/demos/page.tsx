import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listDemos } from "@/lib/demos";
import { Shell } from "@/components/shell";
import { Card } from "@/components/ui";
import { DemoForm, DemoList } from "@/components/demo-manager";
export default async function DemosPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/demos");
  const demos = await listDemos(user.uid);
  return <Shell title="Client demos" eyebrow="Workbench" description="Manage preview access and see when someone uses the client password.">
    <p className="mb-6 max-w-3xl text-mute">Each successful password entry records its time and reported browser / operating system. Shared passwords do not identify a person. No IP addresses or device fingerprints are stored.</p>
    <DemoList demos={demos} />
    <Card><details><summary className="cursor-pointer font-serif text-2xl">Add a demo</summary><div className="mt-6"><DemoForm /></div></details></Card>
  </Shell>;
}
