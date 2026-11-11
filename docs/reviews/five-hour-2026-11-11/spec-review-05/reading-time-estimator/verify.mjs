import { verifyCases } from "../verify-cases.mjs";

const defaults = { text: "", zhSilentRate: "400", zhSpeakRate: "240", enSilentRate: "200", enSpeakRate: "150" };
const maxima = { zhSilentRate: 2000, zhSpeakRate: 1200, enSilentRate: 1000, enSpeakRate: 600 };
const ideographs = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u{20000}-\u{2a6df}]/gu;
const latinTokens = /[A-Za-z0-9]/;
const fieldError = (code, field = null) => ({ ok: false, error: { code, field, row: null } });

function validate(input) {
  const keys = Object.keys(defaults);
  if (input === null || typeof input !== "object" || Object.getPrototypeOf(input) !== Object.prototype ||
      Reflect.ownKeys(input).length !== keys.length ||
      keys.some(key => typeof Object.getOwnPropertyDescriptor(input, key)?.value !== "string")) {
    return fieldError("SCHEMA");
  }
  for (const key of keys) {
    const text = input[key];
    if (text.length > (key === "text" ? 100_000 : 8)) return fieldError("INPUT_LIMIT", key);
    if (!text.isWellFormed()) return fieldError("UNICODE", key);
    if (text.length === 0) return fieldError("EMPTY", key);
    if (key === "text") continue;
    if (!/^(?:0|[1-9][0-9]*)$/.test(text)) return fieldError("INTEGER_FORMAT", key);
    if (Number(text) < 50 || Number(text) > maxima[key]) return fieldError("RANGE", key);
  }
  return null;
}

function seconds(cjk, latin, cjkRate, latinRate) {
  const han = BigInt(cjkRate), ascii = BigInt(latinRate);
  const denominator = han * ascii;
  const numerator = 60n * (BigInt(cjk) * ascii + BigInt(latin) * han);
  return Number((2n * numerator + denominator) / (2n * denominator));
}

function time(total) {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const remainder = String(total % 60).padStart(2, "0");
  return hours ? [hours, String(minutes).padStart(2, "0"), remainder].join(":") : [minutes, remainder].join(":");
}

function core(input) {
  const invalid = validate(input);
  if (invalid) return invalid;
  const cjkChars = Array.from(input.text.matchAll(ideographs)).length;
  const latinWords = input.text.split(/\p{White_Space}+/u).filter(token => latinTokens.test(token)).length;
  const silentSeconds = seconds(cjkChars, latinWords, input.zhSilentRate, input.enSilentRate);
  const speakSeconds = seconds(cjkChars, latinWords, input.zhSpeakRate, input.enSpeakRate);
  return { ok: true, result: { cjkChars, latinWords, silentSeconds, speakSeconds,
    silentDisplay: time(silentSeconds), speakDisplay: time(speakSeconds) } };
}

function controller() {
  let state = "empty";
  let runId = 0;
  let draft = defaults;
  let error;
  return {
    transition(nextState, nextDraft = draft) {
      state = nextState;
      draft = nextDraft;
      error = undefined;
      return ++runId;
    },
    deliver(id, result) {
      if (id !== runId || state !== "busy") return;
      state = result.ok ? "success" : "error";
      error = result.error;
    },
    snapshot(draftIncluded = false) {
      return { state, reportAvailable: state === "success",
        ...(draftIncluded ? { draft } : {}), ...(error ? { error } : {}) };
    }
  };
}

function derive(test) {
  const input = test.input;
  if (test.kind === "core") return core(input);
  const model = controller();
  const finish = draft => model.deliver(model.transition("busy", draft), core(draft));
  switch (test.id) {
    case "state-dirty-error": {
      finish(input.initial);
      const afterRun = model.snapshot();
      model.transition("dirty", input.edit);
      const afterEdit = model.snapshot();
      finish(input.edit);
      return { afterRun, afterEdit, afterRerun: model.snapshot() };
    }
    case "state-cancel-late": {
      const previous = model.transition("busy", input.draft);
      const whilePending = model.snapshot();
      model.transition("cancelled");
      const afterCancel = model.snapshot(true);
      model.deliver(previous, { ok: true, result: input.lateResult });
      const afterLateResult = model.snapshot();
      model.transition("empty", defaults);
      return { whilePending, afterCancel, afterLateResult, afterReset: model.snapshot(true) };
    }
    case "state-replace-late": {
      const previous = model.transition("busy", input.olderDraft);
      finish(input.newerDraft);
      const afterNewerResult = model.snapshot();
      model.deliver(previous, { ok: true, result: input.olderLateResult });
      return { afterNewerResult, afterOlderLateResult: model.snapshot() };
    }
    default: throw new Error("Unhandled fixture: " + test.id);
  }
}

function probe(id, text) {
  return { id, text, codePoints: Array.from(text, char => "U+" + char.codePointAt(0).toString(16).toUpperCase()),
    independentExpected: core({ ...defaults, text }) };
}

const extra = [
  probe("READ-01-japanese-kanji", "漢字かな"),
  probe("READ-02-author-glyph", "𐀀😀好"),
  probe("READ-02-fixture-glyph", "𠀀😀好"),
  probe("whitespace-property", "one\u0085two\uFEFFthree\u3000four"),
  probe("hybrid-token", "中文abc"),
  { id: "utf16-cap", literalConstruction: 'String.fromCodePoint(0x20000).repeat(50000)',
    utf16Units: 100000, independentExpected: core({ ...defaults, text: "𠀀".repeat(50000) }) }
];
verifyCases(derive, extra);
