import assert from "node:assert/strict";
import { test } from "node:test";
import { timeAgo } from "./time.ts";

test("timeAgo: Türkçe göreli zaman", () => {
  const now = new Date("2026-10-18T12:00:00Z");
  assert.equal(timeAgo("2026-10-18T11:59:40Z", now), "az önce");
  assert.equal(timeAgo("2026-10-18T11:57:00Z", now), "3 dakika önce");
  assert.equal(timeAgo("2026-10-18T09:00:00Z", now), "3 saat önce");
  assert.equal(timeAgo("2026-10-17T12:00:00Z", now), "dün");
  assert.equal(timeAgo("2026-10-04T12:00:00Z", now), "2 hafta önce");
});
