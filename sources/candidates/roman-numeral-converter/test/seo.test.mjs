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
  for (const html of [zh, en]) {
    assert.ok(html.includes('value="1994"'));
    assert.ok(html.includes('value="MCMXCIV"'));
    assert.ok(html.includes("<td>M</td><td>1000</td>"));
    assert.ok(html.includes("<td>CM</td><td>900</td>"));
    assert.ok(html.includes("<td>XC</td><td>90</td>"));
    assert.ok(html.includes("<td>IV</td><td>4</td>"));
    assert.ok(html.includes('id="breakdown-total">1994<'));
  }
});

test("the thirteen-entry reference table is complete on both pages", () => {
  for (const html of [zh, en]) {
    for (const [symbols, value] of [
      ["M", "1000"], ["CM", "900"], ["D", "500"], ["CD", "400"], ["C", "100"],
      ["XC", "90"], ["L", "50"], ["XL", "40"], ["X", "10"], ["IX", "9"],
      ["V", "5"], ["IV", "4"], ["I", "1"],
    ]) {
      assert.ok(html.includes(`<td>${symbols}</td><td>${value}</td>`), `${symbols} ${value}`);
    }
    assert.ok(html.includes("IIII"), "clock-face note present");
  }
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
