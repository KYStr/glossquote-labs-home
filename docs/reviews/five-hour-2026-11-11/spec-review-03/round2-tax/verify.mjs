import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const fields=["mode","ratePercent","basis","amount","lines"];
const initial={mode:"single",ratePercent:"5",basis:"net",amount:"10000",lines:null};
const limit=999999999999n;
const unit=10000n;
const baseDocs=["BRIEF.md","SPEC.md","fixtures.json","AUTHOR-CHECK.md"];
const sectionNames=["goal","scope","userFlow","inputsOutputs","implementation","acceptance","tests","handoff"];
const productAspects=["functionality","boundaries","privacy","security","usability","accessibility","localization-seo","toolchain-provenance","compatibility"];
const ok=result=>({ok:true,result});
const error=(code,field=null,row=null)=>({ok:false,error:{code,field,row}});
class Reject extends Error {
  constructor(code,field=null,row=null){super(code);this.result=error(code,field,row);}
}
function dataRecord(value,required) {
  if(value===null||typeof value!=="object")throw new Reject("SCHEMA");
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null)throw new Reject("SCHEMA");
  const keys=Reflect.ownKeys(value);
  if(keys.length!==required.length||keys.some(k=>!required.includes(k)))throw new Reject("SCHEMA");
  const entries=required.map(k=>{
    const d=Object.getOwnPropertyDescriptor(value,k);
    if(!d?.enumerable||!Object.hasOwn(d,"value"))throw new Reject("SCHEMA");
    return [k,d.value];
  });
  return Object.fromEntries(entries);
}
function shape(input) {
  const d=dataRecord(input,fields);
  if(typeof d.mode!=="string"||typeof d.ratePercent!=="string"||
    (d.basis!==null&&typeof d.basis!=="string")||(d.amount!==null&&typeof d.amount!=="string")||
    (d.lines!==null&&!Array.isArray(d.lines)))throw new Reject("SCHEMA");
  if(d.lines!==null&&d.lines.length<=20) {
    const keys=Reflect.ownKeys(d.lines);
    if(keys.length!==d.lines.length+1)throw new Reject("SCHEMA");
    const rows=[];
    for(let i=0;i<d.lines.length;i++) {
      const desc=Object.getOwnPropertyDescriptor(d.lines,String(i));
      if(!desc||!Object.hasOwn(desc,"value"))throw new Reject("SCHEMA");
      const row=dataRecord(desc.value,["amount"]);
      if(typeof row.amount!=="string")throw new Reject("SCHEMA");
      rows.push(row);
    }
    d.lines=rows;
  }
  return d;
}
function prefix(raw,field,maxLength,row=null) {
  if(raw===null)throw new Reject("EMPTY",field,row);
  if(raw.length>maxLength)throw new Reject("INPUT_LIMIT",field,row);
  if(!raw.isWellFormed())throw new Reject("UNICODE",field,row);
  if(raw==="")throw new Reject("EMPTY",field,row);
}
function wholeMatch(pattern,raw) { return pattern.exec(raw)?.[0]===raw; }
function toEnum(raw,field,choices) {
  prefix(raw,field,16);
  if(!choices.includes(raw))throw new Reject("ENUM",field);
  return raw;
}
function toAmount(raw,row=null) {
  prefix(raw,"amount",32,row);
  if(!wholeMatch(/^(?:0|[1-9][0-9]*)$/,raw))throw new Reject("INTEGER_FORMAT","amount",row);
  const v=BigInt(raw);
  if(v>limit)throw new Reject("RANGE","amount",row);
  return v;
}
function toRate(raw) {
  prefix(raw,"ratePercent",16);
  if(!wholeMatch(/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/,raw))throw new Reject("DECIMAL_FORMAT","ratePercent");
  const [whole,fraction=""]=raw.split(".");
  const p=BigInt(whole)*100n+BigInt(fraction.padEnd(2,"0"));
  if(p<1n||p>unit)throw new Reject("RANGE","ratePercent");
  return {p,normalized:raw.includes(".")?raw.replace(/0+$/,"").replace(/\.$/,""):raw};
}
function round(n,d) {
  const quotient=n/d;
  return n%d>=d-n%d?quotient+1n:quotient;
}
function asSafe(v) {
  assert(v>=-2n*limit&&v<=2n*limit);
  const n=Number(v); assert(Number.isSafeInteger(n)); return n===0?0:n;
}
const forwardTax=(n,p)=>round(n*p,unit);
const forward=(n,p)=>n+forwardTax(n,p);
function reverse(g,p) {
  const net=round(g*unit,unit+p);
  const again=forward(net,p);
  const difference=again-g;
  assert(net<=g && difference>=-1n && difference<=1n);
  return {net,tax:g-net,again,difference};
}
function solve(raw) {
  try {
    const v=shape(raw);
    const mode=toEnum(v.mode,"mode",["single","lines"]);
    const {p,normalized:ratePercent}=toRate(v.ratePercent);
    if(mode==="single") {
      const basis=toEnum(v.basis,"basis",["net","gross"]);
      if(v.lines!==null)throw new Reject("INACTIVE_FIELD","lines");
      const a=toAmount(v.amount);
      if(basis==="net") {
        const t=forwardTax(a,p);
        return ok({mode,basis,ratePercent,net:asSafe(a),tax:asSafe(t),gross:asSafe(a+t)});
      }
      const g=reverse(a,p);
      assert(g.net+g.tax===a);
      return ok({mode,basis,ratePercent,net:asSafe(g.net),tax:asSafe(g.tax),gross:asSafe(a),forwardGross:asSafe(g.again),forwardDifference:asSafe(g.difference)});
    }
    if(v.basis!==null)throw new Reject("INACTIVE_FIELD","basis");
    if(v.amount!==null)throw new Reject("INACTIVE_FIELD","amount");
    if(v.lines===null||v.lines.length===0)throw new Reject("EMPTY","lines");
    if(v.lines.length>20)throw new Reject("ROW_LIMIT","lines");
    const values=v.lines.map((r,i)=>toAmount(r.amount,i+1));
    const subtotal=values.reduce((a,b)=>a+b,0n);
    if(subtotal>limit)throw new Reject("TOTAL_RANGE","lines");
    const tax=forwardTax(subtotal,p);
    const itemTax=values.reduce((a,b)=>a+forwardTax(b,p),0n);
    return ok({mode,ratePercent,lines:values.map((v,i)=>({row:i+1,net:asSafe(v)})),subtotalNet:asSafe(subtotal),
      tax:asSafe(tax),gross:asSafe(subtotal+tax),perLineTaxSum:asSafe(itemTax),roundingDifference:asSafe(tax-itemTax)});
  }catch(e){if(e instanceof Reject)return e.result;throw e;}
}

