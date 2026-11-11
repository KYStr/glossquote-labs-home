import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { verifyCases } from "../verify-cases.mjs";

const defaults = { names: "", mode: "count", groupCount: "3", groupSize: "4", seed: "" };
const modulus = 1n << 32n;
const mask = modulus - 1n;
const fail = (code, field = null, row = null) => ({ ok: false, error: { code, field, row } });

function validate(input) {
  const keys = Object.keys(defaults);
  if (input === null || typeof input !== "object" || Object.getPrototypeOf(input) !== Object.prototype ||
      Reflect.ownKeys(input).length !== keys.length ||
      keys.some(key => typeof Object.getOwnPropertyDescriptor(input, key)?.value !== "string")) return fail("SCHEMA");
  if (input.names.length > 32_768) return fail("INPUT_LIMIT", "names");
  const people = [];
  for (const [index, raw] of input.names.split("\n").entries()) {
    const name = raw.replace(/^[ \t\u3000]+|[ \t\u3000]+$/g, "");
    if (!name.length) continue;
    if (name.length > 40) return fail("INPUT_LIMIT", "names", index + 1);
    if (!name.isWellFormed()) return fail("UNICODE", "names", index + 1);
    people.push({ name, sourceRow: index + 1 });
  }
  if (!people.length) return fail("EMPTY", "names");
  if (people.length > 500) return fail("ROW_LIMIT", "names", people[500].sourceRow);
  const selected = input.mode === "count" ? "groupCount" : input.mode === "size" ? "groupSize" : null;
  if (!selected) return fail("ENUM", "mode");
  for (const key of ["groupCount", "groupSize", "seed"]) {
    const raw = input[key];
    const seed = key === "seed";
    if (raw.length > (seed ? 10 : 3)) return fail("INPUT_LIMIT", key);
    if (key !== selected && !seed) continue;
    if (!raw.length) return fail("EMPTY", key);
    if (!/^(?:0|[1-9][0-9]*)$/.test(raw)) return fail("INTEGER_FORMAT", key);
    const n = Number(raw);
    if (seed ? n > 4_294_967_295 : n < 1 || n > 500) return fail("RANGE", key);
  }
  const n = people.length;
  const k = input.mode === "count" ? Number(input.groupCount) : Math.ceil(n / Number(input.groupSize));
  if (k > n) return fail("RANGE", "groupCount");
  return { ok: true, people, groupCount: k, seed: Number(input.seed) };
}

function drawUint32(seed) {
  let state = BigInt(seed);
  return () => {
    state = (state + 0x6D2B79F5n) & mask;
    let value = ((state ^ (state >> 15n)) * (state | 1n)) & mask;
    const inner = ((value ^ (value >> 7n)) * (value | 61n)) & mask;
    value ^= (value + inner) & mask;
    return (value ^ (value >> 14n)) & mask;
  };
}

function shuffle(people, seed) {
  const deck = people.slice();
  const draw = drawUint32(seed);
  for (let i = 0; i < deck.length; i++) {
    const j = i + Number(draw() * BigInt(deck.length - i) / modulus);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function group(input, withRows = false) {
  const parsed = validate(input);
  if (!parsed.ok) return parsed;
  const { groupCount, seed, people } = parsed;
  const names = shuffle(people, seed);
  const groups = Array.from({ length: groupCount }, (_, i) => {
    const members = [];
    for (let index = i; index < people.length; index += groupCount) {
      const person = names[index];
      members.push(withRows ? person : person.name);
    }
    return { number: i + 1, size: members.length, members };
  });
  return { ok: true, result: { seed, mode: input.mode, groupCount, totalNames: people.length, groups } };
}

function controller() {
  let token;
  let current = { state: "empty", reportAvailable: false };
  return {
    transition(state) {
      token = state === "busy" ? Symbol("request") : undefined;
      current = { state, reportAvailable: false };
      return token;
    },
    deliver(id, result) {
      if (id !== token || current.state !== "busy") return;
      current = result.ok ? { state: "success", reportAvailable: true, result: result.result }
        : { state: "error", reportAvailable: false, error: result.error };
    },
    snapshot() { return current; }
  };
}

function derive(test) {
  const input = test.input;
  if (test.kind === "core") return group(input);
  const ui = controller();
  const execute = draft => {
    ui.deliver(ui.transition("busy"), group(draft));
    return ui.snapshot();
  };
  if (test.id === "state-unseeded-fill") {
    const draft = { ...input.draft, seed: input.draft.seed || input.fillSeed };
    const afterRun = execute(draft);
    const { result: rerunResult, ...rerun } = execute(draft);
    return { afterFill: { seedField: draft.seed }, afterRun,
      afterRerun: { ...rerun, identicalResult: isDeepStrictEqual(afterRun.result, rerunResult) } };
  }
  if (test.id === "state-dirty-error") {
    const { result, ...afterRun } = execute(input.initial);
    ui.transition("dirty");
    const afterEdit = ui.snapshot();
    return { afterRun, afterEdit, afterRerun: execute(input.edit) };
  }
  if (test.id === "state-cancel-late") {
    const pending = ui.transition("busy");
    const whilePending = ui.snapshot();
    ui.transition("cancelled");
    const afterCancel = { ...ui.snapshot(), draft: input.draft };
    ui.deliver(pending, { ok: true, result: input.lateResult });
    const afterLateResult = ui.snapshot();
    ui.transition("empty");
    return { whilePending, afterCancel, afterLateResult, afterReset: { ...ui.snapshot(), draft: defaults } };
  }
  throw new Error("Unhandled fixture: " + test.id);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}
function encodeText(result, zh) {
  return result.groups.map(({ number, size, members }) => {
    const title = zh ? "第 " + number + " 組（" + size + " 人）"
      : "Group " + number + " (" + size + (size === 1 ? " member)" : " members)");
    return [title, ...members].join("\n");
  }).join("\n\n");
}
function manifest(text) {
  return { utf8Bytes: Buffer.byteLength(text), sha256: createHash("sha256").update(text).digest("hex"), text };
}

const duplicateInput = { names: " 小明 \n\n小華\n小明\n　\n小美", mode: "count", groupCount: "2", groupSize: "", seed: "42" };
const settingsInput = { names: "A\nB\nC\nD\nE", mode: "count", groupCount: "2", groupSize: "", seed: "42" };
const sizeInput = { names: "A\nB\nC\nD\nE\nF\nG\nH\nI\nJ\nK", mode: "size", groupCount: "", groupSize: "5", seed: "42" };
const exportInput = { names: "甲\n乙\n丙", mode: "count", groupCount: "2", groupSize: "", seed: "42" };
const exportResult = group(exportInput).result;
const draws = drawUint32(42);
const extra = [
  { id: "mulberry32-seed42", uint32Numerators: Array.from({length: 8}, () => Number(draws())) },
  { id: "GRP-02-duplicates", input: duplicateInput, independentExpected: group(duplicateInput),
    sourceRowsOnlyForReview: group(duplicateInput, true).result.groups },
  { id: "GRP-03-replay-settings", input: settingsInput,
    independentExpected: group(settingsInput), alternateInput: { ...settingsInput, groupCount: "3" },
    alternateExpected: group({ ...settingsInput, groupCount: "3" }) },
  { id: "GRP-03-size-cap", input: sizeInput, independentExpected: group(sizeInput) },
  { id: "derived-export-bytes", input: exportInput,
    json: manifest(JSON.stringify(stable(exportResult)) + "\n"),
    zhText: manifest(encodeText(exportResult,true)), enText: manifest(encodeText(exportResult,false)) }
];
verifyCases(derive, extra);
