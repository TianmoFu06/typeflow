import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("compose deploys the latest image without an IMAGE environment value", async () => {
  const compose = await readFile(new URL("../compose.yaml", import.meta.url), "utf8");
  const example = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  assert.match(compose, /image: registry\.huangyut1ng\.com\/typeflow:latest/);
  assert.doesNotMatch(compose, /\$\{IMAGE/);
  assert.doesNotMatch(example, /^IMAGE=/m);
});

test("deployment always pulls latest and propagates config errors", async () => {
  const root = await mkdtemp(join(tmpdir(), "typeflow-deploy-"));
  try {
    await mkdir(join(root, "scripts"));
    await copyFile(
      new URL("../scripts/deploy.sh", import.meta.url),
      join(root, "scripts/deploy.sh"),
    );
    await writeFile(join(root, ".env"), "# Docker test double supplies resolved configuration\n");
    await writeFile(
      join(root, "docker"),
      `#!/usr/bin/env bash
set -eu
echo "$*" >> "$CALLS"
if [[ "$*" == "compose config --quiet" ]]; then exit "$CONFIG_EXIT"; fi
`,
      { mode: 0o755 },
    );
    for (const [configExit, expected] of [
      ["12", 12],
      ["0", 0],
    ]) {
      const calls = join(root, "calls");
      await writeFile(calls, "");
      const result = spawnSync("bash", [join(root, "scripts/deploy.sh")], {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${root}:${process.env.PATH}`,
          CALLS: calls,
          CONFIG_EXIT: configExit,
        },
      });
      assert.equal(result.status, expected, result.stderr);
      const commands = await readFile(calls, "utf8");
      assert.equal(commands.includes("compose pull --policy always typeflow"), expected === 0);
      assert.equal(commands.includes("compose up"), expected === 0);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
