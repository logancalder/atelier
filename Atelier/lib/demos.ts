import { adminDb } from "./firebase-admin";
export type Demo = { ownerId: string; name: string; url: string; passwordHash: string; apiKeyHash: string; version: string; expiresAt: string | null; enabled: boolean; createdAt: string };
export const demos = () => adminDb().collection("demoSites");
export type DemoView = { expired: boolean; id: string; name: string; url: string; expiresAt: string | null; enabled: boolean; logins: { id: string; at: string; device: string }[] };
export async function listDemos(ownerId: string): Promise<DemoView[]> {
  const sites = await demos().where("ownerId", "==", ownerId).get();
  return Promise.all(sites.docs.map(async doc => {
    const d = doc.data() as Demo;
    const logins = await doc.ref.collection("logins").orderBy("at", "desc").limit(50).get();
    return { expired: !!d.expiresAt && Date.parse(d.expiresAt) <= Date.now(), id: doc.id, name: d.name, url: d.url, expiresAt: d.expiresAt, enabled: d.enabled,
      logins: logins.docs.map(log => ({ id: log.id, at: log.get("at") as string, device: log.get("device") as string })) };
  }));
}
