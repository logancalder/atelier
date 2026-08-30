import Link from "next/link";
import { todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { Payment, Student } from "@/lib/types";

export function StudentBalances({ students, payments }: { students: Student[]; payments: Payment[] }) {
  const today = todayKey();
  const balances = students
    .filter((student) => student.status !== "archived")
    .map((student) => {
      const studentPayments = payments.filter((payment) => payment.studentId === student.id);
      const dueCents = studentPayments
        .filter((payment) => (payment.status === "missing" || payment.status === "upcoming") && payment.dueDate <= today)
        .reduce((sum, payment) => sum + payment.amountCents, 0);
      const upcomingCents = studentPayments
        .filter((payment) => payment.status === "upcoming" && payment.dueDate > today)
        .reduce((sum, payment) => sum + payment.amountCents, 0);
      return { student, dueCents, upcomingCents, hasPayments: studentPayments.length > 0 };
    })
    .filter(({ student, hasPayments }) => hasPayments || student.zelleName)
    .sort((a, b) => b.dueCents - a.dueCents || a.student.name.localeCompare(b.student.name));

  if (!balances.length) return null;

  return (
    <section className="mb-12 border-t border-ink">
      <div className="flex items-baseline justify-between border-b border-line py-3">
        <div>
          <p className="section-label">Reconciled balances</p>
          <h2 className="mt-1 font-serif text-2xl">By student</h2>
        </div>
        <p className="text-xs text-mute">Checking · Zelle deposits</p>
      </div>
      <div>
        {balances.map(({ student, dueCents, upcomingCents }) => (
          <Link key={student.id} href={`/students/${student.id}`} className="balance-row">
            <div className="min-w-0">
              <p className="font-medium text-ink">{student.name}</p>
              <p className="mt-0.5 truncate text-xs text-mute">
                {student.zelleName ? `Zelle from ${student.zelleName}` : "No Zelle sender name saved"}
                {upcomingCents > 0 ? ` · ${formatMoney(upcomingCents)} upcoming` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className={dueCents > 0 ? "balance-due" : "balance-good"}>
                {dueCents > 0 ? `${formatMoney(dueCents)} due` : "Good"}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-mute">{dueCents > 0 ? "outstanding" : "paid up"}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
