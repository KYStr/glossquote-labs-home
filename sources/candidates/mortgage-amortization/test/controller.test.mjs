import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../public/js/app.mjs";
import { buildSchedule, formatCents } from "../public/js/core/mortgage.mjs";

// Minimal DOM shim: the controller is exercised through the same events
// a browser would fire. Real-browser rendering evidence stays NOT_RUN
// as recorded in VERIFICATION.md.

class FakeElement {
  constructor(id) {
    this.id = id;
    this.value = "";
    this.checked = false;
    this.hidden = false;
    this.disabled = false;
    this.href = "";
    this.download = "";
    this.type = "";
    this.clicked = false;
    this.removed = false;
    this.attrs = {};
    this.children = [];
    this.listeners = new Map();
    this._text = "";
  }
  set textContent(value) {
    this._text = String(value);
    this.children = [];
  }
  get textContent() {
    return this.children.length > 0
      ? this.children.map((child) => child.textContent).join("")
      : this._text;
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  dispatch(type) {
    for (const fn of this.listeners.get(type) ?? []) fn({ type, target: this });
  }
  click() {
    this.clicked = true;
    this.dispatch("click");
  }
  remove() {
    this.removed = true;
  }
  setAttribute(name, value) {
    this.attrs[name] = value;
  }
  getAttribute(name) {
    return this.attrs[name] ?? null;
  }
}

const IDS = [
  "method-annuity", "method-principal", "principal", "rate", "term-years",
  "grace-months", "tranche-enabled", "tranche-fields", "tranche-rate",
  "tranche-month", "prepay-month", "prepay-amount", "prepay-mode",
  "prepay-add", "prepay-list", "prepay-error", "err-principal", "err-rate",
  "err-term", "err-grace", "err-tranche-rate", "err-tranche-month",
  "err-prepay-month", "err-prepay-amount", "total-paid", "total-interest",
  "saved-row", "interest-saved", "yearly-body", "ledger-body",
  "state-message", "results-tables", "export-csv", "reset-button",
];

function makeDoc(lang = "zh-Hant") {
  const elements = new Map(IDS.map((id) => [id, new FakeElement(id)]));
  const doc = {
    documentElement: { lang },
    body: { appended: [], append(node) { this.appended.push(node); } },
    anchors: [],
    querySelector(selector) {
      return elements.get(selector.slice(1)) ?? null;
    },
    createElement(tag) {
      const node = new FakeElement(tag);
      if (tag === "a") doc.anchors.push(node);
      return node;
    },
  };
  const el = (id) => elements.get(id);
  el("method-annuity").checked = true;
  el("term-years").value = "20";
  el("grace-months").value = "0";
  el("prepay-mode").value = "reduce-term";
  el("tranche-fields").hidden = true;
  el("results-tables").hidden = true;
  el("saved-row").hidden = true;
  el("export-csv").disabled = true;
  return { doc, el };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function enterLoan(el, { principal = "360000", rate = "2.4", years = "1" } = {}) {
  el("principal").value = principal;
  el("principal").dispatch("input");
  el("rate").value = rate;
  el("rate").dispatch("input");
  el("term-years").value = years;
  el("term-years").dispatch("input");
  await sleep(250);
}

test("boot state is the instruction placeholder, never a sample schedule", () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  assert.equal(el("state-message").textContent, "輸入貸款金額與年利率後，這裡會顯示逐月攤還表。");
  assert.equal(el("results-tables").hidden, true);
  assert.equal(el("export-csv").disabled, true);
  const en = makeDoc("en");
  createApp(en.doc, {});
  assert.equal(en.el("state-message").textContent, "Enter the principal and annual rate to see the month-by-month schedule.");
});

test("a valid loan renders the ledger table, yearly roll-up and totals", async () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  await enterLoan(el);
  assert.equal(el("results-tables").hidden, false);
  assert.equal(el("export-csv").disabled, false);
  const rows = el("ledger-body").children;
  assert.equal(rows.length, 12);
  assert.deepEqual(
    rows[0].children.map((td) => td.textContent),
    ["1", "360,000.00", "30,391.43", "720.00", "29,671.43", "330,328.57"],
  );
  assert.deepEqual(
    rows[11].children.map((td) => td.textContent),
    ["12", "30,330.77", "30,391.43", "60.66", "30,330.77", "0.00"],
  );
  assert.equal(el("total-interest").textContent, "4,697.16");
  assert.equal(el("total-paid").textContent, "364,697.16");
  assert.equal(el("yearly-body").children.length, 1);
  assert.equal(el("saved-row").hidden, true);
});

