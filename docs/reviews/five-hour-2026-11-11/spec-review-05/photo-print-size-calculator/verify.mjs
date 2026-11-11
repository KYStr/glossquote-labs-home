import { verifyCases } from "../verify-cases.mjs";

const defaults = { mode: "max", pixelsW: "6000", pixelsH: "4000", dpi: "300", sizeId: "4x6" };
// Sides measured in tenths of a millimeter. Both nominal inch and ISO sizes are exact integers.
const sizes = new Map([
  ["3x5", [5n * 254n, 3n * 254n]], ["4x6", [6n * 254n, 4n * 254n]],
  ["5x7", [7n * 254n, 5n * 254n]], ["6x8", [8n * 254n, 6n * 254n]],
  ["8x10", [10n * 254n, 8n * 254n]], ["10x12", [12n * 254n, 10n * 254n]],
  ["A5", [2100n, 1480n]], ["A4", [2970n, 2100n]], ["A3", [4200n, 2970n]]
]);
const active = {
  max: ["mode", "pixelsW", "pixelsH", "dpi"],
  need: ["mode", "dpi", "sizeId"],
  check: ["mode", "pixelsW", "pixelsH", "sizeId"]
};

const fail = (code, field = null) => ({ ok: false, error: { code, field, row: null } });
const success = result => ({ ok: true, result });
const ceil = (n, d) => (n + d - 1n) / d;
function round(n, d, places) {
  const multiplier = 10n ** BigInt(places);
  const shifted = n * multiplier;
  const integral = shifted / d;
  const rounded = shifted % d * 2n < d ? integral : integral + 1n;
  return Number(rounded) / Number(multiplier);
}
function dpi100(raw) {
  const [integer, fraction = ""] = raw.split(".");
  return BigInt(integer) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function validate(input) {
  const keys = Object.keys(defaults);
  if (input === null || typeof input !== "object" || Object.getPrototypeOf(input) !== Object.prototype ||
      Reflect.ownKeys(input).length !== keys.length ||
      keys.some(key => typeof Object.getOwnPropertyDescriptor(input, key)?.value !== "string")) return fail("SCHEMA");
  for (const key of keys) {
    const raw = input[key];
    if (raw.length > 8) return fail("INPUT_LIMIT", key);
    if (key !== "mode" && !active[input.mode].includes(key)) continue;
    if (!raw.isWellFormed()) return fail("UNICODE", key);
    if (raw.length === 0) return fail("EMPTY", key);
    if (key === "mode" && !Object.hasOwn(active, raw)) return fail("ENUM", key);
    if (key === "sizeId" && !sizes.has(raw)) return fail("ENUM", key);
    if (key.startsWith("pixels")) {
      if (!/^(?:0|[1-9][0-9]*)$/.test(raw)) return fail("INTEGER_FORMAT", key);
      if (Number(raw) < 1 || Number(raw) > 200_000) return fail("RANGE", key);
    }
    if (key === "dpi") {
      if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(raw)) return fail("DECIMAL_FORMAT", key);
      const target = dpi100(raw);
      if (target < 100n || target > 120_000n) return fail("RANGE", key);
    }
  }
  return null;
}

function quality(value) {
  if (value >= 300) return "excellent";
  if (value >= 200) return "good";
  return value >= 150 ? "acceptable" : "poor";
}

