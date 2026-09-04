import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/index.mjs";

test("public files cache at the edge while sessions, health and errors do not", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "typeflow-cache-"));
  t.after(() => rm(root, { recursive: true }));
  await mkdir(join(root, "assets"));
  await writeFile(join(root, "index.html"), "<h1>Typeflow</h1>");
  await writeFile(join(root, "assets/app-abc123.js"), "export {};");
  await writeFile(join(root, "favicon.svg"), "<svg/>");
  const app = createApp({ root });
  t.after(() => app.close());
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const origin = `http://127.0.0.1:${app.server.address().port}`;
  for (const method of ["GET", "HEAD"]) {
    for (const path of ["/", "/index.html", "/favicon.svg"]) {
      const response = await fetch(origin + path, { method });
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("cache-control"),
        "public, max-age=0, s-maxage=60, must-revalidate",
      );
      assert.equal(response.headers.get("set-cookie"), null);
    }
    const asset = await fetch(origin + "/assets/app-abc123.js?v=1", { method });
    assert.equal(asset.headers.get("cache-control"), "public, max-age=31536000, immutable");
    for (const path of ["/api/session", "/api/health", "/missing", "/assets/missing.js"]) {
      const response = await fetch(origin + path, { method });
      assert.equal(response.headers.get("cache-control"), "no-store", path);
    }
  }
});
