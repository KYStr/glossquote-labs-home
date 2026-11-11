import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}
export function blobSha(data) {
  return createHash('sha1').update('blob ' + data.length + '\0').update(data).digest('hex');
}

const abs = (v) => v < 0n ? -v : v;
const gcd = (a, b) => b === 0n ? abs(a) : gcd(b, a % b);
export class Q {
  constructor(n, d=1n) {
    n = BigInt(n); d = BigInt(d);
    if (!d) throw new RangeError('division by zero');
    if (d < 0n) { n = -n; d = -d; }
    const c = gcd(n,d); this.n=n/c; this.d=d/c;
  }
  static decimal(s) {
    const [a,b=''] = String(s).split('.');
    return new Q(BigInt(a+b),10n**BigInt(b.length));
  }
  add(q) { return new Q(this.n*q.d+q.n*this.d,this.d*q.d); }
  sub(q) { return new Q(this.n*q.d-q.n*this.d,this.d*q.d); }
  mul(q) { return new Q(this.n*q.n,this.d*q.d); }
  div(q) { return new Q(this.n*q.d,this.d*q.n); }
  cmp(q) { const n=this.n*q.d-q.n*this.d; return n>0n?1:n<0n?-1:0; }
  round(places=0) {
    const scale=10n**BigInt(places), magnitude=abs(this.n)*scale;
    const rounded=(2n*magnitude+this.d)/(2n*this.d);
    return Number((this.n<0n?-1n:1n)*rounded)/Number(scale);
  }
  toJSON() { return this.d===1n?String(this.n):this.n+'/'+this.d; }
}
export const dec=Q.decimal;

export const error = (code,field=null) => ({ok:false,error:{code,field,row:null}});
export const ok = (result) => ({ok:true,result});
export const isPlain = (obj) => obj !== null && typeof obj === 'object' && Object.getPrototypeOf(obj) === Object.prototype;
export function exactStrings(obj, keys) {
  if (!isPlain(obj) || Reflect.ownKeys(obj).length !== keys.length) return false;
  return keys.every(k=>typeof Object.getOwnPropertyDescriptor(obj,k)?.value==='string');
}
export const digits = /^(0|[1-9][0-9]*)$/u;
export const match = (str,pattern) => str.match(pattern)?.[0]===str;
export function numericFormat(s, places) {
  return match(s, places===0?digits:new RegExp('^(0|[1-9][0-9]*)(?:\\.[0-9]{1,'+places+'})?$','u'));
}
export function basicText(s, capacity, active=true) {
  if (s.length>capacity) return 'INPUT_LIMIT';
  if (!s.isWellFormed()) return 'UNICODE';
  if (active && s==='') return 'EMPTY';
  return null;
}
export const inRange = (q,lo,hi) => q.cmp(dec(lo))>=0 && q.cmp(dec(hi))<=0;
export function canonicalReport(result) {
  function order(x) {
    if (Array.isArray(x)) return x.map(order);
    if (x!==null&&typeof x==='object') return Object.fromEntries(Object.keys(x).sort().map(k=>[k,order(x[k])]));
    return x;
  }
  const value=JSON.stringify(order(result))+'\n';
  return {value,bytes:Buffer.byteLength(value),sha256:sha256(value)};
}

export function exercise(importUrl,{slug,pr,fixtureBlob,expectedCount,core,controller,extra,decode=(value)=>value}) {
  const path = process.argv[2] ?? new URL('./fixed-fixtures.json', importUrl);
  const fixtureBytes=readFileSync(path);
  const actualGitBlob=blobSha(fixtureBytes);
  if(actualGitBlob!==fixtureBlob)throw new Error('fixture blob differs from fixed GitHub version: '+actualGitBlob);
  const fixture=decode(JSON.parse(fixtureBytes));
  if(fixture.slug!==slug||fixture.cases.length!==expectedCount)throw new Error('fixture scope mismatch');
  const rows=fixture.cases.map(({id,kind,input,expected})=>{
    let independentlyDerived;
    let checks;
    if(kind==='core') independentlyDerived=core(input);
    else if(kind==='controller') ({derived:independentlyDerived,checks}=controller(id,input));
    else throw new Error('unrecognized fixture kind: '+kind);
    return {id,kind,input,declared:expected,independentlyDerived,checks,
      match:isDeepStrictEqual(independentlyDerived,expected)&&(checks??[]).every(c=>c.pass)};
  });
  const result={node:process.version,pr,slug,fixtureGitBlob:actualGitBlob,fixtureSha256:sha256(fixtureBytes),
    coreMatches:rows.filter(r=>r.kind==='core'&&r.match).length,
    coreTotal:rows.filter(r=>r.kind==='core').length,
    controllerMatches:rows.filter(r=>r.kind==='controller'&&r.match).length,
    controllerTotal:rows.filter(r=>r.kind==='controller').length,
    rows,extra:extra?.()};
  console.log(JSON.stringify(result,null,2));
  process.exitCode=rows.every(r=>r.match)?0:1;
}

export class ReferenceState {
  constructor(run,defaults) {
    this.run=run; this.defaults=defaults; this.reset();
  }
  generation=0;
  state='empty';
  draft;
  result=null;
  error=null;
  invalidate(state) {
    ++this.generation; this.state=state; this.result=null; this.error=null;
    return this.generation;
  }
  reset() { this.draft=this.defaults; this.invalidate('empty'); }
  edit(input) { this.draft=input; this.invalidate('dirty'); }
  start(input=this.draft) { this.draft=input; return this.invalidate('busy'); }
  finish(token,reply=this.run(this.draft)) {
    if (token!==this.generation || this.state!=='busy') return;
    if(reply.ok) { this.state='success'; this.result=reply.result; }
    else { this.state='error'; this.error=reply.error; }
  }
  cancel() { this.invalidate('cancelled'); }
  snapshot({draft=false,reportKey='reportAvailable'}={}) {
    return {state:this.state,[reportKey]:this.state==='success',...(draft?{draft:this.draft}:{}),...(this.error?{error:this.error}:{})};
  }
}
export const checkValue = (check, observed, independentlyDerived) =>
  ({check,observed,independentlyDerived,pass:isDeepStrictEqual(observed,independentlyDerived)});

export const standardController = (evaluate,defaults) => (id,i) => {
  const m=new ReferenceState(evaluate,defaults);
  if(id==='state-dirty-error'){
    m.finish(m.start(i.initial));const afterRun=m.snapshot();m.edit(i.edit);const afterEdit=m.snapshot();m.finish(m.start());
    return {derived:{afterRun,afterEdit,afterRerun:m.snapshot()}};
  }
  if(id==='state-cancel-late'){
    const token=m.start(i.draft),whilePending=m.snapshot();m.cancel();
    const afterCancel=m.snapshot({draft:true}),late=evaluate(i.draft);
    m.finish(token,late);const afterLateResult=m.snapshot();m.reset();
    return {derived:{whilePending,afterCancel,afterLateResult,afterReset:m.snapshot({draft:true})},
      checks:[checkValue('lateResult from cancelled draft',i.lateResult,late.result)]};
  }
  if(id==='state-replace-late'){
    const token=m.start(i.olderDraft);m.finish(m.start(i.newerDraft));const afterNewerResult=m.snapshot();
    const late=evaluate(i.olderDraft);m.finish(token,late);
    return {derived:{afterNewerResult,afterOlderLateResult:m.snapshot()},
      checks:[checkValue('olderLateResult from replaced draft',i.olderLateResult,late.result)]};
  }
  throw new Error('unknown fixture '+id);
};
