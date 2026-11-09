import assert from "node:assert/strict";
import test from "node:test";
import { getMessages } from "../public/js/i18n.mjs";

class FakeElement {
  constructor(id, tagName, ownerDocument) {
    this.id = id;
    this.tagName = tagName;
    this.ownerDocument = ownerDocument;
    this.value = "";
    this.checked = false;
    this.hidden = false;
    this.disabled = false;
    this.textContent = "";
    this.validity = { badInput: false };
    this.attributes = new Map();
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type, options = {}) {
    const event = {
      type,
      target: this,
      currentTarget: this,
      key: options.key,
      keyCode: options.keyCode,
      isComposing: options.isComposing ?? false,
      repeat: options.repeat ?? false,
      defaultPrevented: options.defaultPrevented ?? false,
      preventDefaultCalls: 0,
      preventDefault() {
        this.preventDefaultCalls += 1;
        this.defaultPrevented = true;
      },
    };

    for (const listener of this.listeners.get(type) ?? []) {
      listener.call(this, event);
    }
    return event;
  }

  listenerCount(type) {
    return this.listeners.get(type)?.length ?? 0;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }
}

function createFixture(lang = "en") {
  const tags = {
    "date-form": "FORM",
    "calculator-controls": "FIELDSET",
    "page-title": "H1",
    "mode-diff": "INPUT",
    "mode-offset": "INPUT",
    "diff-panel": "SECTION",
    "date-start": "INPUT",
    "date-end": "INPUT",
    "swap-dates": "BUTTON",
    "offset-panel": "SECTION",
    "date-base": "INPUT",
    "day-offset": "INPUT",
    "start-help": "P",
    "start-error": "P",
    "end-help": "P",
    "end-error": "P",
    "base-help": "P",
    "base-error": "P",
    "days-help": "P",
    "days-error": "P",
    "diff-results": "SECTION",
    "diff-result": "OUTPUT",
    "inclusive-result": "OUTPUT",
    "offset-results": "SECTION",
    "date-result": "OUTPUT",
    "date-weekday": "SPAN",
    "diff-date-summary": "P",
    "offset-date-summary": "P",
    "result-note": "P",
    "clear-input": "BUTTON",
    "calculation-status": "P",
    "unsupported-note": "P",
  };
  const elements = new Map();
  const document = {
    documentElement: { lang },
    readyState: "complete",
    activeElement: null,
    getElementById(id) {
      return elements.get(id) ?? null;
    },
  };
  for (const [id, tagName] of Object.entries(tags)) {
    elements.set(id, new FakeElement(id, tagName, document));
  }
  elements.get("mode-diff").checked = true;
  elements.get("calculator-controls").disabled = true;
  elements.get("offset-panel").hidden = true;
  elements.get("offset-results").hidden = true;

  const windowListeners = new Map();
  const window = {
    addEventListener(type, listener) {
      const listeners = windowListeners.get(type) ?? [];
      listeners.push(listener);
      windowListeners.set(type, listeners);
    },
    dispatch(type) {
      for (const listener of windowListeners.get(type) ?? []) {
        listener({ type });
      }
    },
  };

  return {
    document,
    window,
    element(id) {
      return elements.get(id);
    },
    remove(id) {
      elements.delete(id);
    },
  };
}

function installGlobals(fixture) {
  const names = ["document", "window"];
  const prior = new Map(names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    enumerable: true,
    writable: true,
    value: fixture.document,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    writable: true,
    value: fixture.window,
  });

  return () => {
    for (const name of names) {
      const descriptor = prior.get(name);
      if (descriptor === undefined) {
        delete globalThis[name];
      } else {
        Object.defineProperty(globalThis, name, descriptor);
      }
    }
  };
}

