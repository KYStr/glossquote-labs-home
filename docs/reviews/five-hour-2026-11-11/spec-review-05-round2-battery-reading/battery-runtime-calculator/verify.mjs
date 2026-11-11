import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { isDeepStrictEqual as equal } from "node:util";

const factor = 1_000_000n;
const safe = 9_007_199_254_740_991n;
const dodKey = "depthOfDischargePercent";
const mandatory = new Map([
  ["runtime-mah", ["capacityMah", "voltage", "loadWatts"]],
  ["runtime-wh", ["capacityWh", "loadWatts"]],
  ["solve", ["targetRuntimeHours", "loadWatts", "voltage"]],
  ["pack", ["cellCapacityMah", "cellVoltage", "seriesCount", "parallelCount", "loadWatts"]]
]);
const constraints = {
  capacityMah: [12, 10_000_000n], capacityWh: [10, 100_000n],
  voltage: [8, 1000n], loadWatts: [11, 1_000_000n], targetRuntimeHours: [10, 100_000n],
  depthOfDischargePercent: [7, 100n], cellCapacityMah: [12, 10_000_000n], cellVoltage: [8, 1000n],
  seriesCount: [3, 100n], parallelCount: [3, 100n]
};
const defaults = {mode:"runtime-mah",capacityMah:"10000",voltage:"3.7",loadWatts:"10"};
const fail = (code, field = null) => ({ok:false,error:{code,field,row:null}});
const ok = result => ({ok:true,result});
const isCount = key => key.endsWith("Count");

function fixedDecimal(text) {
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole + fraction.padEnd(6, "0"));
}

function parse(input) {
  if (!input || Object.getPrototypeOf(input) !== Object.prototype) return fail("SCHEMA");
  const values = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(values);
  if (keys.some(key => !Object.hasOwn(values[key], "value")) || typeof values.mode?.value !== "string") return fail("SCHEMA");
  const mode = values.mode.value;
  const fields = mandatory.get(mode);
  if (!fields) return fail("ENUM", "mode");
  if (fields.some(key => !Object.hasOwn(values, key)) ||
      keys.some(key => key !== "mode" && key !== dodKey && !fields.includes(key)) ||
      keys.some(key => typeof values[key].value !== "string")) return fail("SCHEMA");
  const scaled = {};
  for (const field of [...fields, dodKey]) {
    const raw = values[field]?.value ?? "100";
    const [limit, maximum] = constraints[field];
    const count = isCount(field);
    if (raw.length > limit) return fail("INPUT_LIMIT", field);
    if (!raw.isWellFormed()) return fail("UNICODE", field);
    if (raw.length === 0) return fail("EMPTY", field);
    if (!(count ? /^[0-9]+$/ : /^[0-9]+(?:\.[0-9]{1,6})?$/).test(raw)) return fail(count ? "INTEGER_FORMAT" : "DECIMAL_FORMAT", field);
    const value = count ? BigInt(raw) : fixedDecimal(raw);
    if (value < (field === "loadWatts" ? 0n : 1n) || value > maximum * (count ? 1n : factor)) return fail("RANGE", field);
    scaled[field] = value;
  }
  return {ok:true,mode,scaled};
}

function nearestScaled(n, d, places) {
  const scaled = n * 10n ** BigInt(places);
  return (scaled * 2n + d) / (d * 2n);
}

function exactDecimal(value, places) {
  const digits = value.toString().padStart(places + 1, "0");
  if (!places) return digits;
  return digits.slice(0, -places) + "." + digits.slice(-places);
}

function checkedOutput(mode, status, ints, decimals, witness) {
  if (Object.values(ints).some(x => x !== null && (x < 0n || x > safe))) {
    return {actual:fail("RESULT_LIMIT"),witness};
  }
  const result = {mode,status};
  for (const [field, [scaled, places, limit]] of Object.entries(decimals)) {
    if (scaled < 0n || scaled > limit * 10n ** BigInt(places)) return {actual:fail("RESULT_LIMIT"),witness};
    const converted = Number(exactDecimal(scaled, places));
    if (!Number.isFinite(converted)) return {actual:fail("RESULT_LIMIT"),witness};
    result[field] = converted;
  }
  for (const [key, value] of Object.entries(ints)) result[key] = value === null ? null : Number(value);
  return {actual:ok(result),witness};
}

