import assert from "node:assert/strict";
import { test } from "node:test";
import { readFilters, swipeDecision, toCards } from "./discover.ts";

test("swipeDecision: eşik genişliğin %25'i, en az 80 px", () => {
  assert.equal(swipeDecision(100, 400), "like");
  assert.equal(swipeDecision(-100, 400), "skip");
  assert.equal(swipeDecision(99, 400), null);
  assert.equal(swipeDecision(79, 200), null);
  assert.equal(swipeDecision(80, 200), "like");
});

test("readFilters: liste dışı değerler atılır", () => {
  assert.deepEqual(readFilters({ tur: "rap", etiket: "drill", ruh: "dark", il: "35" }), {
    genre: "rap", tag: "drill", mood: "dark", city: 35,
  });
  assert.deepEqual(readFilters({ tur: "jazz", etiket: ["drill"], ruh: "", il: "82" }), {
    genre: null, tag: null, mood: null, city: null,
  });
});

test("toCards: akış sırası korunur, sanatçısız satır atılır", () => {
  const row = (id: string, profiles: { username: string; display_name: string | null; city: number | null } | null) => ({
    id, title: id, genre: "rap", tags: [], moods: [], hook_sec: 0, cover_path: null,
    duration_sec: null, audio_path: `${id}.mp3`, status: "active", profiles,
  });
  const cards = toCards(["b", "x", "a", "c"], [
    row("a", { username: "ali", display_name: null, city: 6 }),
    row("b", { username: "bek", display_name: "Bek", city: null }),
    row("c", null),
  ]);
  assert.deepEqual(cards.map((c) => [c.id, c.artist.name]), [["b", "Bek"], ["a", "ali"]]);
});
