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

test("article library has distinct presets and preserves user-provided texts", async () => {
  const { passages, nextPassageIndex } = await import("../web/lib/typing.mjs");
  const all = Object.values(passages).flat();
  assert.equal(all.length, 32);
  assert.equal(new Set(all.map((p) => p.id)).size, all.length);
  assert.equal(new Set(all.map((p) => p.text)).size, all.length);
  for (const article of all) {
    for (const field of ["id", "title", "source", "category", "text"])
      assert.ok(article[field].trim());
  }
  assert.equal(passages.chinese.find((p) => p.id === "kang-live").text, "康神开播了？真的假的");
  assert.equal(
    passages.chinese.find((p) => p.id === "xuzhou").text,
    "徐州地方，历代大规模征战五十余次，是非曲直难以论说，但史家无不注意到，正是在这个古战场，决定了多少代王朝的盛衰兴亡、此兴彼落，所以古来就有问鼎中原之说。",
  );
  for (const list of Object.values(passages)) {
    for (let current = 0; current < list.length; current++) {
      for (const random of [0, 0.5, 0.99999]) {
        const next = nextPassageIndex(list.length, current, random);
        assert.notEqual(next, current);
        assert.ok(list[next]);
      }
    }
  }
  assert.throws(() => nextPassageIndex(0, 0));
  assert.throws(() => nextPassageIndex(2, 0, 1));
});
