import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {audit, checkpoint as p, err, own, plain, reportOf} from './recheck-lib.mjs';

const lengthFt = [3048n,10000n];
const basis = {
  ping:[400n,121n], m2:[1n,1n], ft2:[lengthFt[0]**2n,lengthFt[1]**2n], tatami:[162n,100n]
};
const decimal = /^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,3})?$/;
function fraction(s) {
  const [whole,frac=''] = s.split('.');
  return [BigInt(whole+frac),10n**BigInt(frac.length)];
}
// Use quotient and remainder to settle ties; no approximate double participates in rounding.
function halfUp(n,d,places) {
  const magnitude=10n**BigInt(places);
  const scaled=n*magnitude;
  const rounded=(scaled/d)+(2n*(scaled%d)>=d?1n:0n);
  return Number(rounded)/Number(magnitude);
}
function convert(n,d,u,b=basis) {
  const [a,z]=b[u];
  return Object.fromEntries(Object.entries(basis).map(([unit,[v,w]])=>[
    unit, halfUp(n*a*w,d*z*v,unit==='tatami'?1:2)
  ]));
}
function validate(s,field,limit) {
  if (s.length>limit) return err('INPUT_LIMIT',field);
  if (!s.isWellFormed()) return err('UNICODE',field);
  if (!s.length) return err('EMPTY',field);
  return null;
}
function run(x) {
  if (!plain(x) || Reflect.ownKeys(x).length!==2 || !['amount','unit'].every(
    k=>typeof Object.getOwnPropertyDescriptor(x,k)?.value==='string')) return err('SCHEMA');
  const a=validate(x.amount,'amount',12); if (a) return a;
  if (!decimal.test(x.amount)) return err('DECIMAL_FORMAT','amount');
  const [n,d]=fraction(x.amount);
  if (n<=0n||n>1000000n*d) return err('RANGE','amount');
  const u=validate(x.unit,'unit',6); if (u) return u;
  if (!own(basis,x.unit)) return err('ENUM','unit');
  return {ok:true,result:convert(n,d,x.unit)};
}
const settle=draft=> {
  const outcome=run(draft);
  return outcome.ok?p('success',true):p('error',false,{error:outcome.error});
};
const empty={amount:'',unit:'ping'};
function checkPayload(draft,result) {
  if (!isDeepStrictEqual(run(draft).result,result)) throw new Error('Injected worker payload differs from independent calculation');
}
function nonCore(id,i) {
  switch(id) {
    case 'quick-table-1-100':
      return {rows:Array.from({length:100},(_,j)=>{
        const ping=j+1;
        const {m2,ft2}=convert(BigInt(ping),1n,'ping');
        return {ping,m2,ft2};
      })};
    case 'state-dirty-error':
      return {afterRun:settle(i.initial),afterEdit:p('dirty',false),afterRerun:settle(i.edit)};
    case 'state-cancel-late':
      checkPayload(i.draft,i.lateResult);
      return {whilePending:p('busy',false),afterCancel:p('cancelled',false,{draft:i.draft}),
        afterLateResult:p('cancelled',false),afterReset:p('empty',false,{draft:empty})};
    case 'state-replace-late':
      checkPayload(i.olderDraft,i.olderLateResult);
      return {afterNewerResult:settle(i.newerDraft),afterOlderLateResult:settle(i.newerDraft)};
    default: throw new Error('Unknown scenario '+id);
  }
}
const makeReport = (result,input) => reportOf({input,result});
function additional() {
  const approximation={...basis,ping:[33058n,10000n]};
  const compare = value => {
    const n=BigInt(value);
    const exact=convert(n,1n,'ping'), approx=convert(n,1n,'ping',approximation);
    return {input:{amount:String(value),unit:'ping'},exactFT2:exact.ft2,approxFT2:approx.ft2,
      distinguished:exact.ft2!==approx.ft2};
  };
  const input={amount:'30',unit:'ping'};
  const got=makeReport(run(input).result,input);
  const want={bytes:99,sha256:'2363e57e7570dae35a9830eaa3d86b003ca73be825cabeebd297d24f3f14dc20'};
  const oldExample = compare(30);
  const corrected = compare(100);
  assert.deepEqual([oldExample.exactFT2,oldExample.approxFT2], [1067.50,1067.50]);
  assert.deepEqual([corrected.exactFT2,corrected.approxFT2], [3558.32,3558.33]);
  assert.deepEqual(got,want);
  const fixture = JSON.parse(readFileSync(process.argv[2],'utf8'));
  const table = fixture.cases.find(c => c.id === 'quick-table-1-100').expected.rows;
  for (const [quantity,id] of [[30,'example-thirty-ping'],[100,'hundred-ping-precision']]) {
    const {m2,ft2} = fixture.cases.find(c => c.id === id).expected.result;
    assert.deepEqual(table[quantity-1],{ping:quantity,m2,ft2});
  }
  return [{id:'PING-01',status:'PASS',previousExample:oldExample,correctedExample:corrected},
    {id:'pinned-download',input,derived:got,literal:want,match:isDeepStrictEqual(got,want)}];
}
audit({fixtureSHA:'8d8c00c25b78a564574666cef43b458530edf9722fc85055b4180b1bea4badf9',
  run,runController:nonCore,additional,makeReport});
