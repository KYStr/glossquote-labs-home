import { verifyCases } from "../verify-cases.mjs";

const scale = 1_000_000n;
const fields = {
  "runtime-mah": ["capacityMah", "voltage", "loadWatts"],
  "runtime-wh": ["capacityWh", "loadWatts"],
  solve: ["targetRuntimeHours", "loadWatts", "voltage"],
  pack: ["cellCapacityMah", "cellVoltage", "seriesCount", "parallelCount", "loadWatts"]
};
const rules = {
  capacityMah: [12, 10_000_000n], capacityWh: [10, 100_000n],
  voltage: [8, 1000n], loadWatts: [11, 1_000_000n],
  targetRuntimeHours: [10, 100_000n], depthOfDischargePercent: [7, 100n],
  cellCapacityMah: [12, 10_000_000n], cellVoltage: [8, 1000n],
  seriesCount: [3, 100n], parallelCount: [3, 100n]
};

function scaled(raw) {
  const [integer, fraction = ""] = raw.split(".");
  return BigInt(integer) * scale + BigInt(fraction.padEnd(6, "0"));
}

function halfUp(numerator, denominator) {
  const quotient = numerator / denominator;
  return quotient + (numerator % denominator * 2n >= denominator ? 1n : 0n);
}

function decimal(n, d, places) {
  const multiplier = 10n ** BigInt(places);
  return Number(halfUp(n * multiplier, d)) / Number(multiplier);
}

function error(code, field = null) {
  return { ok: false, error: { code, field, row: null } };
}

function validated(input) {
  if (input === null || typeof input !== "object" ||
      Object.getPrototypeOf(input) !== Object.prototype ||
      Object.values(Object.getOwnPropertyDescriptors(input)).some(desc => !Object.hasOwn(desc, "value")) ||
      !Object.hasOwn(input, "mode") || typeof input.mode !== "string") return error("SCHEMA");
  const mandatory = Object.hasOwn(fields, input.mode) ? fields[input.mode] : null;
  if (!mandatory) return error("ENUM", "mode");
  const optional = "depthOfDischargePercent";
  if (mandatory.some(key => !Object.hasOwn(input, key)) ||
      Object.keys(input).some(key => key !== "mode" && key !== optional && !mandatory.includes(key)) ||
      Object.values(input).some(value => typeof value !== "string")) return error("SCHEMA");
  const result = {};
  for (const key of [...mandatory, optional]) {
    const raw = Object.hasOwn(input, key) ? input[key] : "100";
    const [limit, max] = rules[key];
    const count = key.endsWith("Count");
    if (raw.length > limit) return error("INPUT_LIMIT", key);
    if (!raw.isWellFormed()) return error("UNICODE", key);
    if (!raw.length) return error("EMPTY", key);
    if (!(count ? /^[0-9]+$/ : /^[0-9]+(?:\.[0-9]{1,6})?$/).test(raw)) {
      return error(count ? "INTEGER_FORMAT" : "DECIMAL_FORMAT", key);
    }
    const value = count ? BigInt(raw) : scaled(raw);
    const minimum = count ? 1n : key === "loadWatts" ? 0n : 1n;
    if (value < minimum || value > (count ? max : max * scale)) return error("RANGE", key);
    result[key] = value;
  }
  return { ok: true, values: result };
}

function deriveExact(input) {
  const checked = validated(input);
  if (!checked.ok) return checked;
  const v = checked.values;
  const { mode } = input;
  if (mode === "solve") {
    const energyNum = v.loadWatts * v.targetRuntimeHours * 100n;
    const energyDen = scale * v.depthOfDischargePercent;
    const mahNum = energyNum * scale * 1000n;
    const mahDen = energyDen * v.voltage;
    const requiredCapacityMah = (mahNum + mahDen - 1n) / mahDen;
    return { ok: true, result: { mode, status: "ok",
      requiredEnergyWh: decimal(energyNum, energyDen, 2),
      requiredCapacityMah } };
  }
  const capacity = mode === "pack" ? v.cellCapacityMah * v.parallelCount : v.capacityMah;
  const voltage = mode === "pack" ? v.cellVoltage * v.seriesCount : v.voltage;
  const energyNum = mode === "runtime-wh" ? v.capacityWh : capacity * voltage;
  const energyDen = mode === "runtime-wh" ? scale : scale ** 2n * 1000n;
  const usableNum = energyNum * v.depthOfDischargePercent;
  const usableDen = energyDen * 100n * scale;
  const result = { mode, status: v.loadWatts === 0n ? "infinite" : "ok",
    energyWh: decimal(energyNum, energyDen, 2), usableWh: decimal(usableNum, usableDen, 2) };
  if (mode === "pack") Object.assign(result, {
    packVoltageV: Number(voltage) / Number(scale),
    packCapacityMah: Number(capacity) / Number(scale)
  });
  if (v.loadWatts === 0n) Object.assign(result, {
    runtimeHours: null, runtimeTotalMinutes: null, runtimeHoursPart: null, runtimeMinutesPart: null
  });
  else {
    const hoursNum = usableNum * scale;
    const hoursDen = usableDen * v.loadWatts;
    const minutes = halfUp(60n * hoursNum, hoursDen);
    Object.assign(result, { runtimeHours: decimal(hoursNum, hoursDen, 1),
      runtimeTotalMinutes: minutes, runtimeHoursPart: minutes / 60n, runtimeMinutesPart: minutes % 60n });
  }
  return { ok: true, result };
}

