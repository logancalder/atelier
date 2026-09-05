import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { SignOutButton } from "@/components/sign-out-button";
import { ProviderIcon } from "@/components/provider-icon";
import { currentUser } from "@/lib/auth";
import { adminAuth, adminDb, firebaseAdminConfigured } from "@/lib/firebase-admin";
import { saveProfile } from "@/lib/profile-actions";

export default async function ProfilePage() {
  if (!firebaseAdminConfigured) return <Shell className="account-page" eyebrow="Account" title="Profile" description="Your identity and preferences, in one place."><div className="empty-state"><p className="empty-title">You’re working locally</p><p className="text-sm text-mute">Connect a configured Atelier account to manage your profile and sync your work.</p></div></Shell>;
  const user = await currentUser();
  if (!user) redirect("/login");
  const stored = (await adminDb().collection("users").doc(user.uid).get()).data() ?? {};
  const authUser = await adminAuth().getUser(user.uid);
  const photoURL = String(stored.photoURL || user.picture || "");
  const initial = String(stored.displayName || user.name || user.email || "A").slice(0, 1).toUpperCase();
  return (
    <Shell className="account-page" description="Your identity, connected accounts, and workspace preferences." eyebrow="Account" title={String(stored.displayName || user.name || "Your profile")}>
      <div className="profile-layout">
        <aside className="profile-identity">
          <div className="profile-avatar" style={photoURL ? { backgroundImage: `url(${JSON.stringify(photoURL)})` } : undefined} role={photoURL ? "img" : undefined} aria-label={photoURL ? `${String(stored.displayName || user.name || "User")} profile photo` : undefined}>{photoURL ? null : initial}</div>
          <p>{user.email}</p>
          <p className="text-mute">{user.firebase?.sign_in_provider?.replace(".com", "") || "Firebase"}</p>
          <div className="linked-accounts">
            <p className="metric-label">Linked accounts</p>
            {authUser.providerData.map((provider) => {
              const id = provider.providerId as "google.com" | "github.com" | "password";
              const label = id === "google.com" ? "Google" : id === "github.com" ? "GitHub" : "Email & password";
              return <div className="linked-account" key={id}><ProviderIcon provider={id} /><span><strong>{label}</strong><small>{provider.email || user.email}</small></span><i>Linked</i></div>;
            })}
          </div>
          <SignOutButton />
        </aside>
        <form action={saveProfile} className="profile-form"><div className="form-section-heading"><h2>Workspace preferences</h2><p>How you appear across Atelier.</p></div>
          <label>Display name<input name="displayName" defaultValue={String(stored.displayName || user.name || "")} /></label>
          <label>Timezone<input name="timezone" defaultValue={String(stored.timezone || "America/Los_Angeles")} /></label>
          <label>About<textarea name="bio" rows={6} defaultValue={String(stored.bio || "")} placeholder="A little context for your workspace…" /></label>
          <button type="submit">Save profile</button>
        </form>
      </div>
    </Shell>
  );
}
