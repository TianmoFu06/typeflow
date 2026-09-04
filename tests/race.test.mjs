import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import { passages } from "../web/lib/typing.mjs";
import { createApp } from "../server/index.mjs";

async function fixture(t, options = {}) {
  const app = createApp({ duration: 300, countdown: 70, tick: 10, ...options });
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  t.after(() => app.close());
  const origin = `http://127.0.0.1:${app.server.address().port}`;
  async function session(cookie) {
    const response = await fetch(origin + "/api/session", { headers: cookie ? { cookie } : {} });
    assert.equal(response.status, 200);
    return {
      ...(await response.json()),
      cookie: response.headers.get("set-cookie").split(";")[0],
      response,
    };
  }
  async function player(name, identity) {
    identity ??= await session();
    const ws = new WebSocket(origin.replace("http", "ws") + "/ws", {
      origin,
      headers: { cookie: identity.cookie },
    });
    const messages = [];
    ws.on("message", (data) => messages.push(JSON.parse(data)));
    await once(ws, "open");
    if (name) ws.send(JSON.stringify({ type: "join", name }));
    t.after(() => ws.terminate());
    async function wait(type, predicate = () => true) {
      const end = Date.now() + 2000;
      while (Date.now() < end) {
        const msg = messages.find((m) => m.type === type && predicate(m));
        if (msg) return msg;
        await new Promise((r) => setTimeout(r, 10));
      }
      throw new Error(`Missing ${type}: ${JSON.stringify(messages)}`);
    }
    return { ws, wait, messages, identity };
  }
  return { player, origin, session };
}
test("two real clients match, share text, receive server-calculated results", async (t) => {
  const { player, origin } = await fixture(t);
  assert.equal((await fetch(origin + "/api/health")).status, 200);
  const a = await player("Alice");
  assert.equal((await a.wait("waiting")).type, "waiting");
  const b = await player("Bob");
  const ra = await a.wait("countdown"),
    rb = await b.wait("countdown");
  assert.equal(ra.text, rb.text);
  assert.ok(passages.english.some((p) => ra.text.startsWith(p.text)));
  assert.ok(ra.text.length >= 1500);
  await a.wait("running");
  a.ws.send(JSON.stringify({ type: "input", text: ra.text[0] }));
  const result = await a.wait("done");
  assert.equal(result.winner, ra.id);
  assert.equal(result.players.find((p) => p.id === ra.id).correct, 1);
  assert.equal((await b.wait("done")).winner, ra.id);
});
test("disconnect explicitly cancels opponent race", async (t) => {
  const { player } = await fixture(t, { duration: 2000 });
  const a = await player("A");
  const b = await player("B");
  await a.wait("countdown");
  b.ws.close();
  assert.match((await a.wait("cancelled")).message, /断开/);
});
test("bulk pasted race input is rejected and cancels the room", async (t) => {
  const { player } = await fixture(t, { duration: 2000 });
  const a = await player("A"),
    b = await player("B");
  await a.wait("running");
  a.ws.send(JSON.stringify({ type: "input", text: "slow" }));
  assert.match((await a.wait("error")).message, /逐字/);
  await b.wait("cancelled");
});
test("cross-origin websocket requests are denied", async (t) => {
  const { origin } = await fixture(t);
  const ws = new WebSocket(origin.replace("http", "ws") + "/ws", {
    origin: "https://evil.example",
  });
  const [error] = await once(ws, "error");
  assert.match(error.message, /403/);
});

test("server assigns a stable anonymous UUID via a private HttpOnly cookie", async (t) => {
  const { session, origin } = await fixture(t);
  const a = await session(),
    b = await session(),
    again = await session(a.cookie);
  assert.match(a.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(a.id, again.id);
  assert.notEqual(a.id, b.id);
  assert.ok(!a.cookie.includes(a.id));
  assert.match(a.response.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  assert.equal(a.response.headers.get("cache-control"), "no-store");
  assert.equal(
    (await fetch(origin + "/api/session", { headers: { origin: "https://evil.example" } })).status,
    403,
  );
});

test("only queued players match; cancel and rejoin reuse the long connection and UUID", async (t) => {
  const { player } = await fixture(t, { duration: 2000 });
  const idle = await player();
  await idle.wait("connected");
  const a = await player("A");
  await a.wait("waiting");
  assert.ok(!idle.messages.some((m) => m.type === "countdown"));
  a.ws.send(JSON.stringify({ type: "leave" }));
  await a.wait("idle");
  const b = await player("B");
  await b.wait("waiting");
  a.messages.length = 0;
  a.ws.send(JSON.stringify({ type: "join", id: b.identity.id }));
  assert.equal((await a.wait("countdown")).id, a.identity.id);
  assert.equal((await b.wait("countdown")).id, b.identity.id);
  a.ws.send(JSON.stringify({ type: "leave" }));
  await b.wait("cancelled");
  await a.wait("idle");
  a.messages.length = 0;
  b.messages.length = 0;
  a.ws.send(JSON.stringify({ type: "join" }));
  await a.wait("waiting");
  b.ws.send(JSON.stringify({ type: "join" }));
  await a.wait("countdown");
  await b.wait("countdown");
});

test("completed races can rematch with the same sockets and reset scores", async (t) => {
  const { player } = await fixture(t);
  const a = await player("A"),
    b = await player("B");
  await a.wait("done");
  await b.wait("done");
  a.messages.length = b.messages.length = 0;
  a.ws.send(JSON.stringify({ type: "join" }));
  await a.wait("waiting");
  b.ws.send(JSON.stringify({ type: "join" }));
  const next = await a.wait("countdown");
  assert.equal(next.id, a.identity.id);
  assert.ok(next.players.every((p) => p.correct === 0 && p.wpm === 0));
});

test("missing browser credentials and duplicate browser connections are rejected", async (t) => {
  const { origin, player } = await fixture(t);
  const anonymous = new WebSocket(origin.replace("http", "ws") + "/ws", { origin });
  assert.match((await once(anonymous, "error"))[0].message, /401/);
  const a = await player();
  const duplicate = new WebSocket(origin.replace("http", "ws") + "/ws", {
    origin,
    headers: { cookie: a.identity.cookie },
  });
  assert.match((await once(duplicate, "error"))[0].message, /409/);
  const closed = once(a.ws, "close");
  a.ws.close();
  await closed;
  const again = await player("A", a.identity);
  assert.equal((await again.wait("waiting")).id, a.identity.id);
});

test("live server scores exclude untouched text and update CPM after correction", async (t) => {
  const { player } = await fixture(t, { duration: 2000 });
  const a = await player("A");
  await player("B");
  const race = await a.wait("countdown");
  await a.wait("running");
  const score = async (correct, accuracy) => {
    const message = await a.wait("running", (m) =>
      m.players.some((p) => p.id === race.id && p.correct === correct && p.accuracy === accuracy),
    );
    return message.players.find((p) => p.id === race.id);
  };
  a.ws.send(JSON.stringify({ type: "input", text: race.text[0] }));
  assert.ok((await score(1, 100)).cpm > 0);
  a.ws.send(JSON.stringify({ type: "input", text: race.text[0] + "#" }));
  assert.ok((await score(1, 50)).cpm > 0);
  a.messages.length = 0;
  a.ws.send(JSON.stringify({ type: "input", text: race.text[0] }));
  await score(1, 100);
  a.ws.send(JSON.stringify({ type: "input", text: race.text.slice(0, 2) }));
  assert.ok((await score(2, 100)).cpm > 0);
});
