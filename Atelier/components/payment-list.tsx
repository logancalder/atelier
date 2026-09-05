"use client";

import { useMemo, useState } from "react";
import type { Payment, Student } from "@/lib/types";
import { PaymentRow } from "./rows";
import { Button, Empty, Input, Select } from "./ui";

type SortKey = "due-asc" | "due-desc" | "amount-desc" | "amount-asc" | "student-asc";

export function PaymentList({
  payments,
  students,
  zelleHandle,
  emptyTitle = "No payments",
  emptyBody = "There are no payments in this section.",
  pageSize = 6,
  defaultSort = "due-asc",
}: {
  payments: Payment[];
  students: Record<string, Student>;
  zelleHandle?: string;
  emptyTitle?: string;
  emptyBody?: string;
  pageSize?: number;
  defaultSort?: SortKey;
}) {
  const [sort, setSort] = useState<SortKey>(defaultSort);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState("all");
  const [kind, setKind] = useState("all");

  const studentOptions = useMemo(() => {
    const ids = new Set(payments.map((payment) => payment.studentId));
    return [...ids]
      .map((id) => students[id])
      .filter((student): student is Student => Boolean(student))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [payments, students]);

  const sorted = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return payments
      .filter((payment) => studentId === "all" || payment.studentId === studentId)
      .filter((payment) => kind === "all" || payment.kind === kind)
      .filter((payment) => {
        if (!normalizedQuery) return true;
        const student = students[payment.studentId];
        return [student?.name, payment.memo, payment.kind, payment.amountCents / 100]
          .some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
      if (sort === "due-asc") return a.dueDate.localeCompare(b.dueDate);
      if (sort === "due-desc") return b.dueDate.localeCompare(a.dueDate);
      if (sort === "amount-desc") return b.amountCents - a.amountCents;
      if (sort === "amount-asc") return a.amountCents - b.amountCents;
      const aName = students[a.studentId]?.name ?? "";
      const bName = students[b.studentId]?.name ?? "";
      return aName.localeCompare(bName);
      });
  }, [kind, payments, query, sort, studentId, students]);

  if (!payments.length) return <Empty title={emptyTitle} body={emptyBody} />;

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  return (
    <div>
      <div className="mb-3 grid items-center gap-2 border-b border-line/70 pb-3 sm:grid-cols-2">
        <Input
          type="search"
          aria-label="Search payments"
          placeholder="Search student or memo…"
          className="py-1.5 text-xs"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        <Select
          aria-label="Filter by student"
          className="w-full py-1.5 text-xs"
          value={studentId}
          onChange={(event) => {
            setStudentId(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">All students</option>
          {studentOptions.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
        </Select>
        <Select
          aria-label="Filter by payment type"
          className="w-full py-1.5 text-xs"
          value={kind}
          onChange={(event) => {
            setKind(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">All types</option>
          <option value="session">Sessions</option>
          <option value="package">Packages</option>
          <option value="other">Other</option>
        </Select>
        <p className="justify-self-end text-xs text-mute">
          {sorted.length} of {payments.length}
        </p>
      </div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-mute">Showing {sorted.length === payments.length ? "all payments" : "filtered results"}</p>
        <label className="flex items-center gap-2 text-xs text-mute">
          <span>Sort</span>
          <Select
            aria-label="Sort payments"
            className="w-auto min-w-36 py-1.5 text-xs"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortKey);
              setPage(1);
            }}
          >
            <option value="due-asc">Due date · soonest</option>
            <option value="due-desc">Due date · latest</option>
            <option value="amount-desc">Amount · highest</option>
            <option value="amount-asc">Amount · lowest</option>
            <option value="student-asc">Student · A–Z</option>
          </Select>
        </label>
      </div>

      {visible.length ? <div className="payment-page" key={`${query}-${studentId}-${kind}-${sort}-${currentPage}`}>
        {visible.map((payment) => (
          <PaymentRow
            key={payment.id}
            payment={payment}
            student={students[payment.studentId]}
            zelleHandle={zelleHandle}
          />
        ))}
      </div> : (
        <div className="rounded-xl border border-dashed border-line px-4 py-7 text-center">
          <p className="font-serif text-lg">No matching payments</p>
          <p className="mt-1 text-sm text-mute">Try a different student, type, or search.</p>
          <Button className="mt-3" type="button" variant="ghost" onClick={() => { setQuery(""); setStudentId("all"); setKind("all"); setPage(1); }}>
            Clear filters
          </Button>
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Payment pages">
          <Button type="button" variant="ghost" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            ← Previous
          </Button>
          <p className="text-xs tabular-nums text-mute">
            {start + 1}–{Math.min(start + pageSize, sorted.length)} of {sorted.length}
          </p>
          <Button type="button" variant="ghost" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
            Next →
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
