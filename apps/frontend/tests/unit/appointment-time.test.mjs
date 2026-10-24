import { test } from "node:test";
import assert from "node:assert/strict";
import {
  localToUtc,
  localStamp,
  calendarRange,
  shiftDate,
  weekStart,
  appointmentInstant,
  monthRange,
  shiftMonth,
} from "../../src/lib/appointment-time.ts";

test("state-only edits preserve the exact original instant", () => {
  assert.equal(
    appointmentInstant(
      "2030-01-07T09:30",
      "America/Santiago",
      "2030-01-07T12:30:37.123Z",
    ),
    "2030-01-07T12:30:37.123Z",
  );
  assert.equal(
    appointmentInstant(
      "2030-01-07T10:00",
      "America/Santiago",
      "2030-01-07T12:30:37.123Z",
    ),
    "2030-01-07T13:00:00.000Z",
  );
});
test("clinic timezone conversion is independent of browser timezone", () => {
  assert.equal(
    localToUtc("2030-01-07T09:30", "America/Santiago"),
    "2030-01-07T12:30:00.000Z",
  );
  assert.equal(
    localStamp("2030-01-07T12:30:00Z", "America/Santiago"),
    "2030-01-07T09:30",
  );
  assert.equal(
    localToUtc("2030-07-01T09:30", "America/Santiago"),
    "2030-07-01T13:30:00.000Z",
  );
});
test("Chilean DST gaps and repeated times fail explicitly", () => {
  assert.throws(() => localToUtc("2026-09-06T00:30", "America/Santiago"));
  assert.throws(() => localToUtc("2026-04-04T23:30", "America/Santiago"));
  assert.throws(() => localToUtc("2030-02-30T09:00", "America/Santiago"));
});
test("calendar boundaries use civil dates and include DST days", () => {
  assert.equal(weekStart("2030-01-09"), "2030-01-07");
  assert.equal(shiftDate("2030-01-31", 1), "2030-02-01");
  const r = calendarRange("2026-09-06", false, "America/Santiago");
  assert.equal(r.from, "2026-09-06T04:00:00.000Z");
  assert.equal(r.to, "2026-09-07T03:00:00.000Z");
});
test("month navigation and bounds preserve leap years and Chilean DST", () => {
  assert.equal(shiftMonth("2026-12-31", 1), "2027-01-01");
  const leap = monthRange("2028-02-29", "America/Santiago");
  assert.equal(leap.start, "2028-02-01");
  assert.equal(leap.days, 29);
  const dst = monthRange("2026-09-15", "America/Santiago");
  assert.equal(dst.from, "2026-09-01T04:00:00.000Z");
  assert.equal(dst.to, "2026-10-01T03:00:00.000Z");
});
