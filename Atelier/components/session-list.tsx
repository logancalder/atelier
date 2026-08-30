"use client";

import { useMemo, useState } from "react";
import { deleteCancelledSessions } from "@/lib/actions";
import type { Session, Student } from "@/lib/types";
import { ActionButton } from "./forms";
import { SessionRow } from "./rows";
import { Button, Empty, Select } from "./ui";

type SortKey = "date-nearest" | "date-farthest" | "status";

const statusOrder: Record<Session["status"], number> = {
  scheduled: 0,
  completed: 1,
  late_cancel: 2,
  no_show: 3,
  cancelled: 4,
};

function dayNumber(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

export function SessionList({
  sessions,
  student,
  today,
  pageSize = 6,
}: {
  sessions: Session[];
  student: Student;
  today: string;
  pageSize?: number;
}) {
  const [sort, setSort] = useState<SortKey>("date-nearest");
  const [status, setStatus] = useState<Session["status"] | "all">("all");
  const [page, setPage] = useState(1);
  const cancelledCount = sessions.filter((session) => session.status === "cancelled" || session.status === "late_cancel").length;
  const todayNumber = dayNumber(today);

  const sorted = useMemo(() => {
    return sessions
      .filter((session) => status === "all" || session.status === status)
      .sort((a, b) => {
        if (sort === "status") {
          return statusOrder[a.status] - statusOrder[b.status] || b.startsAt.localeCompare(a.startsAt);
        }
        const aDistance = Math.abs(dayNumber(a.startsAt) - todayNumber);
        const bDistance = Math.abs(dayNumber(b.startsAt) - todayNumber);
        if (sort === "date-farthest") return bDistance - aDistance || b.startsAt.localeCompare(a.startsAt);
        return aDistance - bDistance || b.startsAt.localeCompare(a.startsAt);
      });
  }, [sessions, sort, status, todayNumber]);

  if (!sessions.length) {
    return <Empty title="No sessions yet" body="Scheduled and completed sessions for this student will appear here." />;
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 grid gap-2 border-b border-line/70 pb-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-xs text-mute">
          <span>Status</span>
          <Select
            aria-label="Filter sessions by status"
            className="min-w-0 py-1.5 text-xs"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as Session["status"] | "all");
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="late_cancel">Late cancel</option>
            <option value="no_show">No-show</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </label>
        <label className="flex items-center gap-2 text-xs text-mute">
          <span>Sort</span>
          <Select
            aria-label="Sort sessions"
            className="min-w-0 py-1.5 text-xs"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortKey);
              setPage(1);
            }}
          >
            <option value="date-nearest">Soonest</option>
            <option value="date-farthest">Farthest</option>
            <option value="status">Status</option>
          </Select>
        </label>
      </div>

      {visible.length ? (
        <div className="payment-page flex-1" key={`${status}-${sort}-${currentPage}`}>
          {visible.map((session) => (
            <SessionRow key={session.id} session={session} student={student} />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-line px-4 py-7 text-center">
          <p className="font-serif text-lg">No sessions with that status</p>
          <Button className="mt-3" type="button" variant="ghost" onClick={() => { setStatus("all"); setPage(1); }}>
            Show all sessions
          </Button>
        </div>
      )}

      <div className="mt-4 flex min-h-9 flex-wrap items-center justify-between gap-3">
        {cancelledCount ? (
          <ActionButton
            action={() => deleteCancelledSessions(student.id)}
            confirmMessage={`Permanently delete all ${cancelledCount} cancelled session${cancelledCount === 1 ? "" : "s"} for ${student.name} and their payment records? This cannot be undone.`}
            successMessage="All cancelled sessions permanently deleted"
            variant="danger"
          >
            Remove all cancelled
          </ActionButton>
        ) : <span />}
        {totalPages > 1 ? (
          <div className="ml-auto flex items-center gap-3">
            <Button type="button" variant="ghost" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              ← Previous
            </Button>
            <p className="text-xs tabular-nums text-mute">
              {start + 1}–{Math.min(start + pageSize, sorted.length)} of {sorted.length}
            </p>
            <Button type="button" variant="ghost" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
              Next →
            </Button>
          </div>
        ) : (
          <p className="text-xs text-mute">{sorted.length} of {sessions.length} sessions</p>
        )}
      </div>
    </div>
  );
}
