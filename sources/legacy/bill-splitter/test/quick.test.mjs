import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuickSettlement, calculatePaidSettlement, calculateBill } from '../public/js/core/split.mjs';
import { buildReport } from '../public/js/core/report.mjs';
function draft(paid, precision = 2) { return { precision, people: paid.map((value, i) => ({ id: i + 1, name: ['A','B','C','D'][i] ?? `Fake ${i + 1}`, paid: value })) }; }
const error = (fn, code, field) => assert.throws(fn, e => e.code === code && (!field || e.fieldId === field));
test('U14-1/2 exact quick settlements from paid amounts only', () => {
  const r = calculateQuickSettlement(draft(['900','300','0']));
  assert.equal(r.total,120000n); assert.deepEqual(r.people.map(p=>p.share),[40000n,40000n,40000n]);
  assert.deepEqual(r.transfers,[{fromIndex:1,toIndex:0,amount:10000n},{fromIndex:2,toIndex:0,amount:40000n}]);
  assert.deepEqual(calculateQuickSettlement(draft(['1200','600','0','0'])).transfers,[{fromIndex:2,toIndex:0,amount:45000n},{fromIndex:3,toIndex:0,amount:30000n},{fromIndex:3,toIndex:1,amount:15000n}]);
});
test('U14-3/4/5 precision, zero/blank, even payments and smallest unit', () => {
  for(const [precision,expected,transfer] of [[2,[3334n,3333n,3333n],3333n],[0,[34n,33n,33n],33n]]) {
    const r=calculateQuickSettlement(draft(['100','0','0'],precision)); assert.deepEqual(r.people.map(p=>p.share),expected); assert.deepEqual(r.transfers,[{fromIndex:1,toIndex:0,amount:transfer},{fromIndex:2,toIndex:0,amount:transfer}]);
  }
  for(const paid of [['0','0','0'],['','','']]) { const r=calculateQuickSettlement(draft(paid)); assert.equal(r.total,0n); assert.deepEqual(r.people.map(p=>p.share),[0n,0n,0n]); assert.deepEqual(r.balances,[0n,0n,0n]); assert.deepEqual(r.transfers,[]); }
  assert.deepEqual(calculateQuickSettlement(draft(['10','10'])).transfers,[]);
  const tiny=calculateQuickSettlement(draft(['0.01','0','0'])); assert.deepEqual(tiny.people.map(p=>p.share),[1n,0n,0n]); assert.deepEqual(tiny.transfers,[]);
});
test('U14 limits, schema, names and exact fields; advanced still rejects zero total', () => {
  for(const precision of [0,2]) {
    const max=precision===0?'99999999':'99999999.99'; assert.equal(calculateQuickSettlement(draft([max,'0'],precision)).total,precision===0?99999999n:9999999999n);
    error(()=>calculateQuickSettlement(draft([max,precision===0?'1':'0.01'],precision)),'PAID_TOTAL_MAX','people');
  }
  for(const length of [2,50]) assert.equal(calculateQuickSettlement(draft(Array(length).fill('0'))).people.length,length);
  for(const length of [1,51]) error(()=>calculateQuickSettlement(draft(Array(length).fill('0'))),'PEOPLE_COUNT');
  for(const raw of ['-1','+1','1e2','1,000','.5','1.','NaN','1.001']) error(()=>calculateQuickSettlement(draft([raw,'0'])),'AMOUNT_FORMAT','paid-1');
  error(()=>calculateQuickSettlement({...draft(['1','0']),total:'bad'}),'INPUT_SCHEMA');
  const d=draft(['1','0']); d.people[0].name='__proto__'; d.people[1].name='__proto__'; assert.notEqual(calculateQuickSettlement(d).people[0].id,calculateQuickSettlement(d).people[1].id);
  d.people[0].name='<img src=x onerror=alert(1)>'; assert.equal(calculateQuickSettlement(d).people[0].name,d.people[0].name);
  d.people[0].name='A\u2028'; error(()=>calculateQuickSettlement(d),'NAME_CONTROL','name-1');
  error(()=>calculateBill({total:'0',precision:2,mode:'equal',settlement:false,people:[{id:1,name:'A',weight:'1',paid:''},{id:2,name:'B',weight:'1',paid:''}]}),'AMOUNT_ZERO','total');
});
test('U14 revised advanced: weighted auto sum, zero-share payer, zero paid, exact schema and hidden invalid weight',()=>{
  const d={precision:2,mode:'shares',people:[{id:1,name:'A',paid:'900',weight:'2'},{id:2,name:'B',paid:'300',weight:'1'},{id:3,name:'C',paid:'0',weight:'1'}]};
  let r=calculatePaidSettlement(d);assert.equal(r.total,120000n);assert.deepEqual(r.people.map(p=>p.share),[60000n,30000n,30000n]);assert.deepEqual(r.transfers,[{fromIndex:2,toIndex:0,amount:30000n}]);
  d.people[0].weight='0';r=calculatePaidSettlement(d);assert.deepEqual(r.people.map(p=>p.share),[0n,60000n,60000n]);assert.deepEqual(r.transfers,[{fromIndex:1,toIndex:0,amount:30000n},{fromIndex:2,toIndex:0,amount:60000n}]);
  d.people.forEach(p=>{p.weight='0';});error(()=>calculatePaidSettlement(d),'WEIGHTS_ZERO','people');
  d.people.forEach(p=>{p.paid='0';});error(()=>calculatePaidSettlement(d),'WEIGHTS_ZERO');d.people[1].weight='1';r=calculatePaidSettlement(d);assert.equal(r.total,0n);assert.deepEqual(r.transfers,[]);
  d.mode='equal';d.people.forEach(p=>{p.weight='hidden invalid';});assert.deepEqual(calculatePaidSettlement(d).people.map(p=>p.weight),[1,1,1]);
  error(()=>calculatePaidSettlement({...d,total:'100'}),'INPUT_SCHEMA');error(()=>calculatePaidSettlement({...d,settlement:false}),'INPUT_SCHEMA');
  d.people[0].paid='99999999.99';d.people[1].paid='0.01';error(()=>calculatePaidSettlement(d),'PAID_TOTAL_MAX','people');
});
test('U14 revised advanced: 300 independent weighted quota and settlement cases',()=>{
 for(let seed=0;seed<300;seed++){
  const n=2+seed%49,d={precision:seed%2?0:2,mode:'shares',people:Array.from({length:n},(_,i)=>({id:i+1,name:`Fake ${i+1}`,paid:String((seed*(i+1)*7+i*13)%1000),weight:String((seed+i*19)%1001)}))};d.people[0].weight='1';const before=structuredClone(d),r=calculatePaidSettlement(d),W=d.people.reduce((s,p)=>s+BigInt(p.weight),0n);
  assert.equal(r.total,r.people.reduce((s,p)=>s+p.paid,0n));assert.equal(r.total,r.people.reduce((s,p)=>s+p.share,0n));assert.deepEqual(d,before);assert.deepEqual(calculatePaidSettlement(d),r);
  r.people.forEach((p,i)=>{if(p.weight===0)assert.equal(p.share,0n);const delta=p.share*W-r.total*BigInt(p.weight);assert.ok(delta>-W&&delta<W);const outgoing=r.transfers.filter(t=>t.fromIndex===i).reduce((s,t)=>s+t.amount,0n),incoming=r.transfers.filter(t=>t.toIndex===i).reduce((s,t)=>s+t.amount,0n);assert.equal(p.paid-p.share+outgoing-incoming,0n);});for(const t of r.transfers){assert.ok(t.amount>0n);assert.notEqual(t.fromIndex,t.toIndex);}
 }
});
test('U14 weighted report semantics: advanced Share is distinct from quick Equal share; transfers always first',()=>{
 const d={precision:2,mode:'shares',people:[{id:1,name:'A',paid:'900',weight:'2'},{id:2,name:'B',paid:'300',weight:'1'},{id:3,name:'C',paid:'0',weight:'1'}]},r=calculatePaidSettlement(d);
 for(const locale of ['en','zh-Hant']){
  const text=buildReport(r,locale),transfer=locale==='en'?'#3 C pays #1 A 300.00':'#3 C 支付 #1 A 300.00';assert.ok(text.indexOf(transfer)<text.indexOf(locale==='en'?'Total:':'總額:'));assert.ok(text.includes(locale==='en'?'| Share: 600.00':'| 應分攤: 600.00'));assert.ok(text.includes(locale==='en'?'Shares: 2':'份數: 2'));assert.ok(!text.includes('Equal share'));
 }
 assert.ok(buildReport(calculateQuickSettlement(draft(['900','300','0'])),'en').includes('Equal share: 400.00'));
});
test('U14 report starts with settlement; both templates preserve TXT format and zero truth', () => {
  const r=calculateQuickSettlement(draft(['900','300','0']));
  for(const locale of ['en','zh-Hant']) { const text=buildReport(r,locale); const transfer=locale==='en'?'#2 B pays #1 A 100.00':'#2 B 支付 #1 A 100.00'; assert.ok(text.indexOf(transfer)<text.indexOf(locale==='en'?'Total:':'總額:')); assert.ok(text.includes('1,200.00')); assert.ok(!text.includes('\r')&&!text.startsWith('\ufeff')&&text.endsWith('\n')&&!text.endsWith('\n\n')); assert.ok(!text.includes('-0.00')); const zero=buildReport(calculateQuickSettlement(draft(['0','0','0'])),locale); assert.ok(zero.includes(locale==='en'?'Nobody has paid':'目前沒有人付款')); }
});
test('U14 300 independent quick invariants: sum, quota, settlement, reproducibility, input immutability', () => {
  for(let seed=0;seed<300;seed++) {
    const length=2+seed%49, d=draft(Array.from({length},(_,i)=>String((seed*(i+1)*13+i*17)%10000)),seed%2===0?2:0), before=structuredClone(d);
    const r=calculateQuickSettlement(d), n=BigInt(length), paidSum=d.people.reduce((sum,p)=>sum+BigInt(p.paid)*(d.precision===2?100n:1n),0n);
    assert.equal(r.total,paidSum); assert.equal(r.people.reduce((sum,p)=>sum+p.share,0n),paidSum); assert.deepEqual(calculateQuickSettlement(d),r); assert.deepEqual(d,before);
    r.people.forEach((p,i)=>{const delta=p.share*n-r.total; assert.ok(delta>-n&&delta<n); const incoming=r.transfers.filter(t=>t.toIndex===i).reduce((sum,t)=>sum+t.amount,0n), outgoing=r.transfers.filter(t=>t.fromIndex===i).reduce((sum,t)=>sum+t.amount,0n); assert.equal(p.paid-p.share+outgoing-incoming,0n);});
    for(const t of r.transfers){assert.ok(t.amount>0n);assert.notEqual(t.fromIndex,t.toIndex);}
  }
});
