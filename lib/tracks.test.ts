import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDuration, weekStart } from "./tracks.ts";

test("weekStart: pazartesi 00:00 Türkiye saati (UTC'de pazar 21:00)", () => {
  // Çarşamba 15 Ekim 2026 12:00 TR → Pazartesi 12 Ekim 00:00 TR
  assert.equal(weekStart(new Date("2026-10-14T09:00:00Z")).toISOString(), "2026-10-11T21:00:00.000Z");
  // Pazartesi 00:30 TR (UTC'de hâlâ pazar) → aynı pazartesi
  assert.equal(weekStart(new Date("2026-10-11T21:30:00Z")).toISOString(), "2026-10-11T21:00:00.000Z");
  // Pazar 23:59 TR → önceki pazartesi
  assert.equal(weekStart(new Date("2026-10-11T20:59:00Z")).toISOString(), "2026-10-04T21:00:00.000Z");
});

test("formatDuration", () => {
  assert.equal(formatDuration(192), "3:12");
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(null), "");
});
