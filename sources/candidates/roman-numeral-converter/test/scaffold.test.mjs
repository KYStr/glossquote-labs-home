import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import { REQUIRED_PATHS, runProjectCheck } from "../scripts/check.mjs";

test("all required house paths exist", async () => {
  for (const path of REQUIRED_PATHS) {
    await access(new URL(`../${path}`, import.meta.url));
  }
});

test("the project check passes on this tree", async () => {
  assert.equal(await runProjectCheck(), true);
});

test("package metadata follows the house contract", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.name, "glossquote-roman-numeral-converter");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.engines.node, ">=24");
  assert.equal(pkg.dependencies, undefined);
  assert.deepEqual(pkg.scripts, {
    dev: "node scripts/serve.mjs",
    test: "node --test",
    check: "node scripts/check.mjs",
    build: "node scripts/build.mjs",
  });
});

test("the pure core never touches the DOM or the network", async () => {
  for (const path of ["../public/js/core/roman.mjs", "../public/js/core/table.mjs"]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.ok(!/\bdocument\b|\bwindow\b/.test(source), path);
  }
  const app = await readFile(new URL("../public/js/app.mjs", import.meta.url), "utf8");
  const forbidden = [
    ["inner", "HTML"],
    ["local", "Storage"],
    ["session", "Storage"],
    ["fe", "tch("],
    ["ev", "al("],
  ].map((parts) => parts.join(""));
  for (const token of forbidden) {
    assert.ok(!app.includes(token), token);
  }
});
