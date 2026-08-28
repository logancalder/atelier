import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { firebaseAdminConfigured } from "@/lib/firebase-admin";

export async function Shell({
  title,
  eyebrow,
  actions,
  className = "",
  children,
}: {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
  section?: "coding" | "tutoring";
}) {
  if (firebaseAdminConfigured && !(await currentUser())) redirect("/login");
  return (
    <>
      <header className={`page-header ${className}`.trim()}>
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-mute">{eyebrow}</p>
            ) : null}
            <h1 className="font-serif text-[clamp(2rem,5vw,3.2rem)] leading-[1.05] tracking-[-0.025em] text-ink">{title}</h1>
          </div>
          {actions ? <div className="page-actions flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </header>
      <main className={`page-main ${className}`.trim()}>{children}</main>
    </>
  );
}
