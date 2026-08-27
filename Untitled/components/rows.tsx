"use client";

import { endSeries, markPaymentReceived, markPaymentUnreceived, toggleNotePin, deleteNote, updateSessionStatus } from "@/lib/actions";
import { formatRange, formatShortDate, formatTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { Note, Payment, RecurringSeries, Session, Student } from "@/lib/types";
import Link from "next/link";
import { ActionButton } from "./forms";
import { Badge } from "./ui";
import { useToast } from "./toast";

export function SessionChip({
  session,
  student,
}: {
  session: Session;
  student?: Student | null;
}) {
  return (
    <Link
      href={`/students/${session.studentId}`}
      className={`mb-1 block border-l-2 px-2 py-1.5 text-xs leading-snug transition-colors ${
        session.status === "cancelled" ? "border-line text-mute line-through" : "border-[#8f806b] text-ink hover:bg-white/45"
      }`}
    >
      <span className="block font-medium">{formatTime(session.startsAt)}</span>
      <span className="block">{student?.name ?? "Student"}</span>
    </Link>
  );
}

export function SessionRow({
  session,
  student,
}: {
  session: Session;
  student?: Student | null;
}) {
  const tone =
    session.status === "completed"
      ? "good"
      : session.status === "cancelled"
        ? "quiet"
        : session.status === "no_show"
          ? "late"
          : "default";

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line py-4 last:border-b-0">
      <div>
        <p className="text-sm text-ink">
          <span className="font-medium">{student?.name ?? "Student"}</span>
          <span className="text-mute"> · {formatShortDate(session.startsAt)} · {formatRange(session.startsAt, session.durationMin)}</span>
        </p>
        <p className="mt-0.5 text-sm text-mute">
          {student?.subject || "Tutoring"}
          {session.lessonFocus ? ` · ${session.lessonFocus}` : ""}
          {session.seriesId ? " · weekly" : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Badge tone={tone}>{session.status.replace("_", " ")}</Badge>
        {session.status === "scheduled" ? (
          <>
            <ActionButton successMessage="Session completed" action={() => updateSessionStatus(session.id, "completed")}>Done</ActionButton>
            <ActionButton successMessage="Session marked no-show" action={() => updateSessionStatus(session.id, "no_show")}>No-show</ActionButton>
            <ActionButton successMessage="Session cancelled" variant="danger" action={() => updateSessionStatus(session.id, "cancelled")}>
              Cancel
            </ActionButton>
          </>
        ) : (
          <ActionButton successMessage="Session restored" action={() => updateSessionStatus(session.id, "scheduled")}>Restore</ActionButton>
        )}
      </div>
    </div>
  );
}

export function PaymentRow({
  payment,
  student,
  zelleHandle,
}: {
  payment: Payment;
  student?: Student | null;
  zelleHandle?: string;
}) {
  const tone = payment.status === "received" ? "good" : payment.status === "missing" ? "late" : "warn";
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line py-4 last:border-b-0">
      <div>
        <p className="text-sm">
          <span className="font-medium">{formatMoney(payment.amountCents)}</span>
          <span className="text-mute">
            {" "}
            · {student?.name ?? "Student"} · due {formatShortDate(payment.dueDate)}
          </span>
        </p>
        <p className="mt-0.5 text-sm text-mute">
          {payment.kind}
          {payment.memo ? ` · ${payment.memo}` : ""}
          {student?.zelleName ? ` · from ${student.zelleName}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Badge tone={tone}>{payment.status}</Badge>
        {payment.status === "received" && payment.plaidTransactionId ? (
          <Badge tone="good">Detected from Zelle</Badge>
        ) : null}
        {payment.status === "received" ? (
          <ActionButton successMessage="Payment moved back to outstanding" action={() => markPaymentUnreceived(payment.id)}>Undo</ActionButton>
        ) : (
          <ActionButton successMessage="Payment marked received" variant="primary" action={() => markPaymentReceived(payment.id)}>
            Received via Zelle
          </ActionButton>
        )}
        {zelleHandle && payment.status !== "received" ? (
          <CopyButton
            text={`Hi${student ? ` ${student.name.split(" ")[0]}` : ""}, reminder to Zelle ${formatMoney(payment.amountCents)} to ${zelleHandle}. Thank you!`}
          />
        ) : null}
      </div>
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className="rounded-md px-3 py-1.5 text-sm text-mute hover:bg-white/70 hover:text-ink"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        toast.show("Reminder copied", "info");
      }}
    >
      Copy reminder
    </button>
  );
}

export function SeriesRow({
  series,
  student,
}: {
  series: RecurringSeries;
  student?: Student | null;
}) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-4 last:border-b-0">
      <div>
        <p className="text-sm">
          <span className="font-medium">{student?.name ?? "Student"}</span>
          <span className="text-mute">
            {" "}
            · {days[series.weekday]}s at {series.time} · {series.durationMin} min
          </span>
        </p>
        <p className="text-sm text-mute">
          from {formatShortDate(series.startDate)}
          {series.endDate ? ` until ${formatShortDate(series.endDate)}` : " · open-ended"}
        </p>
      </div>
      <ActionButton successMessage="Recurring series ended" variant="danger" action={() => endSeries(series.id)}>
        End series
      </ActionButton>
    </div>
  );
}

export function NoteCard({ note }: { note: Note }) {
  return (
    <article className="border-t border-line py-4 first:border-t-0">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-mute">
        <span>
          {new Date(note.createdAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
          {note.pinned ? " · pinned" : ""}
        </span>
        <span className="flex gap-1">
          <ActionButton successMessage={note.pinned ? "Note unpinned" : "Note pinned"} variant="quiet" action={() => toggleNotePin(note.id)}>
            {note.pinned ? "Unpin" : "Pin"}
          </ActionButton>
          <ActionButton successMessage="Note deleted" variant="danger" action={() => deleteNote(note.id)}>
            Delete
          </ActionButton>
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{note.body}</p>
    </article>
  );
}

export function StudentCard({ student, href }: { student: Student; href: string }) {
  return (
    <Link
      href={href}
      className="group block border-b border-line py-5 transition-colors hover:border-ink/40"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-serif text-xl text-ink">{student.name}</p>
        <span className="h-2 w-2 rounded-full" style={{ background: student.color }} />
      </div>
      <p className="text-sm text-mute">
        {student.subject || "General tutoring"}
        {student.grade ? ` · ${student.grade}` : ""}
      </p>
      <p className="mt-3 text-xs uppercase tracking-[0.12em] text-mute group-hover:text-ink">{formatMoney(student.hourlyRateCents)}/hr <span className="ml-1">→</span></p>
    </Link>
  );
}
