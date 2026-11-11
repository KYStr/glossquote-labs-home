import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const [candidatePath, originalPath] = process.argv.slice(2);
assert(candidatePath && originalPath, "usage: node verify.mjs <candidate fixtures.json> <original fixtures.json>");
const read = path => JSON.parse(readFileSync(path, "utf8"));
const candidate = read(candidatePath);
const original = read(originalPath);

const price = { digits: 2, limit: 9, low: 1n, high: 99_999_999n, format: "DECIMAL_FORMAT" };
const quantity = { digits: 0, limit: 6, low: 1n, high: 999_999n, format: "INTEGER_FORMAT" };
const unit = { enum: ["share", "lot"], limit: 8 };
const rates = { digits: 4, limit: 8, low: 0n, high: 10_000n, format: "DECIMAL_FORMAT" };
const fields = {
  buyPrice: price,
  buyQty: quantity,
  buyUnit: unit,
  sellPrice: price,
  sellQty: quantity,
  sellUnit: unit,
  feeRatePct: rates,
  feeDiscount: { digits: 3, limit: 5, low: 1n, high: 1_000n, format: "DECIMAL_FORMAT" },
  minFeeTwd: { digits: 0, limit: 5, low: 0n, high: 99_999n, format: "INTEGER_FORMAT" },
  taxMode: { enum: ["standard", "day"], limit: 8 },
  taxRatePct: rates,
  dayTradeConfirmed: { boolean: true }
};
const defaultDraft = {
  buyPrice: "100", buyQty: "1000", buyUnit: "share",
  sellPrice: "110", sellQty: "1000", sellUnit: "share",
  feeRatePct: "0.1425", feeDiscount: "1", minFeeTwd: "20",
  taxMode: "standard", taxRatePct: "0.3", dayTradeConfirmed: false
};
const currency = ["buyGross", "buyFee", "buyTotal", "sellGross", "sellFee",
  "sellTax", "sellNet", "costBasisSold", "netProfitLoss", "breakevenPrice"];
const legFields = ["buyPrice", "buyQty", "buyUnit", "sellPrice", "sellQty", "sellUnit"];
const names = Object.keys(fields);
const fail = (code, field = null) => ({ ok: false, error: { code, field, row: null } });
const min = (a, b) => a < b ? a : b;
const max = (a, b) => a > b ? a : b;
const D = 1_000_000_000n;
const TWD = 100n;

function floor(n, d) {
  return n < 0n && n % d !== 0n ? n / d - 1n : n / d;
}

function halfUp(n, d) {
  return floor(2n * n + d, 2n * d);
}

function centsText(cents) {
  const negative = cents < 0n;
  const magnitude = negative ? -cents : cents;
  return (negative ? "-" : "") + magnitude / TWD + "." + String(magnitude % TWD).padStart(2, "0");
}

function parseDraft(input) {
  if (input === null || typeof input !== "object" ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) return fail("SCHEMA");
  const keys = Reflect.ownKeys(input);
  if (keys.length !== names.length || keys.some(key => !Object.hasOwn(fields, key))) return fail("SCHEMA");
  const own = Object.getOwnPropertyDescriptors(input);
  if (names.some(name => !Object.hasOwn(own[name], "value") ||
      typeof own[name].value !== (fields[name].boolean ? "boolean" : "string"))) return fail("SCHEMA");

  const values = {};
  for (const [name, rule] of Object.entries(fields)) {
    const value = own[name].value;
    if (rule.boolean) { values[name] = value; continue; }
    if (value.length > rule.limit) return fail("INPUT_LIMIT", name);
    if (!value.isWellFormed()) return fail("UNICODE", name);
    if (value === "") return fail("EMPTY", name);
    if (rule.enum) {
      if (!rule.enum.includes(value)) return fail("ENUM", name);
      values[name] = value;
      continue;
    }
    const parts = /^([0-9]+)(?:\.([0-9]+))?$/.exec(value);
    if (!parts || (parts[2]?.length ?? 0) > rule.digits) return fail(rule.format, name);
    const fraction = (parts[2] ?? "").padEnd(rule.digits, "0");
    const integer = BigInt(parts[1] + fraction);
    if (integer < rule.low || integer > rule.high) return fail("RANGE", name);
    values[name] = integer;
  }
  const shares = (quantity, unit) => quantity * (unit === "lot" ? 1_000n : 1n);
  const bought = shares(values.buyQty, values.buyUnit);
  const sold = shares(values.sellQty, values.sellUnit);
  if (sold > bought) return fail("SELL_EXCEEDS_BUY", "sellQty");
  if (values.taxMode === "day") {
    if (bought % 1_000n !== 0n) return fail("DAY_TRADE_ROUND_LOT_REQUIRED", "buyQty");
    if (sold % 1_000n !== 0n) return fail("DAY_TRADE_ROUND_LOT_REQUIRED", "sellQty");
    if (!values.dayTradeConfirmed) return fail("DAY_TRADE_CONFIRMATION_REQUIRED", "dayTradeConfirmed");
  }
  return { ok: true, values, bought, sold };
}

