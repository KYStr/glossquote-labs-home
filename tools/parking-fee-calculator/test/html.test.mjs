// Static page tests for the two language entries: pinned titles,
// descriptions, noindex, relative canonical/hreflang, same-language home
// links, CSP, FAQ copy, and the full field set.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const zh = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const en = await readFile(new URL("../public/en/index.html", import.meta.url), "utf8");

const FIELD_IDS = [
  "f-entry",
  "f-exit",
  "f-graceMinutes",
  "f-firstPeriodMinutes",
  "f-firstPrice",
  "f-nextPeriodMinutes",
  "f-nextPrice",
  "f-dailyCap",
  "f-lostTicketFee",
  "f-lostTicket"
];

test("zh-Hant page head", () => {
  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes("<title>停車費計算機｜Gloss Tools</title>"));
  assert.ok(
    zh.includes(
      "輸入入場與出場時間和停車場費率，按日曆日逐日試算停車費：免費寬限、首段與後續段計費、每日上限與遺失票卡定額。"
    )
  );
  assert.ok(zh.includes('content="noindex,nofollow"'));
  assert.ok(zh.includes('hreflang="en"'));
  assert.ok(zh.includes('href="../../"'));
  assert.ok(zh.includes("worker-src blob:"));
  assert.ok(zh.includes("每日上限是按日曆日還是 24 小時？"));
  assert.ok(zh.includes("免費寬限超過了怎麼算？"));
});

test("en page head", () => {
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>Parking Fee Calculator | Gloss Tools</title>"));
  assert.ok(
    en.includes(
      "Enter entry and exit times plus the lot's tariff to get a per-calendar-day parking fee breakdown with grace minutes, first and subsequent periods, a daily cap and a lost-ticket flat fee."
    )
  );
  assert.ok(en.includes('content="noindex,nofollow"'));
  assert.ok(en.includes('hreflang="zh-Hant"'));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes("worker-src blob:"));
  assert.ok(en.includes("Is the daily cap per calendar day or per 24 hours?"));
  assert.ok(en.includes("What happens past the free grace?"));
});

test("both pages expose every field and no external assets", () => {
  for (const html of [zh, en]) {
    for (const id of FIELD_IDS) assert.ok(html.includes('id="' + id + '"'), id);
    assert.ok(!/src="https?:/.test(html));
    assert.ok(!/href="https?:/.test(html));
    assert.ok(html.includes('id="btn-download"'));
    assert.ok(html.includes('aria-live="polite"'));
  }
});
