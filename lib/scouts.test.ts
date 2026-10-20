import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, readApplication, readOpportunity } from "./scouts.ts";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

test("addDays: ay ve yıl geçişi", () => {
  assert.equal(addDays("2026-10-20", 90), "2027-01-18");
  assert.equal(addDays("2026-02-27", 2), "2026-03-01");
});

test("readApplication", () => {
  const ok = { kind: "label", org_name: " Plak A.Ş. ", contact_person: "Ayşe", contact_email: "a@plak.com", about: "Yeni yetenek arıyoruz." };
  assert.deepEqual(readApplication(form(ok)), { ...ok, org_name: "Plak A.Ş.", website: null });
  assert.ok("error" in readApplication(form({ ...ok, kind: "admin" })));
  assert.ok("error" in readApplication(form({ ...ok, website: "http://plak.com" })));
  assert.ok("error" in readApplication(form({ ...ok, contact_email: "plak.com" })));
  assert.ok("error" in readApplication(form({ ...ok, about: "kısa" })));
});

test("readOpportunity: son tarih bugün ile 90 gün sonrası arasında", () => {
  const ok = { title: "Drill rapçi", seeking: "rapper", genre: "rap", city: "34", deadline: "2026-11-01", body: "Açık sahne için drill rapçi arıyoruz." };
  const r = readOpportunity(form(ok), "2026-10-20");
  assert.ok(!("error" in r) && r.city === 34 && r.genre === "rap");
  assert.equal((readOpportunity(form({ ...ok, genre: "", city: "" }), "2026-10-20") as { city: unknown }).city, null);
  assert.ok("error" in readOpportunity(form({ ...ok, deadline: "2026-10-19" }), "2026-10-20"));
  assert.ok("error" in readOpportunity(form({ ...ok, deadline: "2027-01-19" }), "2026-10-20"));
  assert.ok(!("error" in readOpportunity(form({ ...ok, deadline: "2027-01-18" }), "2026-10-20")));
  assert.ok("error" in readOpportunity(form({ ...ok, seeking: "dj" }), "2026-10-20"));
  assert.ok("error" in readOpportunity(form({ ...ok, city: "82" }), "2026-10-20"));
});
