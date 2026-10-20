import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDuration, periodStart, weekStart } from "./tracks.ts";

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

test("periodStart: Türkiye takvimine göre hafta/ay başı, geriye dönemler", () => {
  // Pazartesi 00:30 TR (UTC'de pazar) → o pazartesi
  assert.equal(periodStart("week", new Date("2026-10-11T21:30:00Z")), "2026-10-12");
  assert.equal(periodStart("week", new Date("2026-10-11T20:59:00Z")), "2026-10-05");
  assert.equal(periodStart("week", new Date("2026-10-14T09:00:00Z"), 2), "2026-09-28");
  // 1 Kasım 01:00 TR (UTC'de 31 Ekim) → Kasım
  assert.equal(periodStart("month", new Date("2026-10-31T22:00:00Z")), "2026-11-01");
  assert.equal(periodStart("month", new Date("2026-03-31T12:00:00Z"), 1), "2026-02-01");
  assert.equal(periodStart("month", new Date("2026-01-15T12:00:00Z"), 1), "2025-12-01");
});
