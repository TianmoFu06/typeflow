import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, createHash, randomInt } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { passages, stats } from "../web/lib/typing.mjs";

// A private 256-bit browser token derives a stable public UUID. Public race IDs
// cannot be used as credentials, and identity survives server restarts without a DB.
function browserToken(req) {
  const token = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("typeflow_browser="))
    ?.slice(17);
  return /^[a-f0-9]{64}$/.test(token ?? "") ? token : null;
}
function browserId(token) {
  const bytes = createHash("sha256").update(token).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createApp({
  duration = 60_000,
  countdown = 3000,
  tick = 250,
  origin = process.env.APP_ORIGIN,
  root = resolve("web/dist/client"),
} = {}) {
  const players = new Map(),
    rooms = new Set();
  let waiting;
  const log = (error, context) =>
    console.error(
      JSON.stringify({ level: "error", message: error.message, stack: error.stack, context }),
    );
  const send = (player, data) => {
    if (player.ws.readyState === WebSocket.OPEN) player.ws.send(JSON.stringify(data));
  };
  const server = createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "DENY");
    // The static framework bootstrap uses inline scripts; no third-party script origins are allowed.
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end("Method not allowed");
      return;
    }
    if (req.url === "/api/session") {
      const expected = origin ?? `http://${req.headers.host}`;
      if (req.headers.origin && req.headers.origin !== expected) {
        res.writeHead(403);
        res.end("Cross-origin session request denied");
        return;
      }
      const token = browserToken(req) ?? randomBytes(32).toString("hex");
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        Vary: "Cookie",
        "Set-Cookie": `typeflow_browser=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${expected.startsWith("https:") ? "; Secure" : ""}`,
      });
      res.end(req.method === "HEAD" ? undefined : JSON.stringify({ id: browserId(token) }));
      return;
    }
    if (req.url === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    try {
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      } catch {
        res.writeHead(400);
        res.end("Invalid URL");
        return;
      }
      const file = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
      if (!file.startsWith(root + sep)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const info = await stat(file);
      if (!info.isFile()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const types = {
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".ico": "image/x-icon",
        ".woff2": "font/woff2",
        ".json": "application/json",
        ".txt": "text/plain",
      };
      res.writeHead(200, {
        "Content-Type": types[extname(file)] ?? "application/octet-stream",
        "Cache-Control": file.includes("/assets/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : await readFile(file));
    } catch (error) {
      if (error.code === "ENOENT") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      log(error, { method: req.method, url: req.url });
      if (res.headersSent) {
        res.destroy(error);
        return;
      }
      res.writeHead(500);
      res.end("Internal server error");
    }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
  server.on("upgrade", (req, socket, head) => {
    const expected = origin ?? `http://${req.headers.host}`;
    if (req.url !== "/ws" || req.headers.origin !== expected || players.size >= 500) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }
    const token = browserToken(req);
    if (!token) {
      socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      return;
    }
    const id = browserId(token);
    if (players.has(id)) {
      socket.end("HTTP/1.1 409 Conflict\r\nConnection: close\r\n\r\n");
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req, id));
  });
  function summary(room, now) {
    const elapsed = Math.min(duration, Math.max(0, now - room.start)) / 1000;
    return room.players.map((p) => ({
      id: p.id,
      name: p.name,
      ...stats(room.text, p.text, elapsed),
    }));
  }
  function finish(room, reason) {
    rooms.delete(room);
    const scores = summary(room, Date.now());
    const [a, b] = scores;
    const winner = a.correct === b.correct ? null : a.correct > b.correct ? a.id : b.id;
    for (const p of room.players) {
      p.room = null;
      p.joined = false;
      send(
        p,
        reason
          ? { type: "cancelled", message: reason }
          : { type: "done", players: scores, winner, remaining: 0 },
      );
    }
  }
  wss.on("connection", (ws, req, id) => {
    const p = {
      ws,
      id,
      name: "",
      text: "",
      room: null,
      alive: true,
      joined: false,
      window: Date.now(),
      messages: 0,
    };
    players.set(p.id, p);
    send(p, { type: "connected", id: p.id });
    ws.on("pong", () => {
      p.alive = true;
    });
    ws.on("error", (error) =>
      log(error, { player: p.id, remoteAddress: req.socket.remoteAddress }),
    );
    ws.on("close", () => {
      players.delete(p.id);
      if (waiting === p) waiting = undefined;
      if (p.room) finish(p.room, "对手已断开连接，本场比赛中止，请重新匹配。");
    });
    ws.on("message", (raw) => {
      let payload;
      try {
        const now = Date.now();
        if (now - p.window >= 1000) {
          p.window = now;
          p.messages = 0;
        }
        if (++p.messages > 80) throw new Error("输入频率超过限制");
        payload = JSON.parse(raw.toString());
        if (!payload || typeof payload !== "object") throw new Error("消息必须为对象");
        if (payload.type === "leave") {
          if (waiting === p) waiting = undefined;
          if (p.room) finish(p.room, "玩家取消了比赛，请重新匹配。");
          p.joined = false;
          send(p, { type: "idle", id: p.id });
          return;
        }
        if (payload.type === "join") {
          if (p.joined) throw new Error("你已在匹配队列或比赛中");
          p.joined = true;
          p.name = `旅人 ${p.id.slice(0, 6)}`;
          p.text = "";
          if (!waiting) {
            waiting = p;
            send(p, { type: "waiting", id: p.id });
            return;
          }
          const other = waiting;
          waiting = undefined;
          // ponytail: single-process matchmaking; use a shared coordinator before adding replicas.
          const article = passages.english[randomInt(passages.english.length)];
          const room = {
            players: [other, p],
            text: (article.text + " ").repeat(Math.ceil(1500 / (article.text.length + 1))),
            start: now + countdown,
          };
          rooms.add(room);
          for (const player of room.players) {
            player.room = room;
            send(player, {
              type: "countdown",
              id: player.id,
              text: room.text,
              countdown: Math.ceil(countdown / 1000),
              remaining: duration / 1000,
              players: summary(room, now),
            });
          }
          return;
        }
        if (payload.type !== "input") throw new Error("未知消息类型");
        const room = p.room;
        if (!room || now < room.start) throw new Error("比赛尚未开始");
        if (now >= room.start + duration) {
          finish(room);
          return;
        }
        if (typeof payload.text !== "string" || payload.text.length > room.text.length)
          throw new Error("输入文字无效");
        const value = payload.text;
        if (
          !value.startsWith(p.text.slice(0, Math.min(value.length, p.text.length))) ||
          value.length > p.text.length + 1
        )
          throw new Error("竞赛仅支持逐字输入或尾部删除");
        p.text = value;
        if (p.text.length === room.text.length) finish(room);
      } catch (error) {
        log(error, { player: p.id, payload: payload ?? raw.toString() });
        send(p, { type: "error", message: error.message });
        ws.close(1008, "Invalid message");
      }
    });
  });
  const timer = setInterval(() => {
    const now = Date.now();
    for (const room of rooms) {
      if (now >= room.start + duration) {
        finish(room);
        continue;
      }
      const data =
        now < room.start
          ? { type: "countdown", countdown: Math.ceil((room.start - now) / 1000) }
          : {
              type: "running",
              remaining: Math.max(0, (room.start + duration - now) / 1000),
              players: summary(room, now),
            };
      for (const p of room.players) send(p, data);
    }
  }, tick);
  const heartbeat = setInterval(() => {
    for (const p of players.values()) {
      if (!p.alive) p.ws.terminate();
      else {
        p.alive = false;
        p.ws.ping();
      }
    }
  }, 30_000);
  function close() {
    clearInterval(timer);
    clearInterval(heartbeat);
    for (const p of players.values()) p.ws.close(1001, "Server shutting down");
    wss.close();
    server.close();
  }
  server.on("close", () => {
    clearInterval(timer);
    clearInterval(heartbeat);
  });
  return { server, close };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  if (process.env.NODE_ENV === "production" && !process.env.APP_ORIGIN)
    throw new Error("APP_ORIGIN is required in production");
  if (process.env.APP_ORIGIN && new URL(process.env.APP_ORIGIN).origin !== process.env.APP_ORIGIN)
    throw new Error("APP_ORIGIN must be an exact origin without a trailing slash");
  const app = createApp();
  app.server.listen(port, "0.0.0.0", () =>
    console.log(JSON.stringify({ level: "info", message: "Typeflow listening", port })),
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.once(signal, () => {
      app.close();
      setTimeout(() => process.exit(0), 5000).unref();
    });
}