function derive(input) {
  const parsed = parse(input);
  if (!parsed.ok) return {actual:parsed,witness:{stage:"input"}};
  const {mode, scaled:v} = parsed;
  if (mode === "solve") {
    const exactWhNum = v.loadWatts * v.targetRuntimeHours * 100n;
    const exactWhDen = factor * v[dodKey];
    const capacityNum = exactWhNum * (1000n * factor);
    const capacityDen = exactWhDen * v.voltage;
    const capacity = (capacityNum + capacityDen - 1n) / capacityDen;
    if (capacity * capacityDen < capacityNum || capacity * capacityDen - capacityNum >= capacityDen) throw Error("Capacity ceiling invariant");
    return checkedOutput(mode, "ok", {requiredCapacityMah:capacity},
      {requiredEnergyWh:[nearestScaled(exactWhNum,exactWhDen,2),2,10n**19n]},
      {exactCapacityRatio:capacityNum.toString()+"/"+capacityDen.toString(),ceilMah:capacity.toString(),
       exactEnergyWhRatio:exactWhNum.toString()+"/"+exactWhDen.toString()});
  }

  const pack = mode === "pack";
  const packCapacity = pack ? v.cellCapacityMah * v.parallelCount : v.capacityMah;
  const packVoltage = pack ? v.cellVoltage * v.seriesCount : v.voltage;
  const energyN = mode === "runtime-wh" ? v.capacityWh : packCapacity * packVoltage;
  const energyD = mode === "runtime-wh" ? factor : 1000n * factor * factor;
  if (pack && energyN !== v.cellCapacityMah * v.cellVoltage * (v.parallelCount * v.seriesCount)) throw Error("Pack energy invariant");
  const usableN = energyN * v[dodKey];
  const usableD = energyD * factor * 100n;
  const decimals = {
    energyWh:[nearestScaled(energyN,energyD,2),2,10n**11n],
    usableWh:[nearestScaled(usableN,usableD,2),2,10n**11n]
  };
  if (pack) {
    decimals.packCapacityMah = [packCapacity,6,10n**9n];
    decimals.packVoltageV = [packVoltage,6,10n**5n];
  }
  const witness = {energyWhRatio:energyN.toString()+"/"+energyD.toString()};
  if (v.loadWatts === 0n) return checkedOutput(mode, "infinite", {
    runtimeHours:null,runtimeHoursPart:null,runtimeMinutesPart:null,runtimeTotalMinutes:null
  }, decimals, witness);
  const hoursN = usableN * factor;
  const hoursD = usableD * v.loadWatts;
  const total = nearestScaled(hoursN * 60n,hoursD,0);
  const hours = total / 60n, minutes = total % 60n;
  if (minutes < 0n || minutes > 59n || hours * 60n + minutes !== total) throw Error("Minute decomposition invariant");
  decimals.runtimeHours = [nearestScaled(hoursN,hoursD,1),1,10n**17n];
  return checkedOutput(mode,"ok",{runtimeHoursPart:hours,runtimeMinutesPart:minutes,runtimeTotalMinutes:total},decimals,{
    ...witness,exactMinutesRatio:(hoursN*60n).toString()+"/"+hoursD.toString(),roundedMinutes:total.toString()
  });
}

