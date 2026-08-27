import { Modal } from "@/components/forms";
import { SessionRow } from "@/components/rows";
import { Shell } from "@/components/shell";
import { PaymentForm, SessionForm, SettingsForm } from "@/components/studio-forms";
import { Badge, Card, Empty } from "@/components/ui";
import { formatLongDate, monthKey, todayKey } from "@/lib/dates";
import { readStudio } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { monthReceivedCents, paymentsByStatus, todaySessions, upcomingSessions } from "@/lib/queries";
import { dataOwnerId } from "@/lib/auth";

export default async function StudioPage() {
  const studio = readStudio(await dataOwnerId());
  const students = Object.fromEntries(studio.students.map((student) => [student.id, student]));
  const today = todaySessions(studio);
  const upcoming = upcomingSessions(studio);
  const missing = paymentsByStatus(studio, "missing");
  const upcomingPay = paymentsByStatus(studio, "upcoming");
  const received = monthReceivedCents(studio, monthKey());
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const greeting = studio.settings.tutorName
    ? `${hello}, ${studio.settings.tutorName.split(" ")[0]}`
    : "Your tutoring desk";

  return (
    <Shell
      eyebrow={formatLongDate(todayKey())}
      title={greeting}
      actions={
        <>
          <Modal title="Schedule a session" label="New session">
            <SessionForm students={studio.students.filter((s) => s.status !== "archived")} />
          </Modal>
          <Modal title="Log a Zelle payment" label="Log payment" variant="ghost">
            <PaymentForm students={studio.students.filter((s) => s.status !== "archived")} />
          </Modal>
        </>
      }
    >
      <div className="stat-strip mb-16 grid sm:grid-cols-3">
        <Card>
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Today</p>
          <p className="mt-2 font-serif text-3xl">{today.length}</p>
          <p className="text-sm text-mute">sessions on the books</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Missing Zelle</p>
          <p className="mt-2 font-serif text-3xl">{formatMoney(missing.reduce((s, p) => s + p.amountCents, 0))}</p>
          <p className="text-sm text-mute">{missing.length} unpaid</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Received this month</p>
          <p className="mt-2 font-serif text-3xl">{formatMoney(received)}</p>
          <p className="text-sm text-mute">{upcomingPay.length} still upcoming</p>
        </Card>
      </div>

      <div className="content-flow">
        <Card className="content-section">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Today’s table</h2>
            <Badge>{today.length ? `${today.length}` : "clear"}</Badge>
          </div>
          {today.length ? (
            today.map((session) => (
              <SessionRow key={session.id} session={session} student={students[session.studentId]} />
            ))
          ) : (
            <Empty title="No sessions today" body="A quiet day. Schedule something, or take the afternoon." />
          )}
          {upcoming.length ? (
            <div className="mt-8">
              <h3 className="mb-2 text-[11px] uppercase tracking-[0.16em] text-mute">Coming up</h3>
              {upcoming
                .filter((session) => !session.startsAt.startsWith(todayKey()))
                .slice(0, 6)
                .map((session) => (
                  <SessionRow key={session.id} session={session} student={students[session.studentId]} />
                ))}
            </div>
          ) : null}
        </Card>

        <div className="grid gap-x-16 gap-y-12 lg:grid-cols-2">
          <Card className="content-section">
            <h2 className="mb-3 font-serif text-2xl">Needs chasing</h2>
            {missing.length ? (
              <ul className="space-y-2 text-sm">
                {missing.slice(0, 6).map((payment) => (
                  <li key={payment.id} className="flex justify-between gap-3">
                    <span>{students[payment.studentId]?.name}</span>
                    <span className="text-[#8a4336]">{formatMoney(payment.amountCents)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-mute">All caught up. Lovely.</p>
            )}
          </Card>
          <Card className="content-section">
            <details className="quiet-disclosure">
              <summary>
                <span>
                  <span className="block font-serif text-2xl text-ink">Studio settings</span>
                  <span className="mt-1 block text-sm text-mute">Your display name and Zelle details</span>
                </span>
              </summary>
              <div className="mt-7 max-w-2xl">
                <SettingsForm
                  tutorName={studio.settings.tutorName}
                  zelleHandle={studio.settings.zelleHandle}
                  zelleName={studio.settings.zelleName}
                />
              </div>
            </details>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
