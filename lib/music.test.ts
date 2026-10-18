import assert from "node:assert/strict";
import { test } from "node:test";
import { CITIES, cityName, parseTime } from "./music.ts";

test("parseTime: dk:sn ve saniye", () => {
  assert.equal(parseTime("1:24"), 84);
  assert.equal(parseTime("0:05"), 5);
  assert.equal(parseTime("84"), 84);
  assert.equal(parseTime(""), 0);
  assert.equal(parseTime("1:75"), null);
  assert.equal(parseTime("abc"), null);
  assert.equal(parseTime("-3"), null);
});

test("81 il, plaka koduyla", () => {
  assert.equal(CITIES.length, 81);
  assert.equal(cityName(6), "Ankara");
  assert.equal(cityName(34), "İstanbul");
  assert.equal(cityName(35), "İzmir");
  assert.equal(cityName(81), "Düzce");
  assert.equal(cityName(null), null);
});