function core(input) {
  const invalid = validate(input);
  if (invalid) return invalid;
  const { mode, sizeId } = input;
  const target100 = mode === "check" ? null : dpi100(input.dpi);
  const dpi = target100 === null ? null : Number(target100) / 100;
  const required = side => ceil(side * target100, 25_400n);
  if (mode === "need") {
    const [long, short] = sizes.get(sizeId);
    const longPx = required(long), shortPx = required(short);
    return success({ mode, sizeId, dpi, sizeLongIn: round(long, 254n, 2), sizeShortIn: round(short, 254n, 2),
      sizeLongCm: round(long, 100n, 1), sizeShortCm: round(short, 100n, 1),
      requiredLongPx: Number(longPx), requiredShortPx: Number(shortPx),
      megapixels: round(longPx * shortPx, 1_000_000n, 2) });
  }
  const width = BigInt(input.pixelsW), height = BigInt(input.pixelsH);
  const [imageLong, imageShort] = width >= height ? [width, height] : [height, width];
  const pixels = { pixelsW: Number(width), pixelsH: Number(height) };
  const density = ([long, short]) => {
    const longNum = imageLong * 254n, shortNum = imageShort * 254n;
    const limitedByLong = longNum * short <= shortNum * long;
    const effectiveDpi = limitedByLong ? round(longNum, long, 1) : round(shortNum, short, 1);
    return { dpiLong: round(longNum, long, 1), dpiShort: round(shortNum, short, 1),
      effectiveDpi, quality: quality(effectiveDpi) };
  };
  if (mode === "check") return success({ mode, ...pixels, sizeId, ...density(sizes.get(sizeId)) });
  let bestFitSizeId = null, bestArea = 0n;
  const rows = Array.from(sizes.entries(), ([id, size]) => {
    const [long, short] = size;
    const fits = required(long) <= imageLong && required(short) <= imageShort;
    if (fits && long * short > bestArea) {
      bestArea = long * short;
      bestFitSizeId = id;
    }
    return { sizeId: id, ...density(size), fits };
  });
  return success({ mode, ...pixels, dpi, maxWidthIn: round(width * 100n, target100, 2),
    maxHeightIn: round(height * 100n, target100, 2), maxWidthCm: round(width * 254n, target100, 1),
    maxHeightCm: round(height * 254n, target100, 1), bestFitSizeId, sizes: rows });
}

function derive(test) {
  const input = test.input;
  if (test.kind === "core") return core(input);
  let current = { state: "empty", reportAvailable: false };
  let token;
  const start = () => {
    current = { state: "busy", reportAvailable: false };
    token = Symbol("job");
    return token;
  };
  const deliver = (id, output) => {
    if (id !== token || current.state !== "busy") return;
    current = output.ok ? { state: "success", reportAvailable: true }
      : { state: "error", reportAvailable: false, error: output.error };
  };
  const execute = draft => deliver(start(), core(draft));
  if (test.id === "state-dirty-error") {
    execute(input.initial);
    const afterRun = current;
    token = undefined;
    current = { state: "dirty", reportAvailable: false };
    const afterEdit = current;
    execute(input.edit);
    return { afterRun, afterEdit, afterRerun: current };
  }
  if (test.id === "state-cancel-late") {
    const pending = start();
    const whilePending = current;
    token = undefined;
    current = { state: "cancelled", reportAvailable: false };
    const afterCancel = { ...current, draft: input.draft };
    deliver(pending, { ok: true, result: input.lateResult });
    return { whilePending, afterCancel, afterLateResult: current,
      afterReset: { state: "empty", reportAvailable: false, draft: defaults } };
  }
  if (test.id === "state-replace-late") {
    const pending = start();
    execute(input.newerDraft);
    const afterNewerResult = current;
    deliver(pending, { ok: true, result: input.olderLateResult });
    return { afterNewerResult, afterOlderLateResult: current };
  }
  throw new Error("Unhandled fixture: " + test.id);
}

const probe = (id, input) => ({ id, input, independentExpected: core(input) });
const near200 = Array.from(sizes, ([sizeId, sides]) => sides.flatMap((side, index) => {
  const lastPixelBelow200 = (200n * side - 1n) / 254n;
  const ppiNum = 254n * lastPixelBelow200;
  return ppiNum * 100n > 19_995n * side ?
    [{ sizeId, side: index ? "short" : "long", px: Number(lastPixelBelow200),
      exactRatio: ppiNum + "/" + side, approximate: Number(ppiNum) / Number(side) }] : [];
})).flat();
const extra = [
  { id: "PHOTO-03-band-200", claimedNoCase: true, candidatesFound: near200 },
  probe("PHOTO-03-band-example", { mode: "check", pixelsW: "2338", pixelsH: "1800", dpi: "", sizeId: "A4" }),
  probe("PHOTO-02-aspect-mismatch", { mode: "check", pixelsW: "6000", pixelsH: "4000", dpi: "", sizeId: "A4" }),
  probe("half-up-1.005-in", { ...defaults, pixelsW: "201", pixelsH: "200", dpi: "200" }),
  probe("PHOTO-01-4x6-shared-workflow", { ...defaults, pixelsW: "1800", pixelsH: "1200" })
];
verifyCases(derive, extra);
