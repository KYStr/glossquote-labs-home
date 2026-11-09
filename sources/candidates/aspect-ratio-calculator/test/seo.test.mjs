import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const zh = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const en = await readFile(new URL("../public/en/index.html", import.meta.url), "utf8");

function ids(html) {
  return [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]).sort();
}

test("pages declare their language and preview robots policy", () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(en.includes('<html lang="en">'));
  for (const html of [zh, en]) {
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));
    assert.ok(html.includes("connect-src 'none'"));
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]+"/);
  }
});

test("pages carry the exact preview alternate links", () => {
  for (const tag of [
    '<link rel="alternate" hreflang="zh-Hant" href="./index.html">',
    '<link rel="alternate" hreflang="en" href="./en/index.html">',
    '<link rel="alternate" hreflang="x-default" href="./index.html">',
  ]) assert.ok(zh.includes(tag), tag);
  for (const tag of [
    '<link rel="alternate" hreflang="zh-Hant" href="../index.html">',
    '<link rel="alternate" hreflang="en" href="./index.html">',
    '<link rel="alternate" hreflang="x-default" href="../index.html">',
  ]) assert.ok(en.includes(tag), tag);
});

test("pages link home in their own language and share one id set", () => {
  assert.ok(zh.includes('href="https://glossquote.com/index.html"'));
  assert.ok(en.includes('href="https://glossquote.com/en/index.html"'));
  assert.deepEqual(ids(zh), ids(en));
});

test("static defaults match SPEC section 3 initial state", () => {
  assert.ok(zh.includes('value="1920"') && zh.includes('value="1080"'));
  assert.ok(zh.includes(">16:9<") && zh.includes("1.7778") && zh.includes("56.25%"));
  assert.ok(zh.includes("正好是 16:9"));
  assert.ok(en.includes("Exactly 16:9"));
  assert.ok(zh.includes('value="1280"') && zh.includes(">720<"));
});

test("pages contain no external resources besides approved anchors", () => {
  const allowed = new Set([
    "https://glossquote.com/index.html",
    "https://glossquote.com/en/index.html",
    "https://units.glossquote.com/index.html",
    "https://units.glossquote.com/en/index.html",
  ]);
  for (const html of [zh, en]) {
    for (const match of html.matchAll(/https?:\/\/[^\s"'<>]+/g)) {
      assert.ok(allowed.has(match[0]), match[0]);
    }
  }
});