test("the app confirms current date and day inputs on Enter", async () => {
  const fixture = createFixture();
  const restoreGlobals = installGlobals(fixture);

  try {
    await import("../public/js/app.mjs");

    const { element, document, window } = fixture;
    const modeDiff = element("mode-diff");
    const modeOffset = element("mode-offset");
    const controls = element("calculator-controls");
    const status = element("calculation-status");
    const start = element("date-start");
    const end = element("date-end");
    const dayOffset = element("day-offset");

    assert.equal(controls.disabled, false);
    assert.equal(element("unsupported-note").hidden, true);
    assert.equal(status.textContent, "Enter two dates to see their difference.");

    const radioEnter = modeOffset.dispatch("keydown", { key: "Enter" });
    const buttonEnter = element("swap-dates").dispatch("keydown", { key: "Enter" });
    assert.equal(radioEnter.preventDefaultCalls, 0);
    assert.equal(buttonEnter.preventDefaultCalls, 0);
    assert.equal(modeOffset.listenerCount("keydown"), 0);
    assert.equal(element("swap-dates").listenerCount("keydown"), 0);

    modeDiff.checked = false;
    modeOffset.checked = true;
    modeOffset.dispatch("change");
    assert.equal(status.textContent, "Enter a base date and a day offset.");

    dayOffset.value = "";
    dayOffset.dispatch("input");
    element("date-base").value = "2026-01-01";
    element("date-base").dispatch("input");
    dayOffset.value = "1";
    dayOffset.dispatch("input");
    assert.equal(element("date-result").textContent, "2026-01-02");
    assert.equal(status.textContent, "Result date: 2026-01-02.");

    dayOffset.value += "2";
    dayOffset.dispatch("input");
    assert.equal(element("date-result").textContent, "2026-01-13");
    assert.equal(element("date-weekday").textContent, "Tuesday");
    assert.equal(element("offset-date-summary").textContent, "Tuesday, 13 January 2026 is 12 days after Thursday, 1 January 2026.");
    assert.equal(status.textContent, "Result date: 2026-01-02.");

    dayOffset.focus();
    const dayEnter = dayOffset.dispatch("keydown", { key: "Enter" });
    assert.equal(dayEnter.preventDefaultCalls, 1);
    assert.equal(dayEnter.defaultPrevented, true);
    assert.equal(status.textContent, "Result date: 2026-01-13.");
    assert.equal(document.activeElement, dayOffset);

    dayOffset.value = "13";
    dayOffset.dispatch("input");
    assert.equal(element("date-result").textContent, "2026-01-14");
    assert.equal(status.textContent, "Result date: 2026-01-13.");

    for (const options of [
      { key: "ArrowUp" },
      { key: "Enter", isComposing: true },
      { key: "Enter", keyCode: 229 },
      { key: "Enter", repeat: true },
      { key: "Enter", defaultPrevented: true },
    ]) {
      const ignored = dayOffset.dispatch("keydown", options);
      assert.equal(ignored.preventDefaultCalls, 0);
      assert.equal(status.textContent, "Result date: 2026-01-13.");
      assert.equal(document.activeElement, dayOffset);
    }

    const latestDayEnter = dayOffset.dispatch("keydown", { key: "Enter" });
    assert.equal(latestDayEnter.preventDefaultCalls, 1);
    assert.equal(status.textContent, "Result date: 2026-01-14.");
    assert.equal(document.activeElement, dayOffset);

    dayOffset.value = "14";
    dayOffset.dispatch("input");
    assert.equal(element("date-result").textContent, "2026-01-15");
    dayOffset.dispatch("blur");
    assert.equal(status.textContent, "Result date: 2026-01-14.");
    dayOffset.dispatch("change");
    assert.equal(status.textContent, "Result date: 2026-01-15.");

    dayOffset.value = "15";
    dayOffset.dispatch("input");
    const submit = element("date-form").dispatch("submit");
    assert.equal(submit.preventDefaultCalls, 1);
    assert.equal(status.textContent, "Result date: 2026-01-16.");

    window.dispatch("pagehide");
    assert.equal(controls.disabled, true);
    assert.equal(element("unsupported-note").hidden, false);
    assert.equal(element("date-base").value, "");
    assert.equal(dayOffset.value, "0");
    assert.equal(status.textContent, "");

    const keydownCount = dayOffset.listenerCount("keydown");
    window.dispatch("pageshow");
    assert.equal(controls.disabled, false);
    assert.equal(element("unsupported-note").hidden, true);
    assert.equal(modeDiff.checked, true);
    assert.equal(modeOffset.checked, false);
    assert.equal(status.textContent, "Enter two dates to see their difference.");
    assert.equal(dayOffset.listenerCount("keydown"), keydownCount);

    start.value = "2026-01-01";
    start.dispatch("input");
    end.value = "2026-01-03";
    end.dispatch("input");
    assert.equal(element("diff-result").textContent, "2");

    start.value = "2026-01-02";
    start.dispatch("input");
    assert.equal(element("diff-result").textContent, "1");
    assert.equal(status.textContent, "Date difference: 2 days; inclusive count: 3 days.");
    start.focus();
    const dateEnter = start.dispatch("keydown", { key: "Enter" });
    assert.equal(dateEnter.preventDefaultCalls, 1);
    assert.equal(status.textContent, "Date difference: 1 days; inclusive count: 2 days.");
    assert.equal(document.activeElement, start);

    const swap = element("swap-dates").dispatch("click");
    assert.equal(swap.preventDefaultCalls, 1);
    assert.equal(start.value, "2026-01-03");
    assert.equal(end.value, "2026-01-02");
    assert.equal(element("diff-result").textContent, "-1");

    const clear = element("clear-input").dispatch("click");
    assert.equal(clear.preventDefaultCalls, 1);
    assert.equal(start.value, "");
    assert.equal(end.value, "");
    assert.equal(element("diff-result").textContent, "—");
    assert.equal(element("inclusive-result").textContent, "—");
    assert.equal(document.activeElement, start);
  } finally {
    restoreGlobals();
  }
});

