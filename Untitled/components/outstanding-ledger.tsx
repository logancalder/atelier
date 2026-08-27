"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import type { Payment, Student } from "@/lib/types";
import { PaymentList } from "./payment-list";

export function OutstandingLedger({
  missing,
  upcoming,
  students,
  zelleHandle,
}: {
  missing: Payment[];
  upcoming: Payment[];
  students: Record<string, Student>;
  zelleHandle?: string;
}) {
  const [view, setView] = useState<"missing" | "upcoming">(missing.length ? "missing" : "upcoming");
  const payments = view === "missing" ? missing : upcoming;
  const total = payments.reduce((sum, payment) => sum + payment.amountCents, 0);

  return (
    <section className="mb-12 border-t border-ink pt-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">Open ledger</p>
          <h2 className="mt-1 font-serif text-2xl">Outstanding payments</h2>
        </div>
        <p className={view === "missing" && total > 0 ? "font-serif text-2xl text-[#a14135]" : "font-serif text-2xl"}>
          {formatMoney(total)}
        </p>
      </div>

      <div className="ledger-tabs" role="tablist" aria-label="Outstanding payment status">
        <button type="button" role="tab" aria-selected={view === "missing"} onClick={() => setView("missing")}>
          Missing <span>{missing.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={view === "upcoming"} onClick={() => setView("upcoming")}>
          Upcoming <span>{upcoming.length}</span>
        </button>
      </div>

      <div className="pt-4" role="tabpanel">
        <PaymentList
          payments={payments}
          students={students}
          zelleHandle={zelleHandle}
          pageSize={8}
          emptyTitle={view === "missing" ? "Nothing missing" : "No upcoming charges"}
          emptyBody={view === "missing" ? "No overdue Zelle transfers." : "Scheduled sessions will add Zelle items automatically."}
        />
      </div>
    </section>
  );
}
