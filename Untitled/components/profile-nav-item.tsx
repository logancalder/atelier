"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Profile = { displayName: string; email: string; photoURL: string };

export function ProfileNavItem() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetch("/api/profile").then((response) => response.ok ? response.json() : null).then(setProfile).catch(() => undefined);
  }, []);

  if (!profile) return null;
  const initial = (profile.displayName || profile.email || "A").slice(0, 1).toUpperCase();

  return (
    <div className="sidebar-profile">
      <p className="nav-section-label">Profile</p>
      <Link href="/profile" className="profile-nav-link" data-active={pathname.startsWith("/profile")}>
        <span className="profile-nav-avatar" style={profile.photoURL ? { backgroundImage: `url(${JSON.stringify(profile.photoURL).slice(1, -1)})` } : undefined}>{profile.photoURL ? null : initial}</span>
        <span className="min-w-0"><span className="profile-nav-name">{profile.displayName || profile.email.split("@")[0]}</span><span className="nav-hint">{profile.email}</span></span>
      </Link>
    </div>
  );
}
