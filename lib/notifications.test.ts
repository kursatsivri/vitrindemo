import assert from "node:assert/strict";
import { test } from "node:test";
import { describe } from "./notifications.ts";

const base = { data: {}, entity_id: null, actor: { username: "ali", display_name: "Ali" }, track: { id: "t1", title: "Gece" } };

test("describe: metin ve link", () => {
  assert.deepEqual(describe({ ...base, type: "like" }, "artist"), { text: "Ali “Gece” parçanı beğendi", href: "/p/t1" });
  assert.equal(describe({ ...base, type: "follow" }, "artist").href, "/ali");
  assert.equal(describe({ ...base, type: "match" }, "scout").href, "/kesifci");
  assert.equal(describe({ ...base, type: "match" }, "artist").href, "/profil/panel");
  assert.equal(
    describe({ ...base, type: "top10", data: { period: "week", genre: "rap", rank: 3 } }, "artist").text,
    "“Gece” haftalık Rap / Hip-Hop listesinde 3. oldu",
  );
  assert.equal(describe({ ...base, type: "application", entity_id: "o1", data: { title: "Drill" } }, "scout").href, "/firsatlar/o1");
  assert.match(describe({ ...base, type: "challenge_win", data: { role: "beatmaker" } }, "artist").text, /Ali kazandı/);
});

test("describe: silinmiş aktör/parça ve bilinmeyen tür", () => {
  const r = describe({ ...base, actor: null, track: null, type: "like" }, "artist");
  assert.equal(r.text, "Biri bir parça parçanı beğendi");
  assert.equal(describe({ ...base, type: "yeni_tur" }, "artist").text, "Yeni bildirim");
});
