import { Modal } from "@/components/forms";
import { NoteCard, SeriesRow } from "@/components/rows";
import { PaymentList } from "@/components/payment-list";
import { SessionList } from "@/components/session-list";
import { Shell } from "@/components/shell";
import { NoteForm, PaymentForm, SeriesForm, SessionForm, StudentForm } from "@/components/studio-forms";
import { Badge, Card, Empty } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { todayKey } from "@/lib/dates";
import { readStudio } from "@/lib/db";
import { notFound } from "next/navigation";
import { dataOwnerId } from "@/lib/auth";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const today = todayKey();
  const studio = readStudio(await dataOwnerId());
  const student = studio.students.find((item) => item.id === id);
  if (!student) notFound();

  const sessions = studio.sessions.filter((session) => session.studentId === id);
  const payments = studio.payments
    .filter((payment) => payment.studentId === id)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const notes = studio.notes
    .filter((note) => note.studentId === id)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));
  const series = studio.series.filter((item) => item.studentId === id && (!item.endDate || item.endDate > today));
  const owed = payments
    .filter((payment) => payment.status === "missing" || payment.status === "upcoming")
    .reduce((sum, payment) => sum + payment.amountCents, 0);

  return (
    <Shell
      eyebrow={student.subject || "Student"}
      title={student.name}
      actions={
        <>
          <Badge tone={student.status === "active" ? "good" : student.status === "paused" ? "warn" : "quiet"}>
            {student.status}
          </Badge>
          <Modal title="Schedule" label="Session">
            <SessionForm students={[student]} studentId={student.id} />
          </Modal>
          <Modal title="Weekly series" label="Recurring" variant="ghost">
            <SeriesForm students={[student]} studentId={student.id} />
          </Modal>
        </>
      }
    >
      <div className="profile-facts">
        <div>
          <p>Rate</p>
          <strong>{formatMoney(student.hourlyRateCents)}/hr</strong>
        </div>
        <div>
          <p>Balance</p>
          <strong className={owed ? "text-[#a14135]" : "text-[#477047]"}>{owed ? formatMoney(owed) : "Paid up"}</strong>
        </div>
        <div><p>Late cancel</p><strong>{formatMoney(student.lateCancelFeeCents)}</strong></div>
        {student.grade ? <div><p>Grade</p><strong>{student.grade}</strong></div> : null}
        {student.parentName ? <div><p>Parent</p><strong>{student.parentName}</strong></div> : null}
        {student.zelleName ? <div><p>Zelle sender</p><strong>{student.zelleName}</strong></div> : null}
      </div>

      <div className="content-flow">
          <Card className="content-section">
            <h2 className="mb-4 font-serif text-2xl">Session journal</h2>
            <NoteForm studentId={student.id} />
            <div className="mt-7">
              {notes.length ? notes.map((note) => <NoteCard key={note.id} note={note} />) : (
                <Empty title="No journal yet" body="After a session, jot what landed and what to try next time." />
              )}
            </div>
          </Card>

        <div className="grid items-stretch gap-x-16 gap-y-12 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-12">
            <Card className="content-section">
              <h2 className="mb-3 font-serif text-2xl">Weekly series</h2>
              {series.length ? series.map((item) => <SeriesRow key={item.id} series={item} student={student} />) : (
                <p className="text-sm text-mute">No open recurring block.</p>
              )}
            </Card>
            <Card className="content-section flex flex-1 flex-col">
              <h2 className="mb-3 font-serif text-2xl">Sessions</h2>
              <SessionList sessions={sessions} student={student} today={today} pageSize={6} />
            </Card>
          </div>
          <Card className="content-section h-full min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-2xl">Zelle</h2>
              <Modal title="Log payment" label="Add" variant="ghost">
                <PaymentForm students={[student]} studentId={student.id} />
              </Modal>
            </div>
            <PaymentList payments={payments} students={{ [student.id]: student }} zelleHandle={studio.settings.zelleHandle} defaultSort="due-desc" pageSize={8} emptyTitle="No payments logged" emptyBody="Payments for this student will appear here." />
          </Card>
        </div>

          <Card className="content-section">
            <details className="quiet-disclosure">
              <summary>
                <span>
                  <span className="block font-serif text-2xl text-ink">Student details</span>
                  <span className="mt-1 block text-sm text-mute">Contact information, rate, status, and standing notes</span>
                </span>
              </summary>
              <div className="mt-7 max-w-3xl">
                <div className="mb-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-mute">
                  {student.email ? <span>{student.email}</span> : null}
                  {student.phone ? <span>{student.phone}</span> : null}
                </div>
                <StudentForm student={student} />
              </div>
            </details>
          </Card>
      </div>
    </Shell>
  );
}
