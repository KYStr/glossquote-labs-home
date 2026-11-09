import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

async function distHashes(buildModule, projectPath) {
  const result = await buildModule.buildProject({ projectPath });
  const hashes = new Map();
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) {
        const body = await readFile(path);
        hashes.set(
          relative(result.outputPath, path).split(sep).join("/"),
          createHash("sha256").update(body).digest("hex"),
        );
      }
    }
  }
  await visit(result.outputPath);
  return hashes;
}

test("preview build is byte-reproducible and production is refused", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "gq-roman-build-"));
  try {
    const projectCopy = join(scratch, "project");
    await cp(new URL("..", import.meta.url), projectCopy, {
      recursive: true,
      filter: (source) => !/(?:^|\/)(?:\.git|dist|node_modules|test\/\.tmp)(?:\/|$)/.test(
        source.split(sep).join("/"),
      ),
    });
    const buildModule = await import(pathToFileURL(join(projectCopy, "scripts/build.mjs")).href);
    const first = await distHashes(buildModule, projectCopy);
    const second = await distHashes(buildModule, projectCopy);
    assert.deepEqual(second, first);
    assert.ok(first.has("index.html") && first.has("en/index.html"));

    const releaseModule = await import(pathToFileURL(join(projectCopy, "scripts/release.mjs")).href);
    assert.throws(
      () => releaseModule.parseReleaseArgs(["--production", "--site-url", "https://example.com/"]),
      /No production site URL has been approved/,
    );
    await assert.rejects(
      buildModule.buildProject({ projectPath: projectCopy, production: true, siteUrl: "https://example.com/" }),
      /No production site URL has been approved/,
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
