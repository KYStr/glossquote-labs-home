import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

const productRoot = process.argv[2];
if (process.argv.length !== 3 || !productRoot) {
  throw new Error("Usage: node verify-deltas.mjs <PR #283 checkout root>");
}

const fixtureUrl = new URL("./delta-vectors.json", import.meta.url);
const fixtureData = JSON.parse(await readFile(fixtureUrl, "utf8"));
const results = [];

for (const entry of fixtureData.modules) {
  const modulePath = join(resolve(productRoot), entry.path);
  const bytes = await readFile(modulePath);
  const gitBlob = createHash("sha1")
    .update("blob " + bytes.length + "\0")
    .update(bytes)
    .digest("hex");
  if (gitBlob !== entry.gitBlob) {
    throw new Error("Product module does not match PR #283: " + entry.path);
  }

  const { run } = await import(pathToFileURL(modulePath));
  for (const fixture of entry.cases) {
    const actual = run(fixture.input);
    const matches = isDeepStrictEqual(actual, fixture.expected);
    results.push({
      slug: entry.slug,
      id: fixture.id,
      status: matches ? "PASS" : "FAIL",
      actual,
    });
  }
}

const passed = results.filter((entry) => entry.status === "PASS").length;
const failed = results.length - passed;
console.log(JSON.stringify({
  product: fixtureData.product,
  node: process.version,
  passed,
  failed,
  cases: results,
}, null, 2));
if (failed !== 0) {
  process.exitCode = 1;
}
