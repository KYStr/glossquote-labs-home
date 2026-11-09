import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExportDocument,
  countRenderedWords,
  formatExportFilename,
  renderDocument,
} from "../public/js/core/markdown.mjs";

const html = (source) => renderDocument(source).html;

test("normative fixtures from SPEC section 4", () => {
  assert.equal(html("# Title"), "<h1>Title</h1>");
  assert.equal(html("a_b_c"), "<p>a_b_c</p>");
  assert.equal(html("**b** and ~~s~~"), "<p><strong>b</strong> and <del>s</del></p>");
  assert.equal(html("<script>alert(1)</script>"), "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  assert.equal(html("[x](javascript:alert(1))"), "<p>x</p>");
  assert.equal(html("- [ ] todo"), '<ul>\n<li><input type="checkbox" disabled> todo</li>\n</ul>');
  const table = html("| A | B |\n|:--|--:|\n| 1 | 2 |");
  assert.ok(table.includes('<th align="left">A</th>'));
  assert.ok(table.includes('<th align="right">B</th>'));
  assert.ok(table.includes('<td align="right">2</td>'));
});

test("block constructs", () => {
  assert.equal(html("###### six"), "<h6>six</h6>");
  assert.equal(html("## Closed ##"), "<h2>Closed</h2>");
  assert.equal(html("```js\nx < y\n```"), '<pre><code class="language-js">x &lt; y\n</code></pre>');
  assert.equal(html("```\nunclosed"), "<pre><code>unclosed\n</code></pre>");
  assert.equal(html("~~~py\ncode\n~~~"), '<pre><code class="language-py">code\n</code></pre>');
  assert.equal(html("---"), "<hr>");
  assert.equal(html("para\n---"), "<p>para</p>\n<hr>");
  assert.equal(html("> a\n> b"), "<blockquote>\n<p>a\nb</p>\n</blockquote>");
  assert.equal(html("> # H\n> text"), "<blockquote>\n<h1>H</h1>\n<p>text</p>\n</blockquote>");
  assert.equal(html("1. one\n2. two"), "<ol>\n<li>one</li>\n<li>two</li>\n</ol>");
  assert.equal(html("3. three"), '<ol start="3">\n<li>three</li>\n</ol>');
  assert.equal(html("- a\n  - nested"), "<ul>\n<li>a\n<ul>\n<li>nested</li>\n</ul></li>\n</ul>");
  assert.equal(html("- [x] done"), '<ul>\n<li><input type="checkbox" disabled checked> done</li>\n</ul>');
  assert.equal(html("- loose\n\n- items"), "<ul>\n<li><p>loose</p></li>\n<li><p>items</p></li>\n</ul>");
});

test("deviations: setext, collapsed/shortcut references, bare URLs", () => {
  assert.equal(html("Setext\n==="), "<p>Setext\n===</p>");
  assert.equal(html("[text][]\n\n[text]: https://example.com"), "<p>[text][]</p>");
  assert.equal(html("[text]\n\n[text]: https://example.com"), "<p>[text]</p>");
  assert.equal(html("visit https://example.com now"), "<p>visit https://example.com now</p>");
  assert.equal(html("Missing [ref][nope] stays."), "<p>Missing [ref][nope] stays.</p>");
});

test("inline constructs", () => {
  assert.equal(html("*em* and **strong** and ***both***"),
    "<p><em>em</em> and <strong>strong</strong> and <em><strong>both</strong></em></p>");
  assert.equal(html("_em_ too"), "<p><em>em</em> too</p>");
  assert.equal(html("a *b **c** d* e"), "<p>a <em>b <strong>c</strong> d</em> e</p>");
  assert.equal(html("unmatched ** star"), "<p>unmatched ** star</p>");
  assert.equal(html("`a  b`"), "<p><code>a  b</code></p>");
  assert.equal(html("`` x ` y ``"), "<p><code>x ` y</code></p>");
  assert.equal(html("\\*literal\\*"), "<p>*literal*</p>");
  assert.equal(html("one  \ntwo"), "<p>one<br>two</p>");
  assert.equal(html("one\\\ntwo"), "<p>one<br>two</p>");
  assert.equal(html("one\ntwo"), "<p>one\ntwo</p>");
  assert.equal(html('[t](https://example.com "T")'),
    '<p><a href="https://example.com" title="T">t</a></p>');
  assert.equal(html("[t](<https://example.com/a b>)"),
    '<p><a href="https://example.com/a b">t</a></p>');
  assert.equal(html("A [ref][ID] link.\n\n[id]: https://example.org"),
    '<p>A <a href="https://example.org">ref</a> link.</p>');
  assert.equal(html("![alt *em*](img.png)"),
    '<p><img src="img.png" alt="alt em" referrerpolicy="no-referrer"></p>');
  assert.equal(html("see <https://example.com>"),
    '<p>see <a href="https://example.com">https://example.com</a></p>');
  assert.equal(html("mail <a@b.com>"),
    '<p>mail <a href="mailto:a@b.com">a@b.com</a></p>');
  assert.equal(html("~single~ stays"), "<p>~single~ stays</p>");
});

test("entities: named set and numeric pass through, others literal", () => {
  assert.equal(html("Fish &amp; Chips"), "<p>Fish &amp; Chips</p>");
  assert.equal(html("a &copy; b"), "<p>a &amp;copy; b</p>");
  assert.equal(html("&#65;&#x42;"), "<p>&#65;&#x42;</p>");
  assert.equal(renderDocument("&#65;").plainText, "A");
  assert.equal(renderDocument("a&nbsp;b").plainText, "a\u00A0b");
});

test("hostile inputs produce inert output", () => {
  const cases = [
    ["<script>alert(1)</script>", "&lt;script&gt;"],
    ["<img src=x onerror=alert(1)>", "&lt;img"],
    ["[x](javascript:alert(1))", "<p>x</p>"],
    ["[x](JaVaScRiPt:alert(1))", "<p>x</p>"],
    ["[x](java\tscript:alert(1))", "<p>x</p>"],
    ["[x]( data:text/html;base64,PHNjcmlwdD4= )", "<p>x</p>"],
    ["![x](data:text/html;base64,PHNjcmlwdD4=)", "<p>x</p>"],
    ["[x](vbscript:msgbox)", "<p>x</p>"],
    ['[x](https://example.com "t\\" onmouseover=\\"bad")', null],
  ];
  for (const [input, expected] of cases) {
    const out = html(input);
    assert.ok(!out.includes("<script"), input);
    assert.ok(!out.includes("<img"), input);
    // No live tag may carry an event handler; the words may appear
    // only as escaped, visible text.
    assert.ok(!/<[^>]*\son\w+=/.test(out), `${input} -> ${out}`);
    assert.ok(!out.includes("javascript:"), input);
    if (expected) assert.ok(out.includes(expected) || out === expected, `${input} -> ${out}`);
  }
  // Attribute breakout via a title must stay inside the attribute.
  const breakout = html('[x](https://example.com \'a" onclick="evil\')');
  assert.ok(!breakout.includes('onclick="evil"'), breakout);
  assert.ok(breakout.includes("&quot;") || breakout.includes("&#39;"), breakout);
});

test("tables: padding, dropping, escaped pipes", () => {
  const out = html("| H |\n|---|\n| a | extra |\n| short |");
  assert.ok(out.includes("<td>a</td>"));
  assert.ok(!out.includes("extra"));
  const escaped = html("| A\\|B | C |\n|---|---|\n| 1 | 2 |");
  assert.ok(escaped.includes("<th>A|B</th>"));
});

test("counts: code points and the CJK-aware word rule", () => {
  assert.equal(renderDocument("").sourceChars, 0);
  assert.equal(renderDocument("a😀b").sourceChars, 3);
  assert.equal(renderDocument("中文 test 混排 words").renderedWords, 6);
  assert.equal(countRenderedWords("中文"), 2);
  assert.equal(countRenderedWords("hello world"), 2);
  assert.equal(countRenderedWords("中文abc"), 3);
  assert.equal(countRenderedWords(""), 0);
  assert.equal(renderDocument("# 標題\n\n內文 text").title, "標題");
});

test("export: structure, title fallback and byte determinism", () => {
  const doc = buildExportDocument({ bodyHtml: "<h1>Hi</h1>", title: "Hi", lang: "zh-Hant" });
  assert.ok(doc.startsWith("<!DOCTYPE html>\n<html lang=\"zh-Hant\">"));
  assert.ok(doc.includes("<title>Hi</title>"));
  assert.ok(doc.includes("<style>"));
  assert.ok(doc.includes("<body>\n<h1>Hi</h1>\n</body>"));
  assert.equal(doc, buildExportDocument({ bodyHtml: "<h1>Hi</h1>", title: "Hi", lang: "zh-Hant" }));
  const frozen = new Date(2026, 10, 2, 9, 5, 3);
  assert.equal(formatExportFilename(frozen), "markdown-20261102-090503.html");
});

test("stress: pathological inputs complete without blowup", () => {
  const brackets = "[".repeat(10000);
  const start = Date.now();
  const out = renderDocument(brackets);
  assert.equal(out.html, `<p>${brackets}</p>`);
  const openers = "*a ".repeat(5000);
  const out2 = renderDocument(openers);
  assert.ok(out2.html.startsWith("<p>"));
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 10000, `stress took ${elapsed} ms`);
});

test("CRLF normalisation and tab expansion", () => {
  assert.equal(html("# A\r\n\r\nB"), "<h1>A</h1>\n<p>B</p>");
  assert.equal(html("- a\n\t- b"), "<ul>\n<li>a\n<ul>\n<li>b</li>\n</ul></li>\n</ul>");
});
