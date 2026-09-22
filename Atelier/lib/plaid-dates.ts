const DAY_MS = 86_400_000;
const PACIFIC_TIME_ZONE = "America/Los_Angeles";

/** Plaid accepts inclusive bank statement dates, not instants or UTC boundaries. */
export function plaidHistoryRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((value) => value.type === type)?.value;
  const endDate = `${part("year")}-${part("month")}-${part("day")}`;
  const startDate = new Date(Date.parse(`${endDate}T00:00:00Z`) - 90 * DAY_MS).toISOString().slice(0, 10);
  return { startDate, endDate };
}

/** Compare Plaid and session date-only values as calendar days across DST. */
export function datesWithinDays(left: string, right: string, days: number) {
  const leftDay = Date.parse(`${left}T00:00:00Z`);
  const rightDay = Date.parse(`${right}T00:00:00Z`);
  return Number.isFinite(leftDay) && Number.isFinite(rightDay)
    && Math.abs(leftDay - rightDay) <= days * DAY_MS;
}
