"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tutoringLinks = [
  { href: "/studio", label: "Studio", hint: "Today" },
  { href: "/students", label: "Students", hint: "People" },
  { href: "/sessions", label: "Sessions", hint: "Calendar" },
  { href: "/money", label: "Zelle", hint: "Ledger" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="app-nav" aria-label="Main navigation">
      <p className="nav-section-label">Coding</p>
      <Link href="/coding" className="nav-link" data-active={pathname.startsWith("/coding")}>
        <span className="nav-index" aria-hidden="true">01</span><span className="min-w-0"><span className="block font-medium">Problem notes</span><span className="nav-hint">Practice</span></span>
      </Link>
      <p className="nav-section-label nav-section-spaced">Tutoring</p>
      {tutoringLinks.map((link, index) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} className="nav-link" data-active={active}>
            <span className="nav-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span className="min-w-0">
              <span className="block font-medium">{link.label}</span>
              <span className="nav-hint">{link.hint}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
