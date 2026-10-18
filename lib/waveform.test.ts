import assert from "node:assert/strict";
import { test } from "node:test";
import { peaks } from "./waveform.ts";

test("peaks: parça başına tepe, 0–100 ölçek", () => {
  const s = new Float32Array([0.1, -0.5, 0.2, 0.25, 0, -0.05, 0.4, 0.1]);
  assert.deepEqual(peaks(s, 4), [100, 50, 10, 80]);
});

test("peaks: sessiz ses sıfır, kısa ses boş", () => {
  assert.deepEqual(peaks(new Float32Array(8), 4), [0, 0, 0, 0]);
  assert.deepEqual(peaks(new Float32Array(2), 4), []);
});
