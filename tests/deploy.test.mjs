import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("deployment rejects placeholder images before pulling and propagates config errors", async () => {
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
case "$*" in
  "compose config --quiet") exit "$CONFIG_EXIT" ;;
  "compose config --images") echo "$TEST_IMAGE" ;;
esac
`,
      { mode: 0o755 },
    );
    for (const [image, configExit, expected] of [
      ["registry.huangyut1ng.com/typeflow:sha-REPLACE_WITH_FULL_COMMIT_SHA", "0", 1],
      ["", "12", 12],
      ["registry.huangyut1ng.com/typeflow@sha256:" + "a".repeat(64), "0", 0],
    ]) {
      const calls = join(root, "calls");
      await writeFile(calls, "");
      const result = spawnSync("bash", [join(root, "scripts/deploy.sh")], {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${root}:${process.env.PATH}`,
          CALLS: calls,
          TEST_IMAGE: image,
          CONFIG_EXIT: configExit,
        },
      });
      assert.equal(result.status, expected, result.stderr);
      const commands = await readFile(calls, "utf8");
      assert.equal(commands.includes("compose pull"), expected === 0);
      assert.equal(commands.includes("compose up"), expected === 0);
      if (expected === 1)
        assert.match(result.stderr, /IMAGE still contains an example placeholder/);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