test("invalid input replaces the schedule with a field-level error state", async () => {
  const { doc, el } = makeDoc();
  const app = createApp(doc, {});
  await enterLoan(el);
  assert.ok(app.getCurrent());
  el("principal").value = "abc";
  el("principal").dispatch("input");
  await sleep(250);
  assert.equal(app.getCurrent(), null);
  assert.equal(el("results-tables").hidden, true);
  assert.equal(el("export-csv").disabled, true);
  assert.equal(el("err-principal").hidden, false);
  assert.ok(el("err-principal").textContent.includes("格式不正確"));
  assert.equal(el("principal").getAttribute("aria-invalid"), "true");
});

test("grace beyond the cap is a field error naming the limit", async () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  await enterLoan(el, { years: "1" }); // 12 months -> grace cap 6
  el("grace-months").value = "7";
  el("grace-months").dispatch("input");
  await sleep(250);
  assert.equal(el("err-grace").hidden, false);
  assert.ok(el("err-grace").textContent.includes("上限為 6 個月"));
  assert.equal(el("results-tables").hidden, true);
});

test("prepayment flow: add shows interest saved; delete restores the baseline view", async () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  await enterLoan(el);
  el("prepay-month").value = "1";
  el("prepay-amount").value = "20000";
  el("prepay-mode").value = "reduce-payment";
  el("prepay-add").click();
  await sleep(10);
  assert.equal(el("prepay-list").children.length, 1);
  const expected = buildSchedule({
    principalCents: 36_000_000, rateScaled: 24_000, termMonths: 12, graceMonths: 0,
    method: "annuity", tranche: null,
    prepayments: [{ month: 1, amountCents: 2_000_000, mode: "reduce-payment" }],
  });
  assert.equal(el("saved-row").hidden, false);
  assert.equal(el("interest-saved").textContent, formatCents(expected.interestSaved));
  assert.equal(el("total-interest").textContent, formatCents(expected.totalInterest));
  // delete the event through its row button
  const deleteButton = el("prepay-list").children[0].children[1];
  deleteButton.click();
  await sleep(10);
  assert.equal(el("prepay-list").children.length, 0);
  assert.equal(el("saved-row").hidden, true);
  assert.equal(el("total-interest").textContent, "4,697.16");
});

test("an over-balance prepayment surfaces the engine error with the maximum", async () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  await enterLoan(el);
  el("prepay-month").value = "1";
  el("prepay-amount").value = "99999999";
  el("prepay-add").click();
  await sleep(10);
  assert.equal(el("prepay-error").hidden, false);
  assert.ok(el("prepay-error").textContent.includes("超過該月還款後的餘額"));
  assert.equal(el("results-tables").hidden, true);
});

test("method switch re-renders under equal principal", async () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  await enterLoan(el);
  el("method-principal").checked = true;
  el("method-principal").dispatch("change");
  const firstRow = el("ledger-body").children[0];
  assert.equal(firstRow.children[4].textContent, "30,000.00"); // 360,000 / 12
});

test("CSV export downloads the displayed ledger with a date-only filename", async () => {
  const { doc, el } = makeDoc();
  const blobs = [];
  createApp(doc, {
    now: () => new Date(2026, 10, 2),
    createObjectURL: (blob) => {
      blobs.push(blob);
      return "blob:stub";
    },
    revokeObjectURL: () => {},
  });
  await enterLoan(el);
  el("export-csv").click();
  assert.equal(doc.anchors.at(-1).download, "amortization-20261102.csv");
  const text = await blobs.at(-1).text();
  assert.ok(text.startsWith("month,opening,payment,interest,principal,closing\n"));
  assert.ok(text.includes("1,360000.00,30391.43,720.00,29671.43,330328.57\n"));
  assert.equal(text.trimEnd().split("\n").length, 13); // header + 12 rows, no extra content
});

test("reset returns to the initial placeholder state", async () => {
  const { doc, el } = makeDoc();
  createApp(doc, {});
  await enterLoan(el);
  el("reset-button").click();
  assert.equal(el("principal").value, "");
  assert.equal(el("term-years").value, "20");
  assert.equal(el("results-tables").hidden, true);
  assert.equal(el("state-message").textContent, "輸入貸款金額與年利率後，這裡會顯示逐月攤還表。");
});
