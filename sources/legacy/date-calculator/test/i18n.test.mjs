import assert from "node:assert/strict";
import test from "node:test";

import { formatDateSummary, getMessages } from "../public/js/i18n.mjs";

const ERROR_CODES = [
  "DATE_TOO_LONG",
  "DATE_FORMAT",
  "DATE_RANGE",
  "INVALID_DATE",
  "DAYS_FORMAT",
  "DAYS_RANGE",
  "RESULT_RANGE",
  "INVALID_REQUEST",
];

function keysAtEveryLevel(value) {
  if (value === null || typeof value !== "object") {
    return typeof value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, keysAtEveryLevel(value[key])]),
  );
}

function placeholders(value) {
  return [...value.matchAll(/\{([^{}]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

function assertDeeplyFrozen(value, path = "messages") {
  assert.equal(Object.isFrozen(value), true, path + " must be frozen");
  if (value !== null && typeof value === "object") {
    for (const key of Reflect.ownKeys(value)) {
      assertDeeplyFrozen(value[key], path + "." + String(key));
    }
  }
}

function assertPlaceholderParity(zh, en, path = "messages") {
  if (typeof zh === "string") {
    assert.equal(typeof en, "string", path + " must be a string in both locales");
    assert.deepEqual(placeholders(zh), placeholders(en), path + " placeholders differ");
    return;
  }

  for (const key of Object.keys(zh)) {
    assertPlaceholderParity(zh[key], en[key], path + "." + key);
  }
}

test("both language dictionaries have the same nested key shape", () => {
  assert.deepEqual(
    keysAtEveryLevel(getMessages("zh-Hant")),
    keysAtEveryLevel(getMessages("en")),
  );
});

test("both dictionaries are deeply frozen", () => {
  assertDeeplyFrozen(getMessages("zh-Hant"), "zh-Hant");
  assertDeeplyFrozen(getMessages("en"), "en");
});

test("all fixed parser and calculator error codes have localized messages", () => {
  const zh = getMessages("zh-Hant");
  const en = getMessages("en");

  assert.deepEqual(Object.keys(zh.errors).sort(), [...ERROR_CODES].sort());
  assert.deepEqual(Object.keys(en.errors).sort(), [...ERROR_CODES].sort());
  assert.equal(Object.hasOwn(zh.errors, "EMPTY"), false);
  assert.equal(Object.hasOwn(en.errors, "EMPTY"), false);
  for (const code of ERROR_CODES) {
    assert.equal(typeof zh.errors[code], "string");
    assert.ok(zh.errors[code].length > 0);
    assert.equal(typeof en.errors[code], "string");
    assert.ok(en.errors[code].length > 0);
  }
});

test("required status placeholders match across locales and stay explicit", () => {
  const zh = getMessages("zh-Hant");
  const en = getMessages("en");

  assert.deepEqual(placeholders(zh.status.diff), ["delta", "inclusive"]);
  assert.deepEqual(placeholders(en.status.diff), ["delta", "inclusive"]);
  assert.deepEqual(placeholders(zh.status.offset), ["iso"]);
  assert.deepEqual(placeholders(en.status.offset), ["iso"]);
  assertPlaceholderParity(zh, en);
});

test("empty prompts, directions, and offset rule are present in both locales", () => {
  for (const lang of ["zh-Hant", "en"]) {
    const messages = getMessages(lang);
    assert.equal(typeof messages.empty.diff, "string");
    assert.equal(typeof messages.empty.offset, "string");
    assert.equal(typeof messages.direction.forward, "string");
    assert.equal(typeof messages.direction.backward, "string");
    assert.equal(typeof messages.direction.same, "string");
    assert.equal(typeof messages.offsetRule, "string");
    assert.ok(messages.offsetRule.length > 0);
  }
});

test("unknown locale inputs use the fixed default language dictionary", () => {
  const defaultMessages = getMessages("zh-Hant");
  for (const unknown of ["fr", "ZH-hant", "", undefined, null, new String("en")]) {
    assert.strictEqual(getMessages(unknown), defaultMessages);
  }
  assert.strictEqual(getMessages("en"), getMessages("en"));
});

test("U06: full dates preserve four-digit years and fixed local weekday/month names", () => {
  assert.deepEqual(formatDateSummary("2024-02-28", "en"), {
    ok: true, value: { iso: "2024-02-28", weekdayIndex: 2, weekday: "Wednesday", label: "Wednesday, 28 February 2024" },
  });
  assert.equal(formatDateSummary("2024-02-29", "zh-Hant").value.label, "2024 年 2 月 29 日（星期四）");
  assert.equal(formatDateSummary("0001-01-01", "en").value.label, "Monday, 1 January 0001");
  assert.equal(formatDateSummary("0001-01-01", "zh-Hant").value.label, "0001 年 1 月 1 日（星期一）");
  assert.equal(formatDateSummary("9999-12-31", "en").value.label, "Friday, 31 December 9999");
  assert.equal(formatDateSummary("9999-12-31", "zh-Hant").value.weekday, "星期五");
  assert.equal(formatDateSummary("2024-09-18", "en").value.label, "Wednesday, 18 September 2024");
  assert.deepEqual(getMessages("en").weekdays, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
  assert.equal(getMessages("en").months.length, 12);
  assert.equal(getMessages("en").months[10], "November");
  assert.deepEqual(formatDateSummary(" 2024-02-29 ", "en"), formatDateSummary("2024-02-29", "en"));
  assert.deepEqual(formatDateSummary("2024-02-29", "fr"), formatDateSummary("2024-02-29", "zh-Hant"));
});

test("U06-07/08/10: invalid dates never produce labels and seasonal transitions keep calendar weekdays", () => {
  for (const raw of ["1900-02-29", "2100-02-29", "2024-02-30"]) {
    assert.deepEqual(formatDateSummary(raw, "en"), { ok: false, code: "INVALID_DATE" });
  }
  assert.deepEqual(formatDateSummary("", "en"), { ok: false, code: "EMPTY" });
  assert.deepEqual(formatDateSummary("<svg>x</svg>", "en"), { ok: false, code: "DATE_FORMAT" });
  for (const [raw, weekday] of [["2024-03-10", "Sunday"], ["2024-03-11", "Monday"], ["2024-11-03", "Sunday"], ["2024-11-04", "Monday"], ["2000-02-29", "Tuesday"]]) {
    assert.equal(formatDateSummary(raw, "en").value.weekday, weekday);
  }
});
