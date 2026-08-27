"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLinks } from "./nav-links";
import { ProfileNavItem } from "./profile-nav-item";
import { VantaBackground } from "./vanta-background";

export function WorkspaceFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/login") return children;

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link href="/" className="brand-block" aria-label="Atelier welcome page">
          <div className="brand-mark" aria-hidden="true">A</div>
          <div>
            <p className="font-serif text-[1.45rem] leading-none">Atelier</p>
            <p className="brand-caption mt-1 text-[9px] uppercase tracking-[0.16em]">a private working desk</p>
          </div>
        </Link>
        <NavLinks />
        <ProfileNavItem />
      </aside>
      <div className="app-content">
        <VantaBackground variant="rings" />
        <div className="workspace-route">{children}</div>
      </div>
    </div>
  );
}
