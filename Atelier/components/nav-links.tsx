"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const tutoringLinks = [
  { href: "/studio", label: "Studio", hint: "Today" },
  { href: "/students", label: "Students", hint: "People" },
  { href: "/sessions", label: "Sessions", hint: "Calendar" },
  { href: "/money", label: "Zelle", hint: "Ledger" },
];

export function NavLinks() {
  const pathname = usePathname();
  const [codingOpen, setCodingOpen] = useState(true);
  const [tutoringOpen, setTutoringOpen] = useState(true);

  return (
    <nav className="app-nav" aria-label="Main navigation">
      <NavSection label="Coding" open={codingOpen} onToggle={() => setCodingOpen((value) => !value)}>
        <Link href="/coding" className="nav-link" data-active={pathname.startsWith("/coding")}>
          <span className="nav-index" aria-hidden="true">01</span><span className="min-w-0"><span className="block font-medium">Problem notes</span><span className="nav-hint">Practice</span></span>
        </Link>
        <Link href="/prova" className="nav-link" data-active={pathname.startsWith("/prova")}>
          <span className="nav-index" aria-hidden="true">02</span><span className="min-w-0"><span className="block font-medium">Prova</span><span className="nav-hint">LeetCode tracker</span></span>
        </Link>
      </NavSection>
      <NavSection label="Tutoring" open={tutoringOpen} onToggle={() => setTutoringOpen((value) => !value)}>
        {tutoringLinks.map((link, index) => {
          const active = pathname.startsWith(link.href);
          return <Link key={link.href} href={link.href} className="nav-link" data-active={active}><span className="nav-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0"><span className="block font-medium">{link.label}</span><span className="nav-hint">{link.hint}</span></span></Link>;
        })}
      </NavSection>
    </nav>
  );
}

function NavSection({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return <section className="nav-category" data-open={open}><button type="button" className="nav-section-label" onClick={onToggle} aria-expanded={open}><span>{label}</span><span className="nav-collapse-mark" aria-hidden="true">⌄</span></button><div className="nav-category-links" hidden={!open}>{children}</div></section>;
}