// Bisection applies only to the increasing unrounded envelope.
// The rounded net can decrease and is examined in ascending cent order.
function firstIncreasingCrossing(atOrAbove) {
  let left = 0n;
  let right = 1n;
  while (!atOrAbove(right)) right *= 2n;
  while (right - left > 1n) {
    const mid = (right + left) / 2n;
    if (atOrAbove(mid)) right = mid;
    else left = mid;
  }
  return right;
}

function evaluate(input, exhaustThrough = 0n) {
  const parsed = parseDraft(input);
  if (!parsed.ok) return { output: parsed };
  const { values: p, bought, sold } = parsed;
  const a = p.feeRatePct * p.feeDiscount;
  const b = p.taxMode === "day" ? 1_500_000n : p.taxRatePct * 1_000n;
  const fee = gross => max(p.minFeeTwd, halfUp(gross * a, D * TWD)) * TWD;
  const tax = gross => halfUp(gross * b, D * TWD) * TWD;
  const netAt = tick => sold * tick - fee(sold * tick) - tax(sold * tick);
  const buyGross = p.buyPrice * bought;
  const buyFee = fee(buyGross);
  const buyTotal = buyGross + buyFee;
  const sellGross = p.sellPrice * sold;
  const sellFee = fee(sellGross);
  const sellTax = tax(sellGross);
  const sellNet = sellGross - sellFee - sellTax;
  const costNumerator = buyTotal * sold;
  const profitNumerator = sellNet * bought - costNumerator;

  const rawScaled = tick => {
    const gross = sold * tick;
    return (D - b) * gross - max(p.minFeeTwd * TWD * D, gross * a);
  };
  const reachesEnvelope = (tick, margin) =>
    rawScaled(tick) * bought >= (costNumerator + margin * bought) * D;
  const lo = firstIncreasingCrossing(tick => reachesEnvelope(tick, -TWD));
  const hi = firstIncreasingCrossing(tick => reachesEnvelope(tick, TWD));
  assert(lo <= hi);
  assert(lo === 1n || !reachesEnvelope(lo - 1n, -TWD));
  assert(hi === 1n || !reachesEnvelope(hi - 1n, TWD));
  assert(reachesEnvelope(lo, -TWD));
  assert(reachesEnvelope(hi, TWD));
  assert(hi - lo + 1n <= 206n);
  const meets = tick => netAt(tick) * bought >= costNumerator;
  assert(meets(hi));

  let first = lo;
  while (!meets(first)) first += 1n;
  assert(first <= hi);
  let fullPrefixTicks = 0;
  if (first <= exhaustThrough) {
    for (let tick = 1n; tick <= first; tick += 1n) {
      assert.equal(meets(tick), tick === first);
      fullPrefixTicks += 1;
    }
  }
  const result = {
    buyShares: Number(bought), sellShares: Number(sold), remainingShares: Number(bought - sold),
    buyGross: centsText(buyGross), buyFee: centsText(buyFee), buyTotal: centsText(buyTotal),
    sellGross: centsText(sellGross), sellFee: centsText(sellFee), sellTax: centsText(sellTax),
    sellNet: centsText(sellNet), costBasisSold: centsText(halfUp(costNumerator, bought)),
    netProfitLoss: centsText(halfUp(profitNumerator, bought * TWD) * TWD),
    breakevenPrice: centsText(first), breakevenPriceIsOrderQuote: false,
    effectiveTaxRatePct: Number(b) / 10_000_000,
    returnPct: Number(halfUp(profitNumerator * 10_000n, costNumerator)) / 100
  };
  for (const name of currency) {
    assert.match(result[name], /^-?(0|[1-9][0-9]*)\.[0-9]{2}$/);
    assert.notEqual(result[name], "-0.00");
  }
  assert.equal(Object.values(result).filter(value => typeof value === "string").length, currency.length);
  return { output: { ok: true, result }, netAt, fullPrefixTicks, band: [lo, hi, first].map(Number) };
}

