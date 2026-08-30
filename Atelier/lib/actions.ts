"use server";

import { revalidatePath } from "next/cache";
import {
  cancelSessionPayment,
  ensureSessionPayment,
  findPayment,
  findSeries,
  findSession,
  findStudent,
  updateStudio,
} from "./db";
import { dollarsToCents } from "./money";
import { isValidRecurringSeriesInput } from "./dates";
import type {
  PaymentKind,
  SessionPlace,
  SessionStatus,
  StudentStatus,
} from "./types";
import { STUDENT_COLORS } from "./types";

function refresh() {
  revalidatePath("/", "layout");
}

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function num(form: FormData, key: string, fallback = 0) {
  const value = Number.parseInt(str(form, key), 10);
  return Number.isFinite(value) ? value : fallback;
}

export async function saveSettings(formData: FormData) {
  await updateStudio((studio) => {
    studio.settings.tutorName = str(formData, "tutorName");
    studio.settings.zelleHandle = str(formData, "zelleHandle");
    studio.settings.zelleName = str(formData, "zelleName");
  });
  refresh();
}

export async function createStudent(formData: FormData) {
  await updateStudio((studio) => {
    const color = STUDENT_COLORS[studio.students.length % STUDENT_COLORS.length];
    studio.students.push({
      id: crypto.randomUUID(),
      name: str(formData, "name") || "Untitled student",
      subject: str(formData, "subject"),
      grade: str(formData, "grade"),
      parentName: str(formData, "parentName"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      zelleName: str(formData, "zelleName"),
      hourlyRateCents: dollarsToCents(str(formData, "hourlyRate") || "0"),
      defaultDurationMin: num(formData, "defaultDurationMin", 60) || 60,
      status: "active",
      color,
      profileNotes: "",
      createdAt: new Date().toISOString(),
    });
  });
  refresh();
}

export async function updateStudent(formData: FormData) {
  const id = str(formData, "id");
  await updateStudio((studio) => {
    const student = findStudent(studio, id);
    if (!student) return;
    student.name = str(formData, "name") || student.name;
    student.subject = str(formData, "subject");
    student.grade = str(formData, "grade");
    student.parentName = str(formData, "parentName");
    student.email = str(formData, "email");
    student.phone = str(formData, "phone");
    student.zelleName = str(formData, "zelleName");
    student.hourlyRateCents = dollarsToCents(str(formData, "hourlyRate") || "0");
    student.defaultDurationMin = num(formData, "defaultDurationMin", student.defaultDurationMin);
    student.status = (str(formData, "status") as StudentStatus) || student.status;
    student.profileNotes = String(formData.get("profileNotes") ?? student.profileNotes);
  });
  refresh();
}

export async function archiveStudent(id: string) {
  await updateStudio((studio) => {
    const student = findStudent(studio, id);
    if (student) student.status = "archived";
  });
  refresh();
}

export async function createSession(formData: FormData) {
  await updateStudio((studio) => {
    const student = findStudent(studio, str(formData, "studentId"));
    if (!student) return;
    const date = str(formData, "date");
    const time = str(formData, "time");
    const durationMin = num(formData, "durationMin", student.defaultDurationMin) || 60;
    const session = {
      id: crypto.randomUUID(),
      studentId: student.id,
      seriesId: null,
      startsAt: `${date}T${time}`,
      durationMin,
      rateCents: student.hourlyRateCents,
      status: "scheduled" as const,
      place: (str(formData, "place") as SessionPlace) || "online",
      locationNote: str(formData, "locationNote"),
      lessonFocus: str(formData, "lessonFocus"),
      createdAt: new Date().toISOString(),
    };
    studio.sessions.push(session);
    ensureSessionPayment(studio, session);
  });
  refresh();
}

export async function updateSessionStatus(id: string, status: SessionStatus) {
  await updateStudio((studio) => {
    const session = findSession(studio, id);
    if (!session) return;
    session.status = status;
    if (status === "cancelled") {
      cancelSessionPayment(studio, id);
    } else {
      ensureSessionPayment(studio, session);
    }
  });
  refresh();
}

export async function createSeries(formData: FormData) {
  const weekday = num(formData, "weekday", -1);
  const time = str(formData, "time");
  const requestedDuration = str(formData, "durationMin");
  const startDate = str(formData, "startDate");
  const endDate = str(formData, "endDate");
  await updateStudio((studio) => {
    const student = findStudent(studio, str(formData, "studentId"));
    if (!student) return;
    const durationMin = requestedDuration ? num(formData, "durationMin", 0) : student.defaultDurationMin || 60;
    if (!isValidRecurringSeriesInput({ weekday, time, durationMin, startDate, endDate })) throw new Error("Invalid recurring session details.");
    studio.series.push({
      id: crypto.randomUUID(),
      studentId: student.id,
      weekday,
      time,
      durationMin,
      startDate,
      endDate: endDate || null,
      place: (str(formData, "place") as SessionPlace) || "online",
      locationNote: str(formData, "locationNote"),
      createdAt: new Date().toISOString(),
    });
  });
  refresh();
}

export async function endSeries(id: string) {
  await updateStudio((studio) => {
    const series = findSeries(studio, id);
    if (!series) return;
    const today = new Date().toISOString().slice(0, 10);
    series.endDate = today;
    for (const session of studio.sessions) {
      if (session.seriesId !== id || session.status !== "scheduled") continue;
      if (session.startsAt.slice(0, 10) > today) {
        session.status = "cancelled";
        cancelSessionPayment(studio, session.id);
      }
    }
  });
  refresh();
}

export async function createPayment(formData: FormData) {
  await updateStudio((studio) => {
    const student = findStudent(studio, str(formData, "studentId"));
    if (!student) return;
    studio.payments.push({
      id: crypto.randomUUID(),
      studentId: student.id,
      sessionId: null,
      kind: (str(formData, "kind") as PaymentKind) || "other",
      amountCents: dollarsToCents(str(formData, "amount") || "0"),
      dueDate: str(formData, "dueDate"),
      status: "upcoming",
      receivedAt: null,
      memo: str(formData, "memo"),
      createdAt: new Date().toISOString(),
    });
  });
  refresh();
}

export async function markPaymentReceived(id: string) {
  await updateStudio((studio) => {
    const payment = findPayment(studio, id);
    if (!payment) return;
    payment.status = "received";
    payment.receivedAt = new Date().toISOString();
  });
  refresh();
}

export async function markPaymentUnreceived(id: string) {
  await updateStudio((studio) => {
    const payment = findPayment(studio, id);
    if (!payment) return;
    payment.status = "upcoming";
    payment.receivedAt = null;
  });
  refresh();
}

export async function createNote(formData: FormData) {
  await updateStudio((studio) => {
    const now = new Date().toISOString();
    studio.notes.unshift({
      id: crypto.randomUUID(),
      studentId: str(formData, "studentId"),
      body: str(formData, "body"),
      pinned: false,
      createdAt: now,
      updatedAt: now,
    });
  });
  refresh();
}

export async function toggleNotePin(id: string) {
  await updateStudio((studio) => {
    const note = studio.notes.find((item) => item.id === id);
    if (note) note.pinned = !note.pinned;
  });
  refresh();
}

export async function deleteNote(id: string) {
  await updateStudio((studio) => {
    studio.notes = studio.notes.filter((note) => note.id !== id);
  });
  refresh();
}
