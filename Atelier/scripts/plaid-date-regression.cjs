/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

require.extensions['.ts'] = (module, file) => module._compile(
  ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  file,
);

const { plaidHistoryRange, datesWithinDays } = require(path.join(__dirname, '../lib/plaid-dates.ts'));
const end = (instant) => plaidHistoryRange(new Date(instant)).endDate;

assert.equal(end('2026-09-21T06:59:59Z'), '2026-09-20', 'before Pacific midnight');
assert.equal(end('2026-09-21T07:00:00Z'), '2026-09-21', 'today begins at Pacific midnight');
assert.equal(end('2026-09-22T02:00:00Z'), '2026-09-21', 'UTC rollover must not advance Pacific today');
assert.equal(end('2026-01-21T07:59:59Z'), '2026-01-20', 'winter uses PST');
assert.equal(end('2026-01-21T08:00:00Z'), '2026-01-21', 'PST midnight is UTC-8');
assert.equal(end('2026-03-08T07:59:59Z'), '2026-03-07', 'before spring DST midnight');
assert.equal(end('2026-03-08T08:00:00Z'), '2026-03-08', 'spring DST starts after midnight');
assert.equal(end('2026-03-08T10:00:00Z'), '2026-03-08', 'spring DST transition stays on same bank date');
assert.equal(end('2026-11-01T06:59:59Z'), '2026-10-31', 'before fall DST midnight');
assert.equal(end('2026-11-01T07:00:00Z'), '2026-11-01', 'fall DST midnight uses PDT');
assert.equal(end('2026-11-01T09:00:00Z'), '2026-11-01', 'repeated fall hour stays on same bank date');

const range = plaidHistoryRange(new Date('2026-09-22T02:00:00Z'));
assert.equal(range.endDate, '2026-09-21', 'Plaid end_date includes Pacific today');
assert.equal((Date.parse(range.endDate) - Date.parse(range.startDate)) / 86_400_000, 90);
assert.equal(datesWithinDays('2026-09-21', '2026-09-21', 14), true, 'today is matchable');
assert.equal(datesWithinDays('2026-10-18', '2026-11-01', 14), true, '14 bank days across fall DST are included');
assert.equal(datesWithinDays('2026-10-17', '2026-11-01', 14), false, '15 bank days are excluded');
assert.equal(datesWithinDays('2026-02-22', '2026-03-08', 14), true, '14 bank days across spring DST are included');
assert.equal(datesWithinDays('2026-03-23', '2026-03-08', 14), false, '15 future bank days are excluded');
assert.equal(datesWithinDays('bad', '2026-03-08', 14), false);

console.log('PASS: Pacific today, PST/PDT midnights, UTC rollover, inclusive Plaid date range, and DST-safe ±14 bank-day matching.');
