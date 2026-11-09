import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTarget } from '../public/js/core/calculate-target.js';

const request = (targetRaw = '70', pairs = [['100', '']]) => ({ targetRaw, rows: pairs.map(([weightRaw,scoreRaw], i) => ({ id: `r${i+1}`, nameRaw: `項目 ${i+1}`, weightRaw, scoreRaw })) });
const expected = (status, targetHundredths, earnedNumerator, earnedDisplay, remainingWeightBp, requiredAverageHundredths, maximumPossibleNumerator, maximumPossibleDisplay) => ({ ok: true, result: { schemaVersion: 1, status, targetHundredths, earnedNumerator, earnedDisplay, remainingWeightBp, requiredAverageHundredths, maximumPossibleNumerator, maximumPossibleDisplay } });
const cases = [
  ['C01', '70', [['40','80'],['60','']], expected('target_feasible','7000','32000000','32.00','6000','6334','92000000','92.00')],
  ['C02', '60', [['50','80'],['50','0']], expected('complete_missed','6000','40000000','40.00','0',null,'40000000','40.00')],
  ['C03', '30', [['40','100'],['60','']], expected('target_already_met','3000','40000000','40.00','6000','0','100000000','100.00')],
  ['C04', '60', [['90','50'],['10','']], expected('target_unreachable','6000','45000000','45.00','1000',null,'55000000','55.00')],
  ['C05', '70', [['20',''],['80','']], expected('target_feasible','7000','0','0.00','10000','7000','100000000','100.00')],
  ['C06', '70', [['50','60'],['50','80']], expected('complete_met','7000','70000000','70.00','0',null,'70000000','70.00')],
  ['C07', '70', [['50','69.99'],['50','70']], expected('complete_missed','7000','69995000','70.00','0',null,'69995000','70.00')],
  ['C08', '100', [['0.01','100'],['99.99','']], expected('target_feasible','10000','10000','0.01','9999','10000','100000000','100.00')],
  ['C09', '50.01', [['99.99','50'],['0.01','']], expected('target_unreachable','5001','49995000','50.00','1',null,'50005000','50.01')],
  ['C10', '60', [['30','50'],['70','']], expected('target_feasible','6000','15000000','15.00','7000','6429','85000000','85.00')],
  ['C11', '70.50', [['40','80.0'],['60','']], expected('target_feasible','7050','32000000','32.00','6000','6417','92000000','92.00')],
  ['C12', '070.5', [['040.00','080.0'],['060','']], expected('target_feasible','7050','32000000','32.00','6000','6417','92000000','92.00')],
  ['C19', '70', [['40','80'],['60','0']], expected('complete_missed','7000','32000000','32.00','0',null,'32000000','32.00')],
  ['C25a', '0'.repeat(31)+'1', [['100','']], expected('target_feasible','100','0','0.00','10000','100','100000000','100.00')]
];
for (const [id,target,pairs,oracle] of cases) test(id, () => { assert.deepEqual(calculateTarget(request(target,pairs)), oracle); });
const err = (input, code, field) => assert.deepEqual(calculateTarget(input), { ok:false, error: { code, field } });
for (const [id, input, code, field] of [
  ['C13', request('70',[['40','80'],['59.99','']]), 'weight_total_mismatch','rows'],
  ...[['C14','70.123'],['C15','7e1'],['C16',' 70'],['C17','７０']].map(([id,raw]) => [id,request(raw),'invalid_target_format','targetRaw']),
  ['C18',request('70',[['0',''],['100','']]),'weight_out_of_range','rows.0.weightRaw'],
  ['weight 100.01 upper bound',request('70',[['100.01','']]),'weight_out_of_range','rows.0.weightRaw'],
  ['C20',{...request(),debug:'CANARY-DO-NOT-ECHO'},'invalid_schema','request'],
  ['C22',{targetRaw:'70',rows:Array(1)},'invalid_schema','rows'],
  ['C25',request('0'.repeat(33)),'raw_too_long','targetRaw'],
  ['C28',request('70',Array.from({length:41},()=>['1',''])),'invalid_rows_count','rows'],
  ['C29',request('70',[['100','100.001']]),'invalid_score_format','rows.0.scoreRaw'],
  ['C30',request('70',[['100','100.01']]),'score_out_of_range','rows.0.scoreRaw'],
  ['C31',request('70',[['1'+'0'.repeat(32),'']]),'raw_too_long','rows.0.weightRaw']
]) test(id, () => err(input,code,field));
test('C21 getters are never invoked; root descriptor paths', () => {
  for (const key of ['targetRaw','rows']) {
    let calls = 0; const input = request();
    Object.defineProperty(input,key,{ enumerable:true, get() { calls++; throw new Error('CANARY'); } });
    err(input,'invalid_schema',`request.${key}`); assert.equal(calls,0);
  }
});
test('C23 unknown, symbol, non-enumerable keys, prototypes and descriptor traps', () => {
  for (const scope of ['root','row']) for (const kind of ['symbol','hidden','extra','prototype','nullPrototype']) {
    const input = request(); const obj = scope === 'root' ? input : input.rows[0];
    if (kind === 'symbol') obj[Symbol('CANARY')] = true;
    if (kind === 'hidden') Object.defineProperty(obj,'debug',{value:'CANARY'});
    if (kind === 'extra') obj.debug = true;
    if (kind === 'prototype') Object.setPrototypeOf(obj,{ inherited:true });
    if (kind === 'nullPrototype') Object.setPrototypeOf(obj,null);
    err(input,'invalid_schema',scope === 'root' ? 'request' : 'rows.0');
  }
  for (const key of ['id','nameRaw','weightRaw','scoreRaw']) {
    const input = request(); let calls=0;
    Object.defineProperty(input.rows[0],key,{enumerable:true,get() {calls++; return 'CANARY';}});
    err(input,'invalid_schema',`rows.0.${key}`); assert.equal(calls,0);
  }
  for (const trap of ['getPrototypeOf','ownKeys','getOwnPropertyDescriptor']) {
    const input = new Proxy(request(),{[trap]() { throw new Error('CANARY'); }});
    const result = calculateTarget(input); assert.equal(result.error.code,'invalid_schema'); assert.equal(JSON.stringify(result).includes('CANARY'),false);
  }
});
test('C24 duplicate ID points at second row', () => { const input=request('70',[['40',''],['60','']]); input.rows[1].id='r1'; err(input,'duplicate_id','rows.1.id'); });
test('C26/C27 and Unicode name boundaries', () => {
  for (const name of ['x'.repeat(81),'x'.repeat(100000),'   ','\tA','A\u0000','\uD800','\uDC00',' '.repeat(81)+'A'+' '.repeat(79),null]) {
    const input=request(); input.rows[0].nameRaw=name; err(input,'invalid_name','rows.0.nameRaw');
  }
  for (const name of ['😀'.repeat(80),' '.repeat(40)+'x'.repeat(80)+' '.repeat(40),'e\u0301']) {
    const input=request(); input.rows[0].nameRaw=name; assert.equal(calculateTarget(input).ok,true);
  }
});
test('strict numeric grammar/type/length/range and validation order', () => {
  for (const raw of ['',null,70,'70\n','+70','-0','1e2','70,5','７０','70．5','70.','70.000','70 ',' 70','Infinity','NaN']) err(request(raw),'invalid_target_format','targetRaw');
  err(request('100.01'),'target_out_of_range','targetRaw');
  for (const key of ['weightRaw','scoreRaw']) {
    for (const raw of [null,1,'\n','1\n','+1','-0','1e1','1,0','１','1.','1.000']) {
      const input=request(); input.rows[0][key]=raw; err(input, key==='weightRaw'?'invalid_weight_format':'invalid_score_format',`rows.0.${key}`);
    }
    const input=request(); input.rows[0][key]='0'.repeat(33); err(input,'raw_too_long',`rows.0.${key}`);
  }
  for (const raw of [undefined,null,[],0,'',new Date()]) err(raw,'invalid_schema','request');
  err({targetRaw:'bad',rows:null},'invalid_target_format','targetRaw');
  for (const rows of [null,{},[],Array(41)]) err({targetRaw:'70',rows},'invalid_rows_count','rows');
});
test('array own keys/descriptors/prototype; never executes index getter', () => {
  for (const kind of ['extra','symbol','noncanonical','getter','hidden','arrayPrototype','throwingProxy']) {
    const input=request(); let calls=0;
    if (kind==='extra') input.rows.debug=true;
    if (kind==='symbol') input.rows[Symbol()]=true;
    if (kind==='noncanonical') input.rows['00']=input.rows[0];
    if (kind==='getter') Object.defineProperty(input.rows,'0',{enumerable:true,get() {calls++; return null;}});
    if (kind==='hidden') Object.defineProperty(input.rows,'0',{enumerable:false});
    if (kind==='arrayPrototype') Object.setPrototypeOf(input.rows,Object.create(Array.prototype));
    if (kind==='throwingProxy') input.rows=new Proxy(input.rows,{ownKeys() {throw Error('CANARY');}});
    err(input,kind==='arrayPrototype'?'invalid_rows_count':'invalid_schema','rows'); assert.equal(calls,0);
  }
});
test('IDs enforce ASCII 1–40, no trailing newline, case sensitive', () => {
  for (const id of ['',null,1,'x'.repeat(41),'_r','-r','中','r\n']) {const input=request(); input.rows[0].id=id; err(input,'invalid_id','rows.0.id');}
  const input=request('0',[['50',''],['50','']]); input.rows[0].id='R1'; input.rows[1].id='r1'; assert.equal(calculateTarget(input).ok,true);
});
test('C34 JSON roundtrip and frozen request remain unchanged', () => {
  const input=request('70',[['40','80'],['60','']]); const before=JSON.stringify(input);
  Object.freeze(input); Object.freeze(input.rows); input.rows.forEach(Object.freeze);
  const result=calculateTarget(input); assert.deepEqual(JSON.parse(JSON.stringify(result)),result); assert.equal(JSON.stringify(input),before);
});
test('40-row bound and exact zero target', () => {
  const result=calculateTarget(request('0',Array.from({length:40},()=>['2.50',''])));
  assert.deepEqual(result,expected('target_already_met','0','0','0.00','10000','0','100000000','100.00'));
});
