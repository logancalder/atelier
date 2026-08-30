import { parseLocalDateTime, startOfWeek, toDateKey, todayKey } from "./dates";
import type { Payment, Session, Studio } from "./types";

export function weekSessions(studio: Studio, weekStart: Date) {
  const start = toDateKey(weekStart);
  const end = toDateKey(new Date(weekStart.getTime() + 6 * 86400000));
  return studio.sessions.filter((session) => {
    const day = session.startsAt.slice(0, 10);
    return day >= start && day <= end;
  });
}

export function todaySessions(studio: Studio) {
  const today = todayKey();
  return studio.sessions
    .filter((session) => session.startsAt.startsWith(today) && session.status !== "cancelled" && session.status !== "late_cancel")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function upcomingSessions(studio: Studio, limit = 8) {
  const now = Date.now();
  return studio.sessions
    .filter((session) => session.status === "scheduled" && parseLocalDateTime(session.startsAt).getTime() >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, limit);
}

export function paymentsByStatus(studio: Studio, status: Payment["status"]) {
  return studio.payments
    .filter((payment) => payment.status === status)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function monthReceivedCents(studio: Studio, month: string) {
  return studio.payments
    .filter((payment) => payment.status === "received" && (payment.receivedAt ?? payment.dueDate).startsWith(month))
    .reduce((sum, payment) => sum + payment.amountCents, 0);
}

export function monthBookedCents(studio: Studio, month: string) {
  return studio.sessions
    .filter(
      (session) =>
        session.startsAt.startsWith(month) &&
        session.status !== "cancelled" &&
        session.status !== "no_show",
    )
    .reduce((sum, session) => {
      if (session.status === "late_cancel") {
        return sum + (studio.students.find((student) => student.id === session.studentId)?.lateCancelFeeCents ?? 0);
      }
      return sum + Math.round((session.rateCents * session.durationMin) / 60);
    }, 0);
}

export function thisWeekStart() {
  return startOfWeek(new Date());
}

export function sessionForPayment(studio: Studio, payment: Payment): Session | undefined {
  if (!payment.sessionId) return undefined;
  return studio.sessions.find((session) => session.id === payment.sessionId);
}
