import assert from "node:assert/strict";
import { test } from "node:test";
import { peaks } from "./waveform.ts";

test("peaks: parça başına RMS, 0–100 ölçek", () => {
  const s = new Float32Array([0.1, -0.5, 0.2, 0.25, 0, -0.05, 0.4, 0.1]);
  // RMS: 0.361, 0.226, 0.035, 0.292 → en güçlüye göre
  assert.deepEqual(peaks(s, 4), [100, 63, 10, 81]);
});

test("peaks: sessiz ses sıfır, kısa ses boş", () => {
  assert.deepEqual(peaks(new Float32Array(8), 4), [0, 0, 0, 0]);
  assert.deepEqual(peaks(new Float32Array(2), 4), []);
});
