import Link from "next/link";
import { Modal } from "@/components/forms";
import { SeriesRow, SessionChip } from "@/components/rows";
import { Shell } from "@/components/shell";
import { SeriesForm, SessionForm } from "@/components/studio-forms";
import { Card, Empty } from "@/components/ui";
import { addDays, formatShortDate, parseDateKey, startOfWeek, toDateKey, todayKey } from "@/lib/dates";
import { readStudio, sortSessions } from "@/lib/db";
import { weekSessions } from "@/lib/queries";
import { dataOwnerId } from "@/lib/auth";

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const studio = readStudio(await dataOwnerId());
  const students = Object.fromEntries(studio.students.map((student) => [student.id, student]));
  const active = studio.students.filter((student) => student.status !== "archived");
  const weekStart = week ? startOfWeek(parseDateKey(week)) : startOfWeek(new Date());
  const prev = toDateKey(addDays(weekStart, -7));
  const next = toDateKey(addDays(weekStart, 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const sessions = weekSessions(studio, weekStart);
  const openSeries = studio.series.filter((series) => !series.endDate || series.endDate > todayKey());

  return (
    <Shell
      eyebrow="Calendar"
      title="Sessions"
      actions={
        <>
          <Modal title="Schedule a session" label="New session">
            <SessionForm students={active} />
          </Modal>
          <Modal title="Weekly series" label="Recurring" variant="ghost">
            <SeriesForm students={active} />
          </Modal>
        </>
      }
    >
      <div className="mb-10 grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4">
        <Link href={`/sessions?week=${prev}`} className="text-sm text-mute hover:text-ink">
          ← Previous
        </Link>
        <p className="text-center font-serif text-base sm:text-xl">
          Week of {formatShortDate(toDateKey(weekStart))}
        </p>
        <Link href={`/sessions?week=${next}`} className="text-sm text-mute hover:text-ink">
          Next →
        </Link>
      </div>

      <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => {
          const key = toDateKey(day);
          const items = sortSessions(sessions.filter((session) => session.startsAt.startsWith(key)));
          const isToday = key === toDateKey(new Date());
          return (
            <Card key={key} className={isToday ? "today-column" : ""}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-mute">
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </p>
              <p className="mb-3 font-serif text-xl">{day.getDate()}</p>
              {items.length ? (
                items.map((session) => (
                  <SessionChip
                    key={session.id}
                    session={session}
                    student={students[session.studentId]}
                  />
                ))
              ) : (
                <p className="text-xs text-mute">—</p>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="mt-14">
        <h2 className="mb-3 font-serif text-2xl">Recurring blocks</h2>
        {openSeries.length ? (
          openSeries.map((series) => (
            <SeriesRow key={series.id} series={series} student={students[series.studentId]} />
          ))
        ) : (
          <Empty title="No weekly series" body="Set a weekday and time. Sessions will fill in for the next few months." />
        )}
      </Card>
    </Shell>
  );
}