function run(input) {
  const answer = deriveExact(input);
  if (!answer.ok) return answer;
  return { ok: true, result: Object.fromEntries(Object.entries(answer.result)
    .map(([key, value]) => [key, typeof value === "bigint" ? Number(value) : value])) };
}

function controller() {
  let state = "empty";
  let error;
  let draft;
  let generation = 0;
  function revoke(next) { state = next; error = undefined; generation++; }
  return {
    start(input) { draft = input; revoke("busy"); return generation; },
    edit(input) { draft = input; revoke("dirty"); },
    cancel() { revoke("cancelled"); },
    reset() { draft = { mode: "runtime-mah", capacityMah: "10000", voltage: "3.7", loadWatts: "10" }; revoke("empty"); },
    deliver(job, output) {
      if (generation !== job || state !== "busy") return;
      state = output.ok ? "success" : "error";
      error = output.error;
    },
    snapshot(withDraft = false) {
      return { state, reportAvailable: state === "success", ...(withDraft ? { draft } : {}), ...(error ? { error } : {}) };
    }
  };
}

function derive(test) {
  if (test.kind === "core") return run(test.input);
  const input = test.input;
  const model = controller();
  const submit = draft => model.deliver(model.start(draft), run(draft));
  if (test.id === "state-dirty-error") {
    submit(input.initial);
    const afterRun = model.snapshot();
    model.edit(input.edit);
    const afterEdit = model.snapshot();
    submit(input.edit);
    return { afterRun, afterEdit, afterRerun: model.snapshot() };
  }
  if (test.id === "state-cancel-late") {
    const pending = model.start(input.draft);
    const whilePending = model.snapshot();
    model.cancel();
    const afterCancel = model.snapshot(true);
    model.deliver(pending, { ok: true, result: input.lateResult });
    const afterLateResult = model.snapshot();
    model.reset();
    return { whilePending, afterCancel, afterLateResult, afterReset: model.snapshot(true) };
  }
  if (test.id === "state-replace-late") {
    const older = model.start(input.olderDraft);
    submit(input.newerDraft);
    const afterNewerResult = model.snapshot();
    model.deliver(older, { ok: true, result: input.olderLateResult });
    return { afterNewerResult, afterOlderLateResult: model.snapshot() };
  }
  throw new Error("Unhandled fixture: " + test.id);
}

function checkInteger(id, input, key) {
  const exact = deriveExact(input).result[key];
  const output = run(input).result;
  const recovered = BigInt(output[key]);
  return {
    id, input, key, exact: exact.toString(), jsonNumber: JSON.stringify(output[key]),
    representedInteger: recovered.toString(), delta: (recovered - exact).toString(),
    ...(key === "runtimeTotalMinutes" ? {
      exactHoursPart: deriveExact(input).result.runtimeHoursPart.toString(),
      minutesPart: output.runtimeMinutesPart,
      totalFromPartsUsingOutputValues: (BigInt(output.runtimeHoursPart) * 60n + BigInt(output.runtimeMinutesPart)).toString()
    } : {})
  };
}

const extra = [
  checkInteger("BAT-01-solve", { mode: "solve", voltage: "3", loadWatts: "1000000",
    targetRuntimeHours: "100000", depthOfDischargePercent: "0.00001" }, "requiredCapacityMah"),
  checkInteger("BAT-01-pack", { mode: "pack", cellCapacityMah: "10000000", cellVoltage: "1000",
    seriesCount: "100", parallelCount: "100", loadWatts: "0.000007" }, "runtimeTotalMinutes")
];
verifyCases(derive, extra);
