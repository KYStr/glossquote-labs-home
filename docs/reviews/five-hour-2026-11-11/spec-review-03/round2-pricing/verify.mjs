import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sections = ["goal","scope","userFlow","inputsOutputs","implementation","acceptance","tests","handoff"];
const productIds = ["functionality","boundaries","privacy","security","usability","accessibility","localization-seo","toolchain-provenance","compatibility"];
const beDefaults = {fixedCost:"100000",price:"400",variableCost:"150",expectedUnits:""};
const mmDefaults = {mode:"report",cost:"80.00",price:"100.00",markupPercent:null,marginPercent:null};
const mmFields = {report:"price","solve-markup":"markupPercent","solve-margin":"marginPercent"};
const fixedMoneyCap = 99999999999n;
const priceCap = 99999999n;
const percentScale = 100000n;

class Rejected extends Error {
  constructor(code, field = null) { super(code); this.receipt = {ok:false,error:{code,field,row:null}}; }
}
function checkShape(input, expected) {
  if (input === null || typeof input !== "object" || Object.getPrototypeOf(input) !== Object.prototype) throw new Rejected("SCHEMA");
  const fields = Reflect.ownKeys(input);
  if (fields.length !== expected.length || fields.some(k => !expected.includes(k))) throw new Rejected("SCHEMA");
  for (const k of expected) if (!Object.hasOwn(Object.getOwnPropertyDescriptor(input,k),"value")) throw new Rejected("SCHEMA");
}
function lexical(field, raw, maxLength, optional=false) {
  if (raw.length > maxLength) throw new Rejected("INPUT_LIMIT",field);
  if (!raw.isWellFormed()) throw new Rejected("UNICODE",field);
  if (raw === "" && !optional) throw new Rejected("EMPTY",field);
}
function decimal(field, raw, digits, maxLength, min, max, optional=false) {
  lexical(field,raw,maxLength,optional);
  if (raw === "") return null;
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/.exec(raw);
  if (!match || (match[2]?.length ?? 0) > digits) throw new Rejected(digits?"DECIMAL_FORMAT":"INTEGER_FORMAT",field);
  const scale = 10n ** BigInt(digits);
  const val = BigInt(match[1])*scale + BigInt((match[2] ?? "").padEnd(digits,"0") || "0");
  if (val<min || val>max) throw new Rejected("RANGE",field);
  return val;
}
function firstTrue(lo,hi,test) {
  assert(test(hi));
  while(lo<hi) {
    const mid=(lo+hi)/2n;
    if (test(mid)) hi=mid;
    else lo=mid+1n;
  }
  return lo;
}
function nearestPosTie(n,d) {
  const two = 2n*n+d;
  const denom = 2n*d;
  const truncated = two/denom;
  return two<0n && two%denom!==0n ? truncated-1n : truncated;
}
function nearestAway(n,d) {
  return n<0n ? -nearestPosTie(-n,d) : nearestPosTie(n,d);
}
function nearestEven(n,d) {
  const q=n/d, rem=n%d;
  if(2n*rem===d) return q+q%2n;
  return nearestPosTie(n,d);
}
function format(value, places) {
  const v=value<0n?-value:value;
  const scale=10n**BigInt(places);
  return (value<0n?"-":"") + (v/scale).toString() + "." + (v%scale).toString().padStart(places,"0");
}
function number(n) { const v=Number(n); assert(Number.isSafeInteger(v)); return v; }
function breakEven(input) {
  try {
    const names=Object.keys(beDefaults);
    checkShape(input,names);
    if(names.some(k=>typeof input[k]!=="string")) throw new Rejected("SCHEMA");
    const f=decimal("fixedCost",input.fixedCost,2,12,0n,fixedMoneyCap);
    const p=decimal("price",input.price,2,12,1n,fixedMoneyCap);
    const v=decimal("variableCost",input.variableCost,2,12,0n,fixedMoneyCap);
    const e=decimal("expectedUnits",input.expectedUnits,0,9,0n,100000000n,true);
    const margin=p-v;
    const profit=q=>q*p-(f+q*v);
    if(margin<=0n) {
      return {value:{ok:false,error:{code:"NO_MARGIN",field:null,row:null}},proof:{cost:""+f,margin:""+margin,profit0:format(profit(0n),2),profit2:format(profit(2n),2)}};
    }
    const units=firstTrue(0n,f,q=>profit(q)>=0n);
    assert(units===0n||profit(units-1n)<0n);
    const exactRev=f*p;
    assert(units*p*margin>=exactRev && units*p*margin-exactRev<p*margin);
    const out={
      contributionMarginPerUnit:format(margin,2),
      contributionMarginRatioPercent:format(nearestPosTie(margin*10000n,p),2),
      breakevenUnitsExact:format(nearestPosTie(f*10000n,margin),4),
      breakevenUnits:number(units),
      breakevenRevenueExact:format(nearestPosTie(exactRev,margin),2),
      breakevenRevenue:format(units*p,2),
      marginOfSafety:e===null?null:{
        expectedUnits:number(e),units:number(e-units),
        percent:e===0n?null:format(nearestPosTie((e-units)*10000n,e),2),
        expectedProfit:format(profit(e),2),belowBreakeven:e<units
      }
    };
    return {value:{ok:true,result:out},proof:{
      prevProfit:units>0n?format(profit(units-1n),2):null,
      unitsProfit:format(profit(units),2),
      exactTieUp:out.contributionMarginRatioPercent,exactTieEven:format(nearestEven(margin*10000n,p),2)
    }};
  } catch(e) { if(e instanceof Rejected)return {value:e.receipt}; throw e; }
}
function priceRates(cost, price) {
  const profit=price-cost;
  if (price>0n) assert(profit+cost===price);
  return {profitCents:number(profit),markupHundredths:number(nearestAway(profit*10000n,cost)),
    marginHundredths:price===0n?null:number(nearestAway(profit*10000n,price))};
}
function targetPrice(input) {
  try {
    checkShape(input,Object.keys(mmDefaults));
    if(typeof input.mode!=="string"||typeof input.cost!=="string"||
      ["price","markupPercent","marginPercent"].some(k=>input[k]!==null&&typeof input[k]!=="string")) throw new Rejected("SCHEMA");
    lexical("mode",input.mode,12);
    if(!Object.hasOwn(mmFields,input.mode))throw new Rejected("ENUM","mode");
    const field=mmFields[input.mode];
    if(["price","markupPercent","marginPercent"].some(k=>(input[k]!==null)!==(field===k)))throw new Rejected("SCHEMA");
    const cost=decimal("cost",input.cost,2,10,1n,priceCap);
    const isReport=input.mode==="report";
    const x=decimal(field,input[field],isReport?2:3,isReport?10:9,0n,priceCap);
    if(isReport) {
      return {value:{ok:true,result:{mode:input.mode,costCents:number(cost),priceCents:number(x),...priceRates(cost,x),belowCost:x<cost}}};
    }
    const isMarkup=field==="markupPercent";
    if(!isMarkup&&x>=percentScale) throw new Rejected("NO_SOLUTION",field);
    const passes=price=>price>0n&&(price-cost)*percentScale>=(isMarkup?cost:price)*x;
    if(!passes(priceCap)) throw new Rejected("RANGE",field);
    const price=firstTrue(1n,priceCap,passes);
    assert(!passes(price-1n));
    const at=priceRates(cost,price), below=priceRates(cost,price-1n);
    const result={mode:input.mode,costCents:number(cost),priceCents:number(price),profitCents:at.profitCents};
    if(isMarkup) {
      result.markupPercentMilli=number(x);
      result.actualMarkupHundredths=at.markupHundredths;
      result.marginHundredths=at.marginHundredths;
    } else {
      result.marginPercentMilli=number(x);
      result.markupHundredths=at.markupHundredths;
      result.actualMarginHundredths=at.marginHundredths;
    }
    return {value:{ok:true,result},proof:{at,oneCentLess:below,oneCentLessPrice:number(price-1n),meets:true,oneCentLessMeets:false}};
  } catch(e) { if(e instanceof Rejected)return {value:e.receipt}; throw e; }
}
function controller(caseId,input,solve,defaults) {
  let epoch=0,state="empty",result=null,draft=defaults;
  const move=(next,d=draft)=>{epoch++;state=next;result=null;draft=d;return epoch;};
  const start=d=>[move("busy",d),solve(d).value];
  const finish=([seq,next])=>{if(epoch===seq&&state==="busy"){result=next;state=next.ok?"success":"error";}};
  const snap=(showDraft=false)=>({state,reportAvailable:state==="success",...(state==="error"?{error:result.error}:{}),...(showDraft?{draft}:{})});
  if(caseId==="state-dirty-error") {
    finish(start(input.initial));const afterRun=snap();
    move("dirty",input.edit);const afterEdit=snap();
    finish(start(draft));return {afterRun,afterEdit,afterRerun:snap()};
  }
  if(caseId==="state-cancel-late") {
    const old=start(input.draft);assert.deepEqual(old[1].result,input.lateResult);
    const whilePending=snap();
    move("cancelled");const afterCancel=snap(true);
    finish(old);const afterLateResult=snap();
    move("empty",defaults);return {whilePending,afterCancel,afterLateResult,afterReset:snap(true)};
  }
  if(caseId==="state-replace-late") {
    const old=start(input.olderDraft);assert.deepEqual(old[1].result,input.olderLateResult);
    finish(start(input.newerDraft));const afterNewerResult=snap();
    finish(old);return {afterNewerResult,afterOlderLateResult:snap()};
  }
  throw new Error("unknown controller fixture "+caseId);
}
const hash=b=>createHash("sha256").update(b).digest("hex");
const gitBlob=b=>createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");
const ordered=obj=>Object.fromEntries(Object.entries(obj).sort(([a],[b])=>a<b?-1:a>b?1:0));
function report(id,name,value,expected) {
  const bytes=Buffer.from(JSON.stringify(ordered(value))+"\n","utf8");
  assert(bytes.equals(Buffer.from(expected,"utf8")));
  return {id,name,byteLength:bytes.length,sha256:hash(bytes),jsonBytes:bytes.toString("utf8")};
}
function document(dir) {
  const files={};
  for(const f of ["BRIEF.md","SPEC.md","fixtures.json","AUTHOR-CHECK.md"]) {
    const b=readFileSync(join(dir,f));files[f]={bytes:b.length,gitBlob:gitBlob(b),sha256:hash(b)};
    if(f.endsWith(".md")) assert(!b.includes(Buffer.from("...[truncated")));
  }
  const spec=readFileSync(join(dir,"SPEC.md"),"utf8");
  const headings=[...spec.matchAll(/^## (\w+)\s*$/gm)].map(m=>m[1]);
  assert.deepEqual(headings,sections);
  const prod=spec.slice(spec.indexOf("\n## acceptance"),spec.indexOf("\n## tests"));
  for(const p of productIds)assert(prod.includes("| "+p+" |"));
  return {sections:headings,productIds,files};
}
const root=process.argv[2];
if(!root) throw new Error("Usage: node verify.mjs <candidate-checkout>/docs/specs");
const tools=[
  ["breakeven-calculator",breakEven,beDefaults],
  ["markup-margin-calculator",targetPrice,mmDefaults]
];
const records={};
for(const [slug,solve,defaults] of tools) {
  const dir=join(root,slug);
  const files=document(dir);
  const fixtures=JSON.parse(readFileSync(join(dir,"fixtures.json"),"utf8"));
  assert.equal(fixtures.productChecks,"NOT_RUN");
  const cases=fixtures.cases.map(c=>{
    const {value,proof}=c.kind==="core"?solve(c.input):{value:controller(c.id,c.input,solve,defaults)};
    let status="PASS";
    try { assert.deepEqual(value,c.expected); } catch { status="FAIL"; }
    return {id:c.id,kind:c.kind,input:c.input,expected:c.expected,derived:value,proof,status};
  });
  assert.equal(new Set(cases.map(c=>c.id)).size,cases.length);
  records[slug]={...files,cases};
}
const be=records["breakeven-calculator"].cases;
const mm=records["markup-margin-calculator"].cases;
const caseBy=(cases,id)=>cases.find(c=>c.id===id);
assert.equal(caseBy(be,"ratio-half-up-tie").proof.exactTieUp,"2.68");
assert.equal(caseBy(be,"ratio-half-up-tie").proof.exactTieEven,"2.68");
assert.equal(caseBy(be,"ratio-half-up-distinguishes-half-even").proof.exactTieUp,"2.67");
assert.equal(caseBy(be,"ratio-half-up-distinguishes-half-even").proof.exactTieEven,"2.66");
const probes=[];
for(const [solve,label,input,expected] of [
 [breakEven,"be-cap",{fixedCost:"999999999.99",price:"0.01",variableCost:"0",expectedUnits:"100000000"},99999999999],
 [breakEven,"be-first-error",{...beDefaults,price:"0",variableCost:"x",expectedUnits:"100000001"},"RANGE/price"],
 [breakEven,"be-unicode",{...beDefaults,fixedCost:"\uD800"},"UNICODE/fixedCost"],
 [targetPrice,"markup-max-legal",{...mmDefaults,mode:"solve-markup",cost:"0.01",price:null,markupPercent:"99999.999"},1001],
 [targetPrice,"margin-at-price-cap",{...mmDefaults,mode:"solve-margin",cost:"999999.99",price:null,marginPercent:"0"},99999999],
 [targetPrice,"markup-just-over-cap",{...mmDefaults,mode:"solve-markup",cost:"999999.99",price:null,markupPercent:"0.001"},"RANGE/markupPercent"],
 [targetPrice,"margin-first-error",{...mmDefaults,mode:"solve-margin",cost:"0",price:null,marginPercent:"100"},"RANGE/cost"]
]) {
  const got=solve(input).value;
  const asserted=got.ok ? (got.result.priceCents??got.result.breakevenUnits) : got.error.code+"/"+got.error.field;
  assert.equal(asserted,expected); probes.push({label,input,expected,derived:got});
}
const reportSamples=[
  report("ceil-rounds-up","breakeven-report.json",caseBy(be,"ceil-rounds-up").derived.result,
    '{"breakevenRevenue":"197600.00","breakevenRevenueExact":"197529.60","breakevenUnits":494,"breakevenUnitsExact":"493.8240","contributionMarginPerUnit":"250.00","contributionMarginRatioPercent":"62.50","marginOfSafety":null}\n'),
  report("solve-markup-one-cent-target","markup-margin-report.json",caseBy(mm,"solve-markup-one-cent-target").derived.result,
    '{"actualMarkupHundredths":10000,"costCents":1,"marginHundredths":5000,"markupPercentMilli":25000,"mode":"solve-markup","priceCents":2,"profitCents":1}\n'),
  report("solve-margin-one-cent-target","markup-margin-report.json",caseBy(mm,"solve-margin-one-cent-target").derived.result,
    '{"actualMarginHundredths":5000,"costCents":1,"marginPercentMilli":25000,"markupHundredths":10000,"mode":"solve-margin","priceCents":2,"profitCents":1}\n')
];
const all=[...be,...mm];
const failures=all.filter(c=>c.status!=="PASS");
console.log(JSON.stringify({summary:{pass:all.length-failures.length,total:all.length,
  successfulMinima:mm.filter(c=>c.proof?.meets).length,extraProbes:probes.length,reportSamples:reportSamples.length},records,probes,reportSamples},null,2));
if(failures.length)process.exitCode=1;
