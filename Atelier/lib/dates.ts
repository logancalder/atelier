const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function weekdayName(day: number) {
  return WEEKDAYS[day] ?? "Monday";
}

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function isValidDateKey(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key)
    && Number.isFinite(parseDateKey(key).getTime())
    && toDateKey(parseDateKey(key)) === key;
}

export function alignDateToWeekday(key: string, weekday: number) {
  if (!isValidDateKey(key) || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
  const cursor = parseDateKey(key);
  return addDays(cursor, (weekday - cursor.getDay() + 7) % 7);
}

export function isValidRecurringSeriesInput(input: { weekday: number; startDate: string; endDate: string; time: string; durationMin: number }) {
  if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) return false;
  if (!isValidDateKey(input.startDate) || (input.endDate && (!isValidDateKey(input.endDate) || input.endDate < input.startDate))) return false;
  const time = input.time.match(/^(\d{2}):(\d{2})$/);
  if (!time || Number(time[1]) > 23 || Number(time[2]) > 59) return false;
  return Number.isInteger(input.durationMin) && input.durationMin >= 15 && input.durationMin <= 8 * 60;
}

export function parseLocalDateTime(value: string) {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

export function toLocalDateTime(d: Date) {
  return `${toDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

export function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(d: Date) {
  const next = new Date(d);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function formatShortDate(value: string) {
  const d = value.includes("T") ? parseLocalDateTime(value) : parseDateKey(value);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatLongDate(value: string) {
  const d = value.includes("T") ? parseLocalDateTime(value) : parseDateKey(value);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(value: string) {
  const d = parseLocalDateTime(value.includes("T") ? value : `1970-01-01T${value}`);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRange(startsAt: string, durationMin: number) {
  const start = parseLocalDateTime(startsAt);
  const end = new Date(start.getTime() + durationMin * 60_000);
  return `${formatTime(startsAt)} – ${end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function inMonth(dateKey: string, month: string) {
  return dateKey.startsWith(month);
}
