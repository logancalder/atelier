import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import { addDays, alignDateToWeekday, isValidDateKey, parseDateKey, parseLocalDateTime, toDateKey, toLocalDateTime, todayKey } from "./dates";
import { sessionAmount } from "./money";
import type {
  Note,
  Payment,
  RecurringSeries,
  Session,
  Student,
  Studio,
} from "./types";

import { DATA_DIR } from "./data-path";
const LEGACY_FILE = path.join(DATA_DIR, "studio.json");
const LEGACY_OWNER_FILE = path.join(DATA_DIR, ".studio-legacy-owner");
const safeOwner = (ownerId: string) => ownerId.replace(/[^a-zA-Z0-9_-]/g, "_");
const dataFile = (ownerId: string) => ownerId === "local" ? LEGACY_FILE : path.join(DATA_DIR, "users", safeOwner(ownerId), "studio.json");

function emptyStudio(): Studio {
  return {
    settings: {
      tutorName: "",
      zelleHandle: "",
      zelleName: "",
    },
    students: [],
    series: [],
    sessions: [],
    payments: [],
    notes: [],
  };
}

function loadRaw(ownerId = "local"): Studio {
  const file = dataFile(ownerId);
  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    const studio = emptyStudio();
    if (ownerId !== "local" && existsSync(LEGACY_FILE)) {
      if (!existsSync(LEGACY_OWNER_FILE)) writeFileSync(LEGACY_OWNER_FILE, ownerId);
      if (readFileSync(LEGACY_OWNER_FILE, "utf8") === ownerId) Object.assign(studio, JSON.parse(readFileSync(LEGACY_FILE, "utf8")) as Studio);
    }
    persist(studio, ownerId);
    return studio;
  }
  const parsed = JSON.parse(readFileSync(file, "utf8")) as Studio;
  return {
    ...emptyStudio(),
    ...parsed,
    settings: { ...emptyStudio().settings, ...parsed.settings },
    students: parsed.students ?? [],
    series: parsed.series ?? [],
    sessions: parsed.sessions ?? [],
    payments: parsed.payments ?? [],
    notes: parsed.notes ?? [],
  };
}

function persist(studio: Studio, ownerId = "local") {
  const file = dataFile(ownerId);
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(studio, null, 2));
  renameSync(tmp, file);
}

function refreshPaymentStatuses(studio: Studio) {
  const today = todayKey();
  for (const payment of studio.payments) {
    if (payment.status === "received") continue;
    payment.status = payment.dueDate < today ? "missing" : "upcoming";
  }
}

function sessionKey(seriesId: string, startsAt: string) {
  return `${seriesId}:${startsAt}`;
}

function expandRecurring(studio: Studio) {
  const horizon = addDays(new Date(), 16 * 7);
  const existing = new Set(
    studio.sessions
      .filter((session) => session.seriesId)
      .map((session) => sessionKey(session.seriesId as string, session.startsAt)),
  );

  for (const series of studio.series) {
    const student = studio.students.find((item) => item.id === series.studentId);
    if (!student || student.status === "archived") continue;

    let cursor = alignDateToWeekday(series.startDate, series.weekday);
    if (!cursor || (series.endDate && !isValidDateKey(series.endDate))) continue;
    const end = series.endDate ? parseDateKey(series.endDate) : horizon;
    const last = end < horizon ? end : horizon;

    while (cursor <= last) {
      const [hours, minutes] = series.time.split(":").map(Number);
      const starts = new Date(cursor);
      starts.setHours(hours ?? 0, minutes ?? 0, 0, 0);
      const startsAt = toLocalDateTime(starts);
      const key = sessionKey(series.id, startsAt);

      if (!existing.has(key) && toDateKey(starts) >= series.startDate) {
        const session: Session = {
          id: crypto.randomUUID(),
          studentId: series.studentId,
          seriesId: series.id,
          startsAt,
          durationMin: series.durationMin,
          rateCents: student.hourlyRateCents,
          status: "scheduled",
          place: series.place,
          locationNote: series.locationNote,
          lessonFocus: "",
          createdAt: new Date().toISOString(),
        };
        studio.sessions.push(session);
        ensureSessionPayment(studio, session);
        existing.add(key);
      }

      cursor = addDays(cursor, 7);
    }
  }
}

export function ensureSessionPayment(studio: Studio, session: Session) {
  if (session.status === "cancelled") return;
  const existing = studio.payments.find((payment) => payment.sessionId === session.id);
  const amount = sessionAmount(session.rateCents, session.durationMin);
  const dueDate = session.startsAt.slice(0, 10);

  if (existing) {
    if (existing.status !== "received") {
      existing.amountCents = amount;
      existing.dueDate = dueDate;
    }
    return;
  }

  studio.payments.push({
    id: crypto.randomUUID(),
    studentId: session.studentId,
    sessionId: session.id,
    kind: "session",
    amountCents: amount,
    dueDate,
    status: "upcoming",
    receivedAt: null,
    memo: "Session",
    createdAt: new Date().toISOString(),
  });
}

export function cancelSessionPayment(studio: Studio, sessionId: string) {
  const payment = studio.payments.find((item) => item.sessionId === sessionId);
  if (payment && payment.status !== "received") {
    studio.payments = studio.payments.filter((item) => item.id !== payment.id);
  }
}

let queue: Promise<unknown> = Promise.resolve();

export function readStudio(ownerId = "local"): Studio {
  const studio = loadRaw(ownerId);
  expandRecurring(studio);
  refreshPaymentStatuses(studio);
  persist(studio, ownerId);
  return studio;
}

export function replaceStudio(studio: Studio, ownerId: string) { persist(studio, ownerId); }

export async function updateStudio<T>(mutator: (studio: Studio) => T, explicitOwnerId?: string): Promise<T> {
  const ownerId = explicitOwnerId ?? await (await import("./auth")).dataOwnerId();
  const run = queue.then(() => {
    const studio = loadRaw(ownerId);
    expandRecurring(studio);
    const result = mutator(studio);
    refreshPaymentStatuses(studio);
    persist(studio, ownerId);
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  const result = await run;
  try { const { mirrorDataForUser } = await import("./cloud-sync"); if (ownerId !== "local") await mirrorDataForUser(ownerId); } catch { /* Local persistence remains available without Firebase. */ }
  return result;
}

export function studentById(studio: Studio, id: string) {
  return studio.students.find((student) => student.id === id) ?? null;
}

export function sortSessions(sessions: Session[]) {
  return [...sessions].sort(
    (a, b) => parseLocalDateTime(a.startsAt).getTime() - parseLocalDateTime(b.startsAt).getTime(),
  );
}

export function activeStudents(studio: Studio) {
  return [...studio.students]
    .filter((student) => student.status !== "archived")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function findNote(studio: Studio, id: string): Note | undefined {
  return studio.notes.find((note) => note.id === id);
}

export function findPayment(studio: Studio, id: string): Payment | undefined {
  return studio.payments.find((payment) => payment.id === id);
}

export function findSeries(studio: Studio, id: string): RecurringSeries | undefined {
  return studio.series.find((series) => series.id === id);
}

export function findSession(studio: Studio, id: string): Session | undefined {
  return studio.sessions.find((session) => session.id === id);
}

export function findStudent(studio: Studio, id: string): Student | undefined {
  return studio.students.find((student) => student.id === id);
}
