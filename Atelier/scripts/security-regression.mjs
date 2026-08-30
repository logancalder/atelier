import assert from "node:assert/strict";
import { alignDateToWeekday, isValidRecurringSeriesInput, isWithinLateCancellationWindow } from "../lib/dates.ts";
import { safeRedirectDestination } from "../lib/safe-redirect.ts";

for (const unsafe of ["//evil.example/path", "///evil.example", "/\\evil.example", "/%2f%2fevil.example", "/%5cevil.example", "https://evil.example"]) {
  assert.equal(safeRedirectDestination(unsafe), "/coding", `accepted unsafe destination: ${unsafe}`);
}
assert.equal(safeRedirectDestination("/extension-connect?code=abc#ready"), "/extension-connect?code=abc#ready");

assert.equal(alignDateToWeekday("not-a-date", 1), null);
assert.equal(alignDateToWeekday("2026-08-29", 9), null);
assert.equal(alignDateToWeekday("2026-08-29", 1)?.getDay(), 1);
assert.equal(isValidRecurringSeriesInput({ weekday: 1, startDate: "2026-08-31", endDate: "", time: "16:00", durationMin: 60 }), true);
assert.equal(isValidRecurringSeriesInput({ weekday: 9, startDate: "2026-08-31", endDate: "", time: "16:00", durationMin: 60 }), false);
assert.equal(isValidRecurringSeriesInput({ weekday: 1, startDate: "invalid", endDate: "", time: "16:00", durationMin: 60 }), false);
const cancellationTime = new Date(2026, 7, 29, 12, 0, 0);
assert.equal(isWithinLateCancellationWindow("2026-08-30T12:00", cancellationTime), true);
assert.equal(isWithinLateCancellationWindow("2026-08-30T12:01", cancellationTime), false);
assert.equal(isWithinLateCancellationWindow("2026-08-29T11:59", cancellationTime), false);

console.log("Security regression checks passed.");