class State {
  state = "empty";
  draft = { ...defaultDraft };
  generation = 0;
  settled = null;

  start(draft = this.draft) {
    this.draft = { ...draft };
    this.state = "busy";
    this.settled = null;
    this.generation += 1;
    return this.generation;
  }

  edit(changes) {
    const next = { ...this.draft, ...changes };
    if (next.taxMode !== "day" || legFields.some(key => next[key] !== this.draft[key])) {
      next.dayTradeConfirmed = false;
    }
    this.draft = next;
    this.state = "dirty";
    this.settled = null;
    this.generation += 1;
  }

  receive(generation, output) {
    if (this.state !== "busy" || generation !== this.generation) return;
    this.settled = output;
    this.state = output.ok ? "success" : "error";
  }

  cancel() {
    this.state = "cancelled";
    this.settled = null;
    this.generation += 1;
  }

  reset() {
    this.state = "empty";
    this.draft = { ...defaultDraft };
    this.settled = null;
    this.generation += 1;
  }

  observe(withDraft = false) {
    return {
      state: this.state,
      reportAvailable: this.state === "success",
      ...(withDraft && { draft: this.draft }),
      ...(this.state === "error" && { error: this.settled.error })
    };
  }

  run(draft) {
    const generation = this.start(draft);
    this.receive(generation, evaluate(this.draft).output);
  }
}

function controllerCase(id, input) {
  const state = new State();
  if (id === "state-dirty-error") {
    state.run(input.initial);
    const afterRun = state.observe();
    state.edit(input.edit);
    const afterEdit = state.observe();
    state.run();
    return { afterRun, afterEdit, afterRerun: state.observe() };
  }
  if (id === "state-cancel-late") {
    const generation = state.start(input.draft);
    const whilePending = state.observe();
    const late = evaluate(input.draft).output;
    assert.deepEqual(late.result, input.lateResult);
    state.cancel();
    const afterCancel = state.observe(true);
    state.receive(generation, late);
    const afterLateResult = state.observe();
    state.reset();
    return { whilePending, afterCancel, afterLateResult, afterReset: state.observe(true) };
  }
  if (id === "state-replace-late") {
    const older = state.start(input.olderDraft);
    const newer = state.start(input.newerDraft);
    const late = evaluate(input.olderDraft).output;
    assert.deepEqual(late.result, input.olderLateResult);
    state.receive(newer, evaluate(input.newerDraft).output);
    const afterNewerResult = state.observe();
    state.receive(older, late);
    return { afterNewerResult, afterOlderLateResult: state.observe() };
  }
  assert.equal(id, "state-day-confirmation-invalidated");
  state.run(input.initial);
  const afterRun = state.observe();
  state.edit(input.edits);
  const afterEdit = state.observe(true);
  state.run();
  return { afterRun, afterEdit, afterRerun: state.observe() };
}