function controller(fixture) {
  const input = fixture.input;
  let serial = 0;
  let view = {state:"empty",reportAvailable:false};
  let draft = defaults;
  const transition = (state, nextDraft = draft) => {
    draft = nextDraft;
    view = {state,reportAvailable:false};
    return ++serial;
  };
  const finish = (generation, output) => {
    if (generation !== serial || view.state !== "busy") return;
    view = output.ok ? {state:"success",reportAvailable:true} : {state:"error",reportAvailable:false,error:output.error};
  };
  const submit = next => finish(transition("busy",next), derive(next).actual);
  if (fixture.id === "state-dirty-error" || fixture.id === "state-dirty-result-limit") {
    submit(input.initial);
    const afterRun = view;
    transition("dirty",input.edit);
    const afterEdit = view;
    submit(input.edit);
    return {afterRun,afterEdit,afterRerun:view};
  }
  if (fixture.id === "state-cancel-late") {
    if (!equal(derive(input.draft).actual.result,input.lateResult)) throw Error("Late result differs from independent computation");
    const pending = transition("busy",input.draft);
    const whilePending = view;
    transition("cancelled");
    const afterCancel = {...view,draft};
    finish(pending,ok(input.lateResult));
    const afterLateResult = view;
    transition("empty",defaults);
    return {whilePending,afterCancel,afterLateResult,afterReset:{...view,draft}};
  }
  if (fixture.id === "state-replace-late") {
    if (!equal(derive(input.olderDraft).actual.result,input.olderLateResult)) throw Error("Replaced result differs from independent computation");
    const pending = transition("busy",input.olderDraft);
    submit(input.newerDraft);
    const afterNewerResult = view;
    finish(pending,ok(input.olderLateResult));
    return {afterNewerResult,afterOlderLateResult:view};
  }
  throw Error("Unhandled fixture "+fixture.id);
}

function report(output) {
  if (!output.ok) {
    if (Object.hasOwn(output,"result")) throw Error("Partial result on error");
    return null;
  }
  const {result} = output;
  if (result.runtimeTotalMinutes !== undefined && result.runtimeTotalMinutes !== null) {
    const total = BigInt(result.runtimeTotalMinutes);
    if (!Number.isSafeInteger(result.runtimeTotalMinutes) ||
        BigInt(result.runtimeHoursPart)*60n+BigInt(result.runtimeMinutesPart)!==total) throw Error("JSON minute invariant");
  }
  if (result.requiredCapacityMah !== undefined && !Number.isSafeInteger(result.requiredCapacityMah)) throw Error("JSON capacity invariant");
  const text = JSON.stringify(result, Object.keys(result).sort())+"\n";
  return {bytes:Buffer.byteLength(text),sha256:createHash("sha256").update(text).digest("hex"),text};
}

const [originalFile,candidateFile] = process.argv.slice(2);
if (!originalFile || !candidateFile) throw Error("Pass original and candidate fixtures.json paths");
const original = JSON.parse(readFileSync(originalFile,"utf8")).cases;
const candidate = JSON.parse(readFileSync(candidateFile,"utf8")).cases;
const originals = new Map(original.map(c=>[c.id,c]));
const unchanged = original.every(c=>equal(c,candidate.find(row=>row.id===c.id))) &&
  equal(original.map(c=>c.id),candidate.filter(c=>originals.has(c.id)).map(c=>c.id));
const cases = candidate.map(c=>{
  const d = c.kind==="core"?derive(c.input):{actual:controller(c)};
  return {id:c.id,kind:c.kind,origin:originals.has(c.id)?"original":"repair",
    input:c.input,candidateExpected:c.expected,independentExpected:d.actual,exactWitness:d.witness,
    ...(c.kind==="core"?{expectedReport:report(d.actual)}:{}),status:equal(d.actual,c.expected)?"PASS":"FAIL"};
});
const probe = (id,input) => ({id,input,...derive(input)});
const minimumDoD = {mode:"solve",targetRuntimeHours:"1",loadWatts:"0",voltage:"3"};
const outputRated = {mode:"runtime-wh",capacityWh:"30",loadWatts:"10"};
const extra = [
  probe("BAT-R2-01-output-rating-unadjusted",outputRated),
  probe("BAT-R2-01-output-rating-additional-derate",{...outputRated,[dodKey]:"80"}),
  probe("BAT-R2-02-DoD-legal-minimum",{...minimumDoD,[dodKey]:"0.00001"}),
  probe("BAT-R2-02-DoD-one-more-decimal",{...minimumDoD,[dodKey]:"0.000001"})
];
const safeMax=cases.find(c=>c.id==="pack-minutes-safe-max");
if(!safeMax?.expectedReport?.text.includes('"runtimeTotalMinutes":9007199254740991')) throw Error("Safe max serialized differently");
const failed = cases.filter(c=>c.status==="FAIL").length;
console.log(JSON.stringify({runtime:process.version,passed:cases.length-failed,failed,
  unchangedOriginalCases:unchanged?original.length:0,productChecks:"NOT_RUN",cases,extra},null,2));
process.exitCode = failed || !unchanged ? 1 : 0;
