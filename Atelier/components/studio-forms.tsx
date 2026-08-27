"use client";

import { createNote, createPayment, createSeries, createSession, createStudent, saveSettings, updateStudent } from "@/lib/actions";
import { centsToInput } from "@/lib/money";
import { todayKey } from "@/lib/dates";
import type { Student } from "@/lib/types";
import { Button, Field, Input, Select, Textarea } from "./ui";
import { ActionForm } from "./forms";

const inputClass =
  "w-full rounded-md border border-line bg-white/80 px-3 py-2 text-sm outline-none focus:border-ink/40";

export function SettingsForm({
  tutorName,
  zelleHandle,
  zelleName,
}: {
  tutorName: string;
  zelleHandle: string;
  zelleName: string;
}) {
  return (
    <ActionForm action={saveSettings} successMessage="Studio settings saved" closeDialog={false} className="grid gap-3 sm:grid-cols-3">
      <Field label="Your name">
        <Input name="tutorName" defaultValue={tutorName} placeholder="Logan" />
      </Field>
      <Field label="Zelle handle">
        <Input name="zelleHandle" defaultValue={zelleHandle} placeholder="phone or email" />
      </Field>
      <Field label="Name on Zelle">
        <Input name="zelleName" defaultValue={zelleName} placeholder="as it appears" />
      </Field>
      <div className="sm:col-span-3">
        <Button type="submit">Save studio</Button>
      </div>
    </ActionForm>
  );
}

export function StudentForm({ student }: { student?: Student }) {
  const action = student ? updateStudent : createStudent;
  return (
    <ActionForm action={action} successMessage={student ? "Student updated" : "Student added"} className="grid gap-3 sm:grid-cols-2">
      {student ? <input type="hidden" name="id" value={student.id} /> : null}
      <Field label="Student">
        <Input name="name" required defaultValue={student?.name} placeholder="Maya Chen" />
      </Field>
      <Field label="Subject">
        <Input name="subject" defaultValue={student?.subject} placeholder="AP Calculus, SAT Writing…" />
      </Field>
      <Field label="Grade / level">
        <Input name="grade" defaultValue={student?.grade} placeholder="11th, college, adult" />
      </Field>
      <Field label="Hourly rate">
        <Input
          name="hourlyRate"
          type="number"
          min="0"
          step="0.01"
          defaultValue={student ? centsToInput(student.hourlyRateCents) : "80"}
        />
      </Field>
      <Field label="Default length (min)">
        <Input
          name="defaultDurationMin"
          type="number"
          min="15"
          step="15"
          defaultValue={student?.defaultDurationMin ?? 60}
        />
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue={student?.status ?? "active"}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </Select>
      </Field>
      <Field label="Parent / guardian">
        <Input name="parentName" defaultValue={student?.parentName} />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={student?.email} />
      </Field>
      <Field label="Phone">
        <Input name="phone" defaultValue={student?.phone} />
      </Field>
      <Field label="Zelle name they send from">
        <Input name="zelleName" defaultValue={student?.zelleName} placeholder="helps match transfers" />
      </Field>
      {student ? (
        <div className="sm:col-span-2">
          <Field label="Standing notes">
            <Textarea
              name="profileNotes"
              defaultValue={student.profileNotes}
              placeholder="Goals, accommodations, family context, curriculum…"
            />
          </Field>
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit">{student ? "Save student" : "Add student"}</Button>
      </div>
    </ActionForm>
  );
}

export function SessionForm({ students, studentId }: { students: Student[]; studentId?: string }) {
  return (
    <ActionForm action={createSession} successMessage="Session scheduled" className="grid gap-3 sm:grid-cols-2">
      <Field label="Student">
        <Select name="studentId" defaultValue={studentId} required>
          <option value="">Choose…</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Place">
        <Select name="place" defaultValue="online">
          <option value="online">Online</option>
          <option value="in_person">In person</option>
          <option value="hybrid">Hybrid</option>
        </Select>
      </Field>
      <Field label="Date">
        <Input name="date" type="date" required defaultValue={todayKey()} />
      </Field>
      <Field label="Time">
        <Input name="time" type="time" required defaultValue="16:00" />
      </Field>
      <Field label="Minutes">
        <Input name="durationMin" type="number" min="15" step="15" defaultValue="60" />
      </Field>
      <Field label="Location note">
        <Input name="locationNote" placeholder="Zoom, kitchen table, library…" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Lesson focus">
          <Input name="lessonFocus" placeholder="chain rule warm-up, essay outline…" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit">Schedule session</Button>
      </div>
    </ActionForm>
  );
}

export function SeriesForm({ students, studentId }: { students: Student[]; studentId?: string }) {
  return (
    <ActionForm action={createSeries} successMessage="Recurring sessions created" className="grid gap-3 sm:grid-cols-2">
      <Field label="Student">
        <Select name="studentId" defaultValue={studentId} required>
          <option value="">Choose…</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Weekday">
        <Select name="weekday" defaultValue="1">
          <option value="1">Monday</option>
          <option value="2">Tuesday</option>
          <option value="3">Wednesday</option>
          <option value="4">Thursday</option>
          <option value="5">Friday</option>
          <option value="6">Saturday</option>
          <option value="0">Sunday</option>
        </Select>
      </Field>
      <Field label="Time">
        <Input name="time" type="time" required defaultValue="16:00" />
      </Field>
      <Field label="Minutes">
        <Input name="durationMin" type="number" min="15" step="15" defaultValue="60" />
      </Field>
      <Field label="Starts">
        <Input name="startDate" type="date" required defaultValue={todayKey()} />
      </Field>
      <Field label="Ends (optional)">
        <Input name="endDate" type="date" />
      </Field>
      <Field label="Place">
        <Select name="place" defaultValue="online">
          <option value="online">Online</option>
          <option value="in_person">In person</option>
          <option value="hybrid">Hybrid</option>
        </Select>
      </Field>
      <Field label="Location note">
        <Input name="locationNote" />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit">Create weekly series</Button>
      </div>
    </ActionForm>
  );
}

export function PaymentForm({ students, studentId }: { students: Student[]; studentId?: string }) {
  return (
    <ActionForm action={createPayment} successMessage="Payment logged" className="grid gap-3 sm:grid-cols-2">
      <Field label="Student">
        <Select name="studentId" defaultValue={studentId} required>
          <option value="">Choose…</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Kind">
        <Select name="kind" defaultValue="other">
          <option value="session">Session</option>
          <option value="package">Package / retainer</option>
          <option value="other">Other</option>
        </Select>
      </Field>
      <Field label="Amount">
        <Input name="amount" type="number" min="0" step="0.01" required placeholder="80.00" />
      </Field>
      <Field label="Due">
        <Input name="dueDate" type="date" required defaultValue={todayKey()} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Memo">
          <Input name="memo" placeholder="April package, materials, makeup…" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit">Log Zelle payment</Button>
      </div>
    </ActionForm>
  );
}

export function NoteForm({ studentId }: { studentId: string }) {
  return (
    <ActionForm action={createNote} successMessage="Note added" className="grid gap-3">
      <input type="hidden" name="studentId" value={studentId} />
      <Textarea name="body" required placeholder="After today’s session…" className={inputClass} />
      <Button type="submit">Add note</Button>
    </ActionForm>
  );
}