function machine() {
  const queued=new Map();
  let active=null,draft=initial,state="empty",value=null;
  function move(s,next=draft){state=s;draft=next;value=null;active=null;}
  function start(token,next=draft) {
    move("busy",structuredClone(next));
    assert(!queued.has(token));queued.set(token,solve(draft));active=token;
  }
  function resolve(token,claimed) {
    const found=queued.get(token);
    assert(found,"completion for unknown request");
    if(claimed!==undefined)assert.deepEqual(found,claimed);
    if(active!==token||state!=="busy")return;
    active=null;state=found.ok?"success":"error";value=found;
  }
  function timeout(token){
    if(active===token&&state==="busy"){move("error");value=error("WORKER_ERROR");}
  }
  function snap(exposeDraft=false,exposeResult=false) {
    const o={state,reportAvailable:state==="success"};
    if(state==="error")o.error=value.error;
    if(exposeDraft)o.draft=draft;
    if(exposeResult&&state==="success")o.result=value.result;
    return o;
  }
  return {start,resolve,timeout,move,snap,outcome:token=>queued.get(token),draft:()=>draft};
}
function controller(c) {
  const a=c.input, m=machine();
  if(c.id==="state-dirty-error"){
    m.start("one",a.initial);m.resolve("one");const afterRun=m.snap();
    m.move("dirty",a.edit);const afterEdit=m.snap();
    m.start("two",a.edit);m.resolve("two");return {afterRun,afterEdit,afterRerun:m.snap()};
  }
  if(c.id==="state-cancel-late"){
    m.start("one",a.draft);assert.deepEqual(m.outcome("one").result,a.lateResult);
    const whilePending=m.snap();
    m.move("cancelled");const afterCancel=m.snap(true);
    m.resolve("one");const afterLateResult=m.snap();
    m.move("empty",initial);return {whilePending,afterCancel,afterLateResult,afterReset:m.snap(true)};
  }
  if(c.id==="state-replace-late"){
    m.start("old",a.olderDraft);assert.deepEqual(m.outcome("old").result,a.olderLateResult);
    m.start("new",a.newerDraft);m.resolve("new");const afterNewerResult=m.snap();
    m.resolve("old");return {afterNewerResult,afterOlderLateResult:m.snap()};
  }
  let afterReset=false;
  return a.events.map(e=>{
    if(e.op==="convert"){m.start(e.token,e.draft);afterReset=false;}
    else if(e.op==="resolve")m.resolve(e.token,e.outcome);
    else if(e.op==="timeout")m.timeout(e.token);
    else if(e.op==="reset"||e.op==="pageshow"){m.move("empty",initial);afterReset=true;}
    else if(e.op==="pagehide"){m.move("empty",null);afterReset=false;}
    else throw Error("unknown controller operation "+e.op);
    return m.snap(afterReset,true);
  });
}
const exportCases={
  "export-gross-10":"gross-10-no-forward-preimage",
  "export-gross-13":"gross-13-half-tie",
  "export-lines-difference":"lines-difference"
};
function exportReport(f, byId) {
  const derived=solve(byId.get(exportCases[f.id]).input);
  assert(derived.ok);assert.deepEqual(f.input.result,derived.result);
  const ordered={schemaVersion:1,tool:"tax-included-converter",currency:"TWD",purpose:"estimate",result:derived.result};
  const utf8=JSON.stringify(ordered,null,2)+"\n";
  const b=Buffer.from(utf8,"utf8");
  assert(!utf8.startsWith("\uFEFF") && utf8.endsWith("}\n") && !utf8.includes("\r"));
  return {filename:"tax-included-estimate.json",mime:"application/json;charset=utf-8",utf8};
}
const sha=b=>createHash("sha256").update(b).digest("hex");
const blob=b=>createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");
function loadDoc(dir){
  return Object.fromEntries(baseDocs.map(n=>[n,readFileSync(join(dir,n))]));
}
function outlines(md){
  return [...md.matchAll(/^## (\w+)\s*$/gm)].map(m=>m[1]);
}
const newDir=process.argv[2],oldDir=process.argv[3];
if(!newDir||!oldDir)throw Error("Usage: node verify.mjs <candidate-tax-spec-directory> <original-tax-spec-directory>");
const doc=loadDoc(newDir),old=loadDoc(oldDir);
const spec=doc["SPEC.md"].toString("utf8");
const oldSpec=old["SPEC.md"].toString("utf8");
assert.deepEqual(outlines(spec),sectionNames);
assert.deepEqual(outlines(oldSpec),sectionNames.slice(0,4));
assert(oldSpec.endsWith("...[truncated 9113 chars]")||oldSpec.trimEnd().endsWith("...[truncated 9113 chars]"));
assert(!spec.includes("...[truncated"));
const acceptance=spec.slice(spec.indexOf("\n## acceptance"),spec.indexOf("\n## tests"));
for(const id of productAspects)assert(acceptance.includes("| "+id+" |"));
const f=JSON.parse(doc["fixtures.json"]);
assert.equal(f.productChecks,"NOT_RUN");
const b=JSON.parse(old["fixtures.json"]);
const byId=new Map(f.cases.map(c=>[c.id,c]));
assert.equal(byId.size,f.cases.length);
const priorCases=b.cases.map(c=>{
  const n=byId.get(c.id);
  assert(n && n.kind===c.kind); assert.deepEqual(c.input,n.input);
  let fieldsAdded=[];
  if(c.kind==="core"&&c.expected.ok&&c.expected.result.basis==="gross"){
    const {forwardGross,forwardDifference,...oldPart}=n.expected.result;
    assert.deepEqual(oldPart,c.expected.result);
    assert.equal(forwardGross,oldPart.gross);assert.equal(forwardDifference,0);
    fieldsAdded=["forwardGross","forwardDifference"];
  }else assert.deepEqual(c.expected,n.expected);
  return {id:c.id,fieldsAdded};
});
const cases=f.cases.map(c=>{
  const derived=c.kind==="core"?solve(c.input):c.kind==="controller"?controller(c):exportReport(c,byId);
  let status="PASS";try{assert.deepEqual(derived,c.expected);}catch{status="FAIL";}
  const out={id:c.id,kind:c.kind,input:c.input,expected:c.expected,derived,status};
  if(c.kind==="export"){const bytes=Buffer.from(derived.utf8);out.download={bytes:bytes.length,sha256:sha(bytes)};}
  return out;
});
const probes=[];
const requireResult=(id,input,want)=>{
  const got=solve(input);assert.deepEqual(got,want);
  probes.push({id,input,expected:want,derived:got});
};
const gross=(amount,ratePercent)=>({...initial,basis:"gross",amount,ratePercent});
const grossResult=(ratePercent,net,tax,g,forwardGross,forwardDifference)=>
  ok({mode:"single",basis:"gross",ratePercent,net,tax,gross:g,forwardGross,forwardDifference});
requireResult("max-gross-rate",gross("999999999999","100"),grossResult("100",500000000000,499999999999,999999999999,1000000000000,1));
requireResult("gross-zero-rate-minimum",gross("0","0.01"),grossResult("0.01",0,0,0,0,0));
requireResult("subcent-rate",gross("1","0.001"),error("DECIMAL_FORMAT","ratePercent"));
requireResult("basis-before-inactive", {...initial,basis:null,lines:[{amount:"10"}]},error("EMPTY","basis"));
let getterCalls=0;
const getterInput={...initial};
Object.defineProperty(getterInput,"amount",{enumerable:true,get(){getterCalls++;return "10";}});
assert.deepEqual(solve(getterInput),error("SCHEMA"));assert.equal(getterCalls,0);
probes.push({id:"getter-not-invoked",getterCalls,expected:"SCHEMA"});
const holeInput={...initial,mode:"lines",basis:null,amount:null,lines:new Array(1)};
assert.deepEqual(solve(holeInput),error("SCHEMA"));
probes.push({id:"sparse-array",expected:"SCHEMA"});
const withSymbol={...initial};withSymbol[Symbol("extra")]=0;
assert.deepEqual(solve(withSymbol),error("SCHEMA"));
probes.push({id:"unknown-symbol",expected:"SCHEMA"});

let grossSweep=0,forwardSweep=0;
const sampleRates=new Set([1n,51n,400n,500n,10000n]);
for(let p=1n;p<unit;p+=37n)sampleRates.add(p);
for(const p of sampleRates)for(let k=0n;k<=100n;k++){
  const g=reverse(k,p);
  assert(g.difference>=-1n&&g.difference<=1n);grossSweep++;
  const fx=forward(k,p), inv=reverse(fx,p);
  assert(inv.net===k&&inv.again===fx&&inv.difference===0n);forwardSweep++;
}
const exactProbes=[
  {input:"10 at 5%",net:10,netBefore:"200/21",forwardBefore:asSafe(forward(9n,500n)),forwardAfter:asSafe(forward(10n,500n))},
  {input:"13 at 4%",net:13,netBefore:"25/2",taxFirst:asSafe(round(13n*400n,10400n)),forwardBefore:asSafe(forward(12n,400n)),forwardAfter:asSafe(forward(13n,400n))},
  {input:"99 at 0.51%",net:98,netBefore:"990000/10051",forwardBefore:asSafe(forward(98n,51n)),forwardAfter:asSafe(forward(99n,51n))}
];
const meta=rows=>Object.fromEntries(Object.entries(rows).map(([n,b])=>[n,{bytes:b.length,blob:blob(b),sha256:sha(b)}]));
const failed=cases.filter(c=>c.status!=="PASS");
console.log(JSON.stringify({summary:{pass:cases.length-failed.length,total:cases.length,core:cases.filter(c=>c.kind==="core").length,
  controller:cases.filter(c=>c.kind==="controller").length,export:cases.filter(c=>c.kind==="export").length,legacy:priorCases.length,
  oldExpectedPreserved:priorCases.filter(c=>!c.fieldsAdded.length).length,legacyGrossExtended:priorCases.filter(c=>c.fieldsAdded.length).length,
  grossSweep,forwardSweep,extraProbes:probes.length},docs:{sections:outlines(spec),priorSections:outlines(oldSpec),productAspects,
   original:meta(old),candidate:meta(doc)},priorCases,cases,probes,exactProbes},null,2));
if(failed.length)process.exitCode=1;
