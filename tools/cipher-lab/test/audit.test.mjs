// SPEC section 5 honesty audit: the educational banner must be present in
// both languages, and forbidden self-descriptions must not appear anywhere
// in the product outside the banner's own negations.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const FORBIDDEN_EN = [/secure/i, /protect/i, /safe encryption/i, /military-grade/i];
const FORBIDDEN_ZH = ["安全加密", "軍用級", "保護", "安全"];

function withoutBanner(html) {
  return html.replace(/<aside class="banner"[\s\S]*?<\/aside>/, "");
}

test("banner is present in both pages with the required content", async () => {
  const zh = await read("public/index.html");
  const en = await read("public/en/index.html");
  assert.match(zh, /<aside class="banner"/);
  assert.match(en, /<aside class="banner"/);
  const zhBanner = zh.match(/<aside class="banner"[\s\S]*?<\/aside>/)[0];
  const enBanner = en.match(/<aside class="banner"[\s\S]*?<\/aside>/)[0];
  assert.ok(zhBanner.includes("幾秒"), "zh banner: breakable in seconds");
  assert.ok(zhBanner.includes("絕對不可以用來保護"), "zh banner: never for real information");
  assert.ok(enBanner.includes("broken in seconds"), "en banner: breakable in seconds");
  assert.ok(enBanner.includes("must never be used to protect"), "en banner: never for real information");
  assert.ok(enBanner.includes("modern, publicly reviewed encryption"), "en banner: points to modern encryption");
});

test("string audit: no forbidden self-descriptions outside the banner", async () => {
  const zh = withoutBanner(await read("public/index.html"));
  const en = withoutBanner(await read("public/en/index.html"));
  for (const pattern of FORBIDDEN_EN) {
    assert.ok(!pattern.test(en), `en page must not contain ${pattern}`);
  }
  for (const word of FORBIDDEN_ZH) {
    assert.ok(!zh.includes(word), `zh page must not contain ${word}`);
  }
  const app = await read("public/js/app.js");
  const core = await read("public/js/core/cipher.mjs");
  for (const pattern of FORBIDDEN_EN) {
    assert.ok(!pattern.test(app), `app.js must not contain ${pattern}`);
    assert.ok(!pattern.test(core), `cipher.mjs must not contain ${pattern}`);
  }
  for (const word of FORBIDDEN_ZH) {
    assert.ok(!app.includes(word), `app.js must not contain ${word}`);
    assert.ok(!core.includes(word), `cipher.mjs must not contain ${word}`);
  }
});
