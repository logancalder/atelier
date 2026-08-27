import { Modal } from "@/components/forms";
import { StudentCard } from "@/components/rows";
import { Shell } from "@/components/shell";
import { StudentForm } from "@/components/studio-forms";
import { Empty } from "@/components/ui";
import { readStudio } from "@/lib/db";
import { dataOwnerId } from "@/lib/auth";

export default async function StudentsPage() {
  const studio = readStudio(await dataOwnerId());
  const active = studio.students.filter((student) => student.status !== "archived");
  const archived = studio.students.filter((student) => student.status === "archived");

  return (
    <Shell
      eyebrow="People"
      title="Students"
      actions={
        <Modal title="Add a student" label="New student">
          <StudentForm />
        </Modal>
      }
    >
      <div className="mb-10 flex items-end justify-between gap-6 border-b border-line pb-5">
        <div>
          <p className="section-label">Current roster</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">Rates, contact details, notes, and payment history live inside each student’s page.</p>
        </div>
        <p className="shrink-0 font-serif text-2xl">{active.length}</p>
      </div>
      {active.length ? (
        <div className="student-directory grid gap-x-16 lg:grid-cols-2">
          {active.map((student) => (
            <StudentCard key={student.id} student={student} href={`/students/${student.id}`} />
          ))}
        </div>
      ) : (
        <Empty title="No students yet" body="Add someone you’re teaching. Rate, notes, and Zelle live on their page." />
      )}
      {archived.length ? (
        <div className="mt-20">
          <h2 className="mb-4 font-serif text-2xl text-mute">Archived</h2>
          <div className="student-directory grid gap-x-16 lg:grid-cols-2">
            {archived.map((student) => (
              <StudentCard key={student.id} student={student} href={`/students/${student.id}`} />
            ))}
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
