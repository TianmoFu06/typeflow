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
  assert.equal(all.length, 42);
  assert.equal(new Set(all.map((p) => p.id)).size, all.length);
  assert.equal(new Set(all.map((p) => p.text)).size, all.length);
  for (const article of all) {
    for (const field of ["id", "title", "source", "category", "text"])
      assert.ok(article[field].trim());
  }
  const { readFile } = await import("node:fs/promises");
  for (const [id, file] of [
    ["kang-live", "康神开播了.txt"],
    ["xuzhou", "优势在我.txt"],
    ["xiake", "下课.txt"],
  ]) {
    const original = await readFile(new URL("../" + file, import.meta.url), "utf8");
    assert.equal(passages.chinese.find((p) => p.id === id).text, original.replace(/\s/g, ""));
  }
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

test("researched full works retain every verified paragraph and chapter ending", async () => {
  const { readFile } = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  const { passages } = await import("../web/lib/typing.mjs");
  const manifest = JSON.parse(
    await readFile(new URL("./fixtures/article-sources.json", import.meta.url), "utf8"),
  );
  assert.equal(manifest.length, 19);
  for (const source of manifest) {
    const article = passages.chinese.find((p) => p.id === source.id);
    assert.equal(article.format, "全文");
    assert.equal(article.sourceUrl, source.url);
    assert.equal(article.text.length, source.length, source.id);
    assert.equal(createHash("sha256").update(article.text).digest("hex"), source.sha256, source.id);
    assert.ok(article.text.startsWith(source.start));
    assert.ok(article.text.endsWith(source.end));
    assert.doesNotMatch(article.text, /原字未收录|Public domain|一作“|[\u200b\ufeff]/);
  }
  assert.match(passages.chinese.find((p) => p.id === "wanglang").text, /轻摇三寸舌，骂死老奸臣/);
  assert.match(
    passages.chinese.find((p) => p.id === "xiaozagan").text,
    /人类的悲欢并不相通，我只觉得他们吵闹/,
  );
  assert.ok(manifest.reduce((sum, p) => sum + p.length, 0) > 24000);
});

test("full article mode stays active past two minutes and long text remains reachable", async () => {
  const { practiceClock } = await import("../web/lib/typing.mjs");
  assert.deepEqual(practiceClock(0, 3600), { elapsed: 3600, done: false });
  assert.deepEqual(practiceClock(30, 29), { elapsed: 29, done: false });
  assert.deepEqual(practiceClock(30, 31), { elapsed: 30, done: true });
  assert.throws(() => practiceClock(-1, 0));
});

test("incorrect glyphs show actual input while future glyphs preserve the prompt", async () => {
  const { displayCharacter } = await import("../web/lib/typing.mjs");
  assert.equal(displayCharacter("庆", undefined), "庆");
  assert.equal(displayCharacter("庆", "亲"), "亲");
  assert.equal(displayCharacter("庆", "庆"), "庆");
  assert.equal(displayCharacter("a", " "), " ");
});
