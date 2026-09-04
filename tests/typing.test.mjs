import { test } from "node:test";
import assert from "node:assert/strict";
import { stats } from "../web/lib/typing.mjs";
test("speed uses correct characters and real elapsed time; corrected mistakes remain in accuracy", () => {
  assert.deepEqual(stats("hello world", "hello x", 30, 9, 2), {
    correct: 6,
    wpm: 2,
    cpm: 12,
    accuracy: 78,
    progress: 64,
  });
  assert.equal(stats("hello", "", 0).wpm, 0);
  assert.equal(stats("你好世界", "你好", 60).cpm, 2);
});
