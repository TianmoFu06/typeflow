import { test } from "node:test";
import assert from "node:assert/strict";
import { progressSeries } from "../web/lib/typing.mjs";

test("progress plots saved CPM from oldest to newest without changing history", () => {
  assert.deepEqual(progressSeries([]), []);
  assert.deepEqual(progressSeries([{ cpm: 0 }]), [{ practice: 1, cpm: 0 }]);
  const records = Object.freeze(
    Array.from({ length: 50 }, (_, i) => Object.freeze({ cpm: 150 - i })),
  );
  const points = progressSeries(records);
  assert.equal(points.length, 50);
  assert.deepEqual(points[0], { practice: 1, cpm: 101 });
  assert.deepEqual(points[49], { practice: 50, cpm: 150 });
  assert.equal(records[0].cpm, 150);
  assert.deepEqual(progressSeries([{ cpm: 80 }, { cpm: 120 }]), [
    { practice: 1, cpm: 120 },
    { practice: 2, cpm: 80 },
  ]);
});
import { stats } from "../web/lib/typing.mjs";
test("speed and accuracy use current entered characters and real elapsed time", () => {
  assert.deepEqual(stats("hello world", "hello x", 30), {
    correct: 6,
    wpm: 2,
    cpm: 12,
    accuracy: 86,
    progress: 64,
  });
  assert.equal(stats("hello", "", 0).wpm, 0);
  assert.equal(stats("你好世界", "你好", 60).cpm, 2);
});

test("untouched suffix never affects accuracy; deleting and correcting a mistake updates it", () => {
  for (const target of ["hello", "hello " + "world ".repeat(1000)]) {
    assert.equal(stats(target, "h", 60).accuracy, 100);
    assert.equal(stats(target, "hx", 60).accuracy, 50);
    assert.equal(stats(target, "h", 60).accuracy, 100);
    assert.equal(stats(target, "he", 60).accuracy, 100);
    assert.equal(stats(target, "xx", 60).accuracy, 0);
    assert.equal(stats(target, "", 0).accuracy, 100);
  }
});

test("CPM counts characters, spaces and punctuation without five-character word conversion", () => {
  assert.equal(stats("hello world", "hello ", 30).cpm, 12);
  assert.equal(stats("const n = 1;", "const n = 1;", 60).cpm, 12);
  assert.equal(stats("你好，世界", "你好，", 30).cpm, 6);
  assert.equal(stats("a😀b", "a😀", 60).cpm, 2);
  assert.equal(stats("hello", "hxl", 60).cpm, 2);
});

test("article library has distinct presets and preserves user-provided texts", async () => {
  const { passages, nextPassageIndex } = await import("../web/lib/typing.mjs");
  assert.equal(passages.chinese[0].id, "xiake");
  assert.equal(passages.chinese[0].title, "下课");
  const all = Object.values(passages).flat();
  assert.equal(all.length, 61);
  assert.equal(passages.chinese.length, 48);
  assert.equal(passages.english.length, 8);
  assert.equal(new Set(all.map((p) => p.id)).size, all.length);
  assert.equal(new Set(all.map((p) => p.text)).size, all.length);
  for (const article of all) {
    for (const field of ["id", "title", "source", "category", "text"])
      assert.ok(article[field].trim());
  }
  const { readFile } = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  const supplied = JSON.parse(
    await readFile(new URL("./fixtures/user-articles.json", import.meta.url), "utf8"),
  );
  assert.equal(supplied.length, 22);
  for (const source of supplied) {
    const article = passages[source.language].find((p) => p.id === source.id);
    assert.ok(article, source.id);
    assert.equal(article.title, source.title);
    assert.equal(article.text.length, source.length, source.id);
    assert.equal(createHash("sha256").update(article.text).digest("hex"), source.sha256, source.id);
  }
  assert.match(passages.chinese.find((p) => p.id === "kang-live").text, /明天再玩/);
  assert.doesNotMatch(passages.chinese.find((p) => p.id === "kang-live").text, /明天在玩/);
  assert.match(passages.chinese.find((p) => p.id === "xiake").text, /不要跟法律作对/);
  assert.doesNotMatch(passages.chinese.find((p) => p.id === "xiake").text, /法律做对/);
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
