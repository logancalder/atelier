"use client";

import { useMemo, useState } from "react";
import type { Session, Student } from "@/lib/types";
import { SessionRow } from "./rows";
import { Button, Empty, Select } from "./ui";

type SortKey = "date-desc" | "date-asc" | "status";

const statusOrder: Record<Session["status"], number> = {
  scheduled: 0,
  completed: 1,
  no_show: 2,
  cancelled: 3,
};

export function SessionList({
  sessions,
  student,
  pageSize = 6,
}: {
  sessions: Session[];
  student: Student;
  pageSize?: number;
}) {
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [status, setStatus] = useState<Session["status"] | "all">("all");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    return sessions
      .filter((session) => status === "all" || session.status === status)
      .sort((a, b) => {
        if (sort === "date-asc") return a.startsAt.localeCompare(b.startsAt);
        if (sort === "status") {
          return statusOrder[a.status] - statusOrder[b.status] || b.startsAt.localeCompare(a.startsAt);
        }
        return b.startsAt.localeCompare(a.startsAt);
      });
  }, [sessions, sort, status]);

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
            <option value="date-desc">Date · newest</option>
            <option value="date-asc">Date · oldest</option>
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

      <div className="mt-4 flex min-h-9 items-center justify-between gap-3">
        {totalPages > 1 ? (
          <>
            <Button type="button" variant="ghost" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              ← Previous
            </Button>
            <p className="text-xs tabular-nums text-mute">
              {start + 1}–{Math.min(start + pageSize, sorted.length)} of {sorted.length}
            </p>
            <Button type="button" variant="ghost" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
              Next →
            </Button>
          </>
        ) : (
          <p className="ml-auto text-xs text-mute">{sorted.length} of {sessions.length} sessions</p>
        )}
      </div>
    </div>
  );
}