function migrateOriginal(value) {
  if (Array.isArray(value)) return value.map(migrateOriginal);
  if (value === null || typeof value !== "object") return value;
  if (Object.hasOwn(value, "taxMode") && Object.hasOwn(value, "buyPrice")) {
    return { ...value, dayTradeConfirmed: value.taxMode === "day" };
  }
  if (Object.hasOwn(value, "breakevenPrice")) {
    return {
      ...value,
      ...Object.fromEntries(currency.map(name => [name, value[name].toFixed(2)])),
      breakevenPriceIsOrderQuote: false
    };
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, migrateOriginal(child)]));
}

const asciiSorted = value => {
  if (Array.isArray(value)) return value.map(asciiSorted);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, asciiSorted(value[key])]));
};

assert.equal(candidate.schemaVersion, 2);
assert.equal(original.schemaVersion, 1);
for (const key of ["specId", "slug", "productChecks"]) assert.equal(candidate[key], original[key]);
const byId = new Map(candidate.cases.map(test => [test.id, test]));
assert.equal(byId.size, candidate.cases.length);

const preserved = [];
const purposeEdits = [];
for (const prior of original.cases) {
  const changed = byId.get(prior.id);
  assert(changed);
  assert.equal(changed.kind, prior.kind);
  assert.deepEqual(changed.input, migrateOriginal(prior.input), prior.id + " migrated input");
  assert.deepEqual(changed.expected, migrateOriginal(prior.expected), prior.id + " migrated expected");
  preserved.push(prior.id);
  if (prior.purpose !== changed.purpose) purposeEdits.push(prior.id);
}

const core = [];
const controller = [];
for (const { id, input, expected, kind } of candidate.cases) {
  if (kind === "core") {
    const { output, band, fullPrefixTicks } = evaluate(input, 150_000n);
    assert.deepEqual(output, expected, id);
    core.push({ id, ...(output.ok ? { band, fullPrefixTicks } : output.error) });
    continue;
  }
  assert.equal(kind, "controller");
  assert.deepEqual(controllerCase(id, input), expected, id);
  controller.push({ id, checkpoints: Object.keys(expected).length });
}
assert.equal(core.length, 29);
assert.equal(controller.length, 4);

const priceProbes = [];
for (const counter of [candidate.nonmonotonicCounterexample, candidate.tickCounterexample]) {
  const { output, netAt } = evaluate(byId.get(counter.caseId).input);
  assert.equal(output.result.breakevenPrice, counter.expectedBreakevenPrice);
  assert.equal(output.result.costBasisSold, counter.expectedCostBasisSold);
  for (const [quoted, expectedNet] of Object.entries(counter.netBySellPrice)) {
    const [whole, fraction] = quoted.split(".");
    const actual = centsText(netAt(BigInt(whole + fraction)));
    assert.equal(actual, expectedNet, counter.caseId + "@" + quoted);
    priceProbes.push({ caseId: counter.caseId, price: quoted, modelNet: actual });
  }
}
assert.equal(priceProbes.length, 8);

const reports = [];
for (const sample of candidate.reportSamples) {
  const { output } = evaluate(byId.get(sample.caseId).input);
  const bytes = Buffer.from(JSON.stringify(asciiSorted(output.result)) + "\n", "utf8");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  assert.equal(sample.name, "stock-profit-report.json");
  assert.deepEqual(bytes, Buffer.from(sample.text, "utf8"));
  assert.equal(bytes.length, sample.bytes);
  assert.equal(sha256, sample.sha256);
  reports.push({ id: sample.caseId, name: sample.name, bytes: bytes.length, sha256 });
}
assert.equal(reports.length, 2);