async function withApp(lang, action, prepare = () => {}) {
  const fixture = createFixture(lang);
  prepare(fixture);
  const restore = installGlobals(fixture);
  try {
    const { initializeDateCalculator } = await import("../public/js/app.mjs");
    initializeDateCalculator(fixture.document, fixture.window);
    await action(fixture);
  } finally {
    restore();
  }
}

function assertSummariesEmpty(element) {
  for (const id of ["diff-date-summary", "offset-date-summary", "date-weekday"]) {
    assert.equal(element(id).textContent, "", id);
    assert.equal(element(id).hidden, true, id);
  }
}

for (const lang of ["zh-Hant", "en"]) {
  test("U06: " + lang + " summaries follow results, errors, swap and lifecycle cleanup", async () => {
    await withApp(lang, ({ element, document, window }) => {
      assertSummariesEmpty(element);
      const start = element("date-start");
      const end = element("date-end");
      const validDiff = () => {
        start.value = "2024-02-28";
        start.validity.badInput = false;
        end.value = "2024-03-01";
        end.dispatch("input");
      };
      validDiff();
      assert.equal(element("diff-result").textContent, "2");
      assert.equal(element("inclusive-result").textContent, "3");
      assert.equal(element("diff-date-summary").textContent, lang === "en"
        ? "Start: Wednesday, 28 February 2024; end: Friday, 1 March 2024."
        : "開始：2024 年 2 月 28 日（星期三）；結束：2024 年 3 月 1 日（星期五）。");
      element("swap-dates").dispatch("click");
      assert.equal(element("diff-result").textContent, "-2");
      assert.equal(element("inclusive-result").textContent, "3");
      assert.equal(element("diff-date-summary").textContent, lang === "en"
        ? "Start: Friday, 1 March 2024; end: Wednesday, 28 February 2024."
        : "開始：2024 年 3 月 1 日（星期五）；結束：2024 年 2 月 28 日（星期三）。");
      start.value = end.value = "2024-02-29";
      end.dispatch("input");
      assert.equal(element("diff-result").textContent, "0");
      assert.equal(element("inclusive-result").textContent, "1");
      assert.equal(element("diff-date-summary").textContent, lang === "en"
        ? "Start: Thursday, 29 February 2024; end: Thursday, 29 February 2024."
        : "開始：2024 年 2 月 29 日（星期四）；結束：2024 年 2 月 29 日（星期四）。");
      for (const [raw, badInput, errorCode] of [
        ["", false, null], ["", true, "DATE_FORMAT"], ["2024-02-30", false, "INVALID_DATE"], ["<svg>x</svg>", false, "DATE_FORMAT"],
      ]) {
        validDiff();
        start.value = raw;
        start.validity.badInput = badInput;
        start.dispatch("input");
        assert.equal(element("diff-result").textContent, "—");
        assert.equal(element("start-error").hidden, errorCode === null);
        if (errorCode !== null) {
          assert.equal(element("start-error").textContent, getMessages(lang).errors[errorCode]);
        }
        assertSummariesEmpty(element);
      }
      validDiff();
      element("clear-input").dispatch("click");
      assert.equal(document.activeElement, start);
      assertSummariesEmpty(element);
      validDiff();
      element("mode-offset").checked = true;
      element("mode-offset").dispatch("change");
      assert.equal(start.value, "");
      assert.equal(element("day-offset").value, "0");
      assertSummariesEmpty(element);
      for (const [base, days, iso, weekday, en, zh] of [
        ["2024-02-28", "1", "2024-02-29", ["Thursday", "星期四"],
          "Thursday, 29 February 2024 is 1 day after Wednesday, 28 February 2024.",
          "2024 年 2 月 28 日（星期三） 加 1 天，結果為 2024 年 2 月 29 日（星期四）。"],
        ["2024-03-01", "-1", "2024-02-29", ["Thursday", "星期四"],
          "Thursday, 29 February 2024 is 1 day before Friday, 1 March 2024.",
          "2024 年 3 月 1 日（星期五） 減 1 天，結果為 2024 年 2 月 29 日（星期四）。"],
        ["2024-02-29", "-0", "2024-02-29", ["Thursday", "星期四"],
          "Thursday, 29 February 2024 is the same date as Thursday, 29 February 2024.",
          "2024 年 2 月 29 日（星期四），與基準日期 2024 年 2 月 29 日（星期四）相同。"],
        ["0001-01-01", "0", "0001-01-01", ["Monday", "星期一"],
          "Monday, 1 January 0001 is the same date as Monday, 1 January 0001.",
          "0001 年 1 月 1 日（星期一），與基準日期 0001 年 1 月 1 日（星期一）相同。"],
        ["9999-12-31", "0", "9999-12-31", ["Friday", "星期五"],
          "Friday, 31 December 9999 is the same date as Friday, 31 December 9999.",
          "9999 年 12 月 31 日（星期五），與基準日期 9999 年 12 月 31 日（星期五）相同。"],
      ]) {
        element("date-base").value = base;
        element("day-offset").value = days;
        element("day-offset").dispatch("input");
        assert.equal(element("date-result").textContent, iso);
        assert.equal(element("date-weekday").textContent, weekday[lang === "en" ? 0 : 1]);
        assert.equal(element("offset-date-summary").textContent, lang === "en" ? en : zh);
        assert.equal(element("offset-date-summary").hidden, false);
        assert.equal(element("diff-date-summary").hidden, true);
      }
      for (const [base, days] of [["0001-01-01", "-1"], ["9999-12-31", "1"]]) {
        element("date-base").value = base;
        element("day-offset").value = days;
        element("day-offset").dispatch("input");
        assert.equal(element("date-result").textContent, "—");
        assert.equal(element("days-error").hidden, false);
        assertSummariesEmpty(element);
      }
      element("date-base").value = "2024-02-28";
      element("day-offset").value = "1";
      element("day-offset").dispatch("input");
      element("clear-input").dispatch("click");
      assert.equal(document.activeElement, element("date-base"));
      assertSummariesEmpty(element);
      element("date-base").value = "2024-02-28";
      element("day-offset").value = "1";
      element("day-offset").dispatch("input");
      window.dispatch("pagehide");
      assert.equal(element("calculator-controls").disabled, true);
      assert.equal(element("date-base").value, "");
      assert.equal(element("day-offset").value, "0");
      assertSummariesEmpty(element);
      window.dispatch("pageshow");
      assert.equal(element("mode-diff").checked, true);
      assert.equal(element("calculator-controls").disabled, false);
      assertSummariesEmpty(element);
    });
  });
}

test("U06: missing or mistyped summary hooks keep the UI fail closed", async () => {
  for (const id of ["diff-date-summary", "offset-date-summary", "date-weekday"]) {
    for (const missing of [true, false]) {
      await withApp("en", ({ element }) => {
        assert.equal(element("calculator-controls").disabled, true);
        assert.equal(element("unsupported-note").hidden, false);
      }, (fixture) => {
        if (missing) fixture.remove(id);
        else fixture.element(id).tagName = "DIV";
      });
    }
  }
});
