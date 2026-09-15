"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  { label: "Client work", links: [{ href: "/demos", label: "Client demos", path: "M3 4h18v14H3V4Zm5 18h8m-4-4v4M3 8h18" }] },
  { label: "Coding", links: [
    { href: "/coding", label: "Recent notes", path: "M8 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3M14 4l6 6M10 14l2-5 6-6 3 3-6 6-5 2Z" },
    { href: "/prova", label: "Problem library", path: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16" },
  ] },
  { label: "Tutoring", links: [
    { href: "/studio", label: "Tutoring desk", path: "M3 10 12 3l9 7v10H3V10Zm6 10v-7h6v7" },
    { href: "/money", label: "Billing", path: "M3 5h18v15H3V5Zm0 4h18m-5 4h5M7 5V3h12v2" },
  ] },
];

export function NavLinks() {
  const pathname = usePathname();
  return <nav className="app-nav" aria-label="Main navigation">
    {groups.map((group) => <div key={group.label} className="rail-group" role="group" aria-label={group.label}>
      {group.links.map((link) => {
        const active = pathname.startsWith(link.href) || (link.href === "/studio" && (pathname.startsWith("/students") || pathname.startsWith("/sessions"))) || (link.href === "/prova" && pathname.startsWith("/problems"));
        return <Link key={link.href} href={link.href} className="nav-link" data-active={active} aria-current={active ? "page" : undefined} aria-label={link.label} title={link.label}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={link.path} /></svg>
          <span className="rail-tooltip" aria-hidden="true">{link.label}</span>
        </Link>;
      })}
    </div>)}
  </nav>;
}