const extra = [
  ["schema-before-values", { ...defaultDraft, buyPrice: "", dayTradeConfirmed: 1 }, fail("SCHEMA")],
  ["input-limit-before-unicode", { ...defaultDraft, buyPrice: "\ud800012345678" }, fail("INPUT_LIMIT", "buyPrice")],
  ["unicode-before-format", { ...defaultDraft, buyPrice: "\ud800" }, fail("UNICODE", "buyPrice")],
  ["invalid-sell-qty-before-eligibility", { ...defaultDraft, taxMode: "day", sellQty: "0" }, fail("RANGE", "sellQty")],
  ["unknown-field", { ...defaultDraft, extra: "" }, fail("SCHEMA")],
  ["two-ineligible-legs", { ...defaultDraft, taxMode: "day", buyQty: "1001", sellQty: "999" },
    fail("DAY_TRADE_ROUND_LOT_REQUIRED", "buyQty")],
  ["sell-1001-share-ineligible", { ...defaultDraft, taxMode: "day", buyQty: "2", buyUnit: "lot", sellQty: "1001" },
    fail("DAY_TRADE_ROUND_LOT_REQUIRED", "sellQty")]
];
for (const [id, input, expected] of extra) assert.deepEqual(evaluate(input).output, expected, id);
const standardChecked = evaluate({ ...defaultDraft, dayTradeConfirmed: true }).output;
assert.deepEqual(standardChecked, evaluate(defaultDraft).output);
let readAccessor = false;
const getter = { ...defaultDraft, get dayTradeConfirmed() { readAccessor = true; return true; } };
assert.deepEqual(evaluate(getter).output, fail("SCHEMA"));
assert.equal(readAccessor, false);
const lossTie = evaluate({
  ...defaultDraft, buyPrice: "4.50", buyQty: "2", sellPrice: "1.00", sellQty: "1",
  feeRatePct: "0", minFeeTwd: "2", taxRatePct: "0"
}).output.result;
assert.equal(lossTie.costBasisSold, "5.50");
assert.equal(lossTie.sellNet, "-1.00");
assert.equal(lossTie.netProfitLoss, "-6.00");
const rateTie = evaluate({
  ...defaultDraft, buyPrice: "200.00", buyQty: "1", sellPrice: "199.99", sellQty: "1",
  feeRatePct: "0", minFeeTwd: "0", taxRatePct: "0"
}).output.result;
assert.equal(rateTie.netProfitLoss, "0.00");
assert.equal(rateTie.returnPct, 0);

let sweepCases = 0;
let sweepFullTicks = 0;
let sweepFullCases = 0;
let largestBand = 0;
for (const buyPrice of ["0.01", "0.03", "1.37", "49", "50", "999999.99"]) {
  for (const [buyQty, sellQty, buyUnit] of [["1", "1", "share"], ["3", "2", "share"], ["999999", "1000", "lot"]]) {
    for (const minFeeTwd of ["0", "1", "20", "99999"]) {
      for (const [feeRatePct, feeDiscount, taxRatePct] of [
        ["0", "1", "0"], ["0.1425", "0.6", "0.3"], ["1", "1", "1"], ["1", "0.001", "1"]
      ]) {
        const { output, band, fullPrefixTicks } = evaluate({
          ...defaultDraft, buyPrice, buyQty, buyUnit, sellQty, minFeeTwd, feeRatePct, feeDiscount, taxRatePct
        }, 8_000n);
        assert(output.ok);
        sweepCases += 1;
        sweepFullCases += Number(fullPrefixTicks > 0);
        sweepFullTicks += fullPrefixTicks;
        largestBand = Math.max(largestBand, band[1] - band[0] + 1);
      }
    }
  }
}

console.log(JSON.stringify({
  status: "PASS",
  scope: "fixed document literals and reviewer reference model",
  core,
  controller,
  migratedOriginal: { count: preserved.length, ids: preserved, purposeEdits },
  priceProbes,
  reports,
  additionalProbes: [...extra.map(([id]) => id), "standard-ignores-confirmation", "schema-accessor-not-read",
    "exact-negative-half-yuan", "exact-negative-half-basis-point"],
  sweeps: { cases: sweepCases, fromFirstCentCases: sweepFullCases, fromFirstCentTicks: sweepFullTicks, largestBand },
  productChecks: "NOT_RUN"
}, null, 2));
