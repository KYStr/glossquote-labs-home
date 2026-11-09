import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCutPlan as calculate, buildReport } from '../public/js/core/cut-planner.mjs';

const row = (length = '49', quantity = '1', name = 'A', id = 'r1') => ({ id, nameRaw: name, lengthRaw: length, quantityRaw: quantity });
const req = (stock = '100', kerf = '0', rows = [row()], trim = '0') => ({ stockLengthRaw: stock, endTrimRaw: trim, kerfRaw: kerf, rows });
const c02 = () => req('100', '2', [row(), row('49', '1', 'B', 'r2')]);
const units = text => { const [a, b = ''] = text.split('.'); return BigInt(a) * 100n + BigInt(b.padEnd(2, '0')); };
const fmt = n => `${n / 100n}.${String(n % 100n).padStart(2, '0')}`;

// Independent arithmetic oracle: placements below are handwritten; no packing code.
function expected(request, placements) {
  const stock = units(request.stockLengthRaw), trim = units(request.endTrimRaw), kerf = units(request.kerfRaw), usable = stock - 2n * trim;
  const rows = request.rows.map((r, i) => ({ rowIndex: i, id: r.id, name: r.nameRaw.trim(), lengthMm: fmt(units(r.lengthRaw)), quantity: Number(r.quantityRaw) }));
  const sticks = placements.map((members, i) => {
    const pieces = members.map(([r, p]) => ({ rowIndex: r, pieceIndex: p, id: rows[r].id, name: rows[r].name, lengthMm: rows[r].lengthMm }));
    const pieceLength = pieces.reduce((sum, p) => sum + units(p.lengthMm), 0n), kerfLoss = kerf * BigInt(pieces.length - 1);
    return { stickIndex: i + 1, stockLengthMm: fmt(stock), trimLossMm: fmt(2n * trim), usableLengthMm: fmt(usable), pieces, pieceLengthMm: fmt(pieceLength), kerfLossMm: fmt(kerfLoss), usedLengthMm: fmt(pieceLength + kerfLoss), remainingLengthMm: fmt(usable - pieceLength - kerfLoss) };
  });
  const sum = key => sticks.reduce((a, s) => a + units(s[key]), 0n);
  return { schemaVersion: 1, algorithm: 'ffd-v1', settings: { stockLengthMm: fmt(stock), endTrimMm: fmt(trim), kerfMm: fmt(kerf), usableLengthMm: fmt(usable) }, rows, sticks,
    totals: { stockCount: sticks.length, pieceCount: request.rows.reduce((n, r) => n + Number(r.quantityRaw), 0), totalStockMm: fmt(stock * BigInt(sticks.length)), totalTrimLossMm: fmt(2n * trim * BigInt(sticks.length)), totalPieceMm: fmt(sum('pieceLengthMm')), totalKerfLossMm: fmt(sum('kerfLossMm')), totalUsedMm: fmt(sum('usedLengthMm')), totalRemainingMm: fmt(sum('remainingLengthMm')) } };
}
function balance(result) {
  assert.doesNotThrow(() => JSON.stringify(result));
  for (const s of result.sticks) {
    assert.equal(units(s.stockLengthMm), units(s.trimLossMm) + units(s.pieceLengthMm) + units(s.kerfLossMm) + units(s.remainingLengthMm));
    assert.ok(units(s.remainingLengthMm) >= 0n);
  }
  const t = result.totals;
  assert.equal(units(t.totalStockMm), units(t.totalTrimLossMm) + units(t.totalPieceMm) + units(t.totalKerfLossMm) + units(t.totalRemainingMm));
}
function success(request, placements) {
  const snapshot = structuredClone(request), result = calculate(request);
  assert.deepEqual(result, { ok: true, result: expected(snapshot, placements) });
  assert.deepEqual(request, snapshot); balance(result.result); return result.result;
}
function bad(request, code, field) {
  assert.deepEqual(calculate(request), { ok: false, error: { code, field } });
  assert.deepEqual(calculate(c02()), { ok: true, result: expected(c02(), [[[0, 1], [1, 1]]]) });
}
const single = [[[0, 1]]];
test('C01 exact fit without kerf', () => success(req('100', '0', [row('60'), row('40', '1', 'B', 'r2')]), [[[0, 1], [1, 1]]]));
test('C02 adjacent kerf exact fit', () => success(c02(), [[[0, 1], [1, 1]]]));
test('C03 kerf forces second stick', () => success(req('100', '2', [row('51'), row('48', '1', 'B', 'r2')]), [[[0, 1]], [[1, 1]]]));
test('C04 no kerf before first piece', () => success(req('100', '5', [row('99'), row('1', '1', 'B', 'r2')]), [[[0, 1]], [[1, 1]]]));
test('C05 first fit rescans earlier sticks', () => success(req('100', '0', ['70','60','40','30'].map((v, i) => row(v, '1', `P${i}`, `r${i}`))), [[[0, 1], [3, 1]], [[1, 1], [2, 1]]]));
test('C06 equal length retains original row order', () => success(req('100', '0', [row('60','1','Alpha'), row('60','1','Beta','r2'), row('40','1','Gamma','r3')]), [[[0, 1], [2, 1]], [[1, 1]]]));
test('C07 equal row piece order', () => success(req('100','0',[row('30','3')]), [[[0, 1], [0, 2], [0, 3]]]));
test('C08 200 pieces exact hundredths', () => {
  const r = success(req('4','0.01',[row('0.01','200')]), [Array.from({length:200},(_,i)=>[0,i+1])]);
  assert.equal(r.totals.totalPieceMm,'2.00'); assert.equal(r.totals.totalKerfLossMm,'1.99'); assert.equal(r.totals.totalRemainingMm,'0.01');
});
test('C09 row quantity maximum', () => bad(req('100','0',[row('1','201')]), 'out_of_range','rows.0.quantityRaw'));
test('C10 40 rows', () => success(req('100','0',Array.from({length:40},(_,i)=>row('0.01','1',`P${i}`,`r${i}`))), [Array.from({length:40},(_,i)=>[i,1])]));
test('C11 rejects 41 rows', () => bad(req('100','0',Array.from({length:41},(_,i)=>row('1','1','A',`r${i}`))), 'too_many_rows','rows'));
test('C12 12-character leading zeros', () => success(req('000000100000','0',[row('100000')]), single));
test('C13 raw 13 characters precedes numeric validity', () => {
  for (const key of ['stockLengthRaw','endTrimRaw','kerfRaw']) bad({...c02(),[key]:'0000000000001'},'raw_too_long',`request.${key}`);
  for (const key of ['lengthRaw','quantityRaw']) {const r=c02();r.rows[0][key]='0000000000001';bad(r,'raw_too_long',`rows.0.${key}`);}
});
test('C14 precision format', () => bad(req('1.001'), 'invalid_format','request.stockLengthRaw'));
test('C15 nonpositive usable', () => bad(req('0.02','0',[row('0.01')],'0.01'),'non_positive_usable','usableLength'));
test('C16 entire request fails for overlong piece', () => bad(req('100','0',[row('80.01')],'10'),'piece_exceeds_usable','rows.0.lengthRaw'));
test('C17 zero quantity', () => bad(req('100','0',[row('1','0')]),'out_of_range','rows.0.quantityRaw'));
test('C18 60 supplementary characters / 240 bytes', () => success(req('100','0',[row('49','1','🧰'.repeat(60))]), single));
test('C19 61 code points', () => bad(req('100','0',[row('49','1','a'.repeat(61))]),'invalid_name','rows.0.nameRaw'));

const zhSnapshot = `GlossQuote 長料裁切規劃
演算法：FFD v1（啟發式；不保證使用最少支原料）
模型：鋸縫只計相鄰成品；不計修邊切鋸與最後成品至餘料間鋸縫。餘料不保證可回用。
單位：mm
原料長度：100.00
每端修邊：0.00
相鄰件鋸縫：2.00
單支可用長度：100.00
原料支數：1
成品件數：2
原料總長：100.00
成品總長：98.00
兩端修邊總損耗：0.00
鋸縫總損耗：2.00
總已使用可用長度：100.00
餘料總長：0.00
平衡：100.00 = 98.00 + 0.00 + 2.00 + 0.00
原料 1（原料 100.00；修邊損耗 0.00；可用 100.00）
  1. A（需求列 r1，第 1 件）：49.00
  2. B（需求列 r2，第 1 件）：49.00
成品小計：98.00；鋸縫：2.00；已使用可用長度：100.00；餘料：0.00`;
const enSnapshot = `GlossQuote Cut Planner
Algorithm: FFD v1 (heuristic; does not guarantee the fewest stock sticks)
Model: Kerf is counted only between adjacent pieces; end-trim cuts and a final cut before leftover are excluded. Remaining length is not guaranteed reusable.
Unit: mm
Stock length: 100.00
End trim per end: 0.00
Kerf between adjacent pieces: 2.00
Usable length per stick: 100.00
Stock sticks: 1
Pieces: 2
Total stock length: 100.00
Total piece length: 98.00
Total end-trim loss: 0.00
Total kerf loss: 2.00
Total used usable length: 100.00
Total remaining: 0.00
Balance: 100.00 = 98.00 + 0.00 + 2.00 + 0.00
Stock 1 (stock 100.00; trim loss 0.00; usable 100.00)
  1. A (row r1, piece 1): 49.00
  2. B (row r2, piece 1): 49.00
Piece subtotal: 98.00; kerf: 2.00; used usable length: 100.00; remaining: 0.00`;
for (const [id, lang, text] of [['C20','zh-Hant',zhSnapshot],['C21','en',enSnapshot]]) test(`${id} complete report snapshot`, () => {
  const result = expected(c02(), [[[0,1],[1,1]]]); const before = structuredClone(result);
  assert.deepEqual(buildReport(result, lang), { ok:true, text, filename:'glossquote-cut-plan.txt', mimeType:'text/plain;charset=utf-8' });
  assert.deepEqual(result,before); assert.ok(!text.startsWith('\ufeff') && !text.endsWith('\n') && !text.includes('\r'));
});
function badReport(result, code, field, language='en') { assert.deepEqual(buildReport(result,language),{ok:false,error:{code,field}}); }
const validResult = () => expected(c02(), [[[0,1],[1,1]]]);
test('C22 total tampering', () => {const r=validResult();r.totals.totalStockMm='99.00';badReport(r,'inconsistent_result','result.totals.totalStockMm');});
test('C23 language before result', () => badReport(null,'invalid_language','language','zh'));
test('C24 duplicate id', () => {const r=c02();r.rows[1].id='r1';bad(r,'duplicate_id','rows.1.id');});
test('C25 fullwidth input', () => bad(req('１００'),'invalid_format','request.stockLengthRaw'));
test('C26 hundredths exact fit', () => success(req('0.05','0.01',[row('0.01','3')]), [[[0,1],[0,2],[0,3]]]));
test('C27 trim each stick', () => success(req('100','1',[row('90','2')],'5'), [[[0,1]],[[0,2]]]));
test('C28 all losses', () => success(req('10','0.2',[row('4','2')],'0.5'), [[[0,1],[0,2]]]));
test('C29 sparse array', () => bad(req('100','0',Array(1)),'invalid_request_schema','rows.0'));
test('C30 unknown owner', () => bad({...c02(),debug:true},'unknown_field','request'));
test('C31 accessor never executed', () => {const r=c02();let count=0;Object.defineProperty(r,'stockLengthRaw',{enumerable:true,get(){count++;return '100';}});bad(r,'invalid_request_schema','request.stockLengthRaw');assert.equal(count,0);});
function deepFreeze(v) { if(v&&typeof v==='object'){Object.values(v).forEach(deepFreeze);Object.freeze(v);}return v; }
test('C32 deterministic and nonmutating frozen input/result', () => {const r=deepFreeze(c02()), a=calculate(r), b=calculate(r);assert.deepEqual(a,b);assert.deepEqual(a,{ok:true,result:validResult()});balance(a.result);assert.equal(buildReport(deepFreeze(a.result),'en').ok,true);});
test('C33 controls and isolated surrogate', () => {for(const name of ['a\nb','\ud800','\udc00','a\u2028b','a\u2029b'])bad(req('100','0',[row('49','1',name)]),'invalid_name','rows.0.nameRaw');});
test('C34 first cumulative excess', () => bad(req('100','0',[row('1','150'),row('1','51','B','r2')]),'total_pieces_exceeded','rows.1.quantityRaw'));
test('C35 leading zero quantity', () => success(req('100','0',[row('49','000000000001')]),single));
test('C36 trim empty', () => bad(req('100','0',[row('49','1',' \u00a0 ')]),'invalid_name','rows.0.nameRaw'));
test('C37 trim retained canonical name', () => success(req('100','0',[row('49','1','  Pipe  ')]),single));
test('C38 unknown sensitive root key with getter', () => {const r=c02(), key='authorization_'+'x'.repeat(4096);let n=0;Object.defineProperty(r,key,{enumerable:true,get(){n++;return 'CREDENTIAL_SENTINEL';}});const actual=calculate(r);assert.deepEqual(actual,{ok:false,error:{code:'unknown_field',field:'request'}});assert.equal(n,0);assert.ok(!JSON.stringify(actual).includes(key)&&!JSON.stringify(actual).includes('SENTINEL'));});
test('C39 unknown sensitive row key with getter', () => {const r=c02();let n=0;Object.defineProperty(r.rows[0],'token=DO_NOT_ECHO',{get(){n++;return 'SENSITIVE_SENTINEL';}});bad(r,'unknown_field','rows.0');assert.equal(n,0);});
test('C40 unknown symbol owner', () => {const a=c02(),b=c02();a[Symbol('SENSITIVE_ROOT')]=1;b.rows[0][Symbol('SENSITIVE_ROW')]=2;bad(a,'unknown_field','request');bad(b,'unknown_field','rows.0');});
test('R01 maximum legal complete report, no truncation', () => {
  const request=req('100000.00','0',Array.from({length:40},(_,i)=>row('100000.00','5','🧰'.repeat(60),`r${String(i).padStart(39,'0')}`)));
  const placements=Array.from({length:200},(_,i)=>[[Math.floor(i/5),i%5+1]]);
  const r=success(request,placements);
  assert.equal(r.totals.totalStockMm,'20000000.00');assert.equal(r.totals.totalPieceMm,'20000000.00');
  for(const lang of ['zh-Hant','en']){const report=buildReport(r,lang);assert.equal(report.ok,true);assert.ok(Buffer.byteLength(report.text)<=131072);assert.equal(report.text.split('\n').filter(l=>lang==='en'?/^Stock [0-9]+ \(/.test(l):/^原料 [0-9]+（/.test(l)).length,200);assert.equal(report.text.split('\n').filter(l=>l.startsWith('  1. ')).length,200);}
});
test('R02 oversized schema rejected before byte cap', () => {
  let r=validResult();r.rows[0].name='x'.repeat(131073);badReport(r,'invalid_result_schema','result.rows.0.name');
  r=validResult();r.sticks=Array(201).fill(r.sticks[0]);badReport(r,'invalid_result_schema','result.sticks');
  r=validResult();r['x'.repeat(131073)]=1;badReport(r,'invalid_result_schema','result');
});
test('R03 sensitive report unknown keys do not execute', () => {for(const nested of [false,true]){const r=validResult();let n=0;Object.defineProperty(nested?r.settings:r,'authorization_'+'x'.repeat(4096),{get(){n++;return 'CREDENTIAL_SENTINEL';}});badReport(r,'invalid_result_schema',nested?'result.settings':'result');assert.equal(n,0);}});

test('request structural descriptors and prototypes', () => {
  for(const v of [null,1,[],Object.create({})])bad(v,'invalid_request_schema','request');
  let r=c02();r.rows[0]=null;bad(r,'invalid_request_schema','rows.0');
  class Rows extends Array{};r=c02();r.rows=new Rows(...r.rows);bad(r,'invalid_request_schema','rows');
  r=c02();r.rows.extra=1;bad(r,'invalid_request_schema','rows');
  r=c02();r.rows[Symbol('extra')]=1;bad(r,'invalid_request_schema','rows');
  r=c02();Object.defineProperty(r.rows,'0',{enumerable:false});bad(r,'invalid_request_schema','rows.0');
  r=c02();Object.defineProperty(r,'kerfRaw',{enumerable:false});bad(r,'invalid_request_schema','request.kerfRaw');
  r=c02();delete r.endTrimRaw;bad(r,'invalid_request_schema','request.endTrimRaw');
  r=c02();delete r.rows;bad(r,'invalid_request_schema','rows');
  r=c02();Object.defineProperty(r,'rows',{get(){throw Error('must not execute');}});bad(r,'invalid_request_schema','rows');
  r=c02();delete r.rows[0].lengthRaw;bad(r,'invalid_request_schema','rows.0.lengthRaw');
  r=c02();Object.defineProperty(r.rows[0],'quantityRaw',{set(){throw Error('must not execute');}});bad(r,'invalid_request_schema','rows.0.quantityRaw');
  const nullRoot=Object.assign(Object.create(null),c02());nullRoot.rows[0]=Object.assign(Object.create(null),nullRoot.rows[0]);assert.equal(calculate(nullRoot).ok,true);
});
test('raw grammar, type, range and deterministic error precedence', () => {
  for(const v of ['', ' 100','100 ','+1','-1','1e2','1E2','1,0','1．2','.5','1.','1.000','NaN','Infinity'])bad(req(v),'invalid_format','request.stockLengthRaw');
  for(const v of [null,1,100n,{},true])bad(req(v),'invalid_type','request.stockLengthRaw');
  for(const v of ['0','100000.01'])bad(req(v),'out_of_range','request.stockLengthRaw');
  bad(req('100','1000.01'),'out_of_range','request.kerfRaw');bad(req('100','0',[row()],'10000.01'),'out_of_range','request.endTrimRaw');
  for(const q of ['1.0','1e2','+1',' 1'])bad(req('100','0',[row('1',q)]),'invalid_format','rows.0.quantityRaw');
  bad(req('100','0',null),'invalid_type','rows');bad(req('100','0',[]),'empty_rows','rows');
  bad(req('1','0',[row('1')],'1'),'non_positive_usable','usableLength');
  bad(req('bad','0',[row()],'0000000000000'),'raw_too_long','request.endTrimRaw');
  bad(req('bad','0',null),'invalid_type','rows');
  let r=c02();r.extra=1;delete r.kerfRaw;bad(r,'unknown_field','request');
  r=c02();r.rows[1].id='r1';r.rows[1].nameRaw='';bad(r,'duplicate_id','rows.1.id');
  r=req('10','0',[row('11'),row('1','0','B','r2')]);bad(r,'out_of_range','rows.1.quantityRaw');
  for(const id of ['', 'x'.repeat(41),'with space','中文'])bad(req('100','0',[row('1','1','A',id)]),'invalid_format','rows.0.id');
  assert.equal(calculate(req('100','0',[row('1','1','A','r'),row('1','1','B','R')])).ok,true);
  for(const name of ['🧰'.repeat(60)+' ','\u0000','\u007f','\u009f'])bad(req('100','0',[row('1','1',name)]),'invalid_name','rows.0.nameRaw');
});
test('result exact schema, canonical format and every derived category', () => {
  for(const [path,value] of [
    [['settings','usableLengthMm'],'99.00'],[['rows',0,'rowIndex'],1],
    [['sticks',0,'stickIndex'],2],[['sticks',0,'stockLengthMm'],'99.00'],[['sticks',0,'trimLossMm'],'1.00'],[['sticks',0,'usableLengthMm'],'99.00'],
    [['sticks',0,'pieceLengthMm'],'97.00'],[['sticks',0,'kerfLossMm'],'1.00'],[['sticks',0,'usedLengthMm'],'99.00'],[['sticks',0,'remainingLengthMm'],'1.00'],
    [['totals','stockCount'],2],[['totals','pieceCount'],1],[['totals','totalStockMm'],'99.00'],[['totals','totalTrimLossMm'],'1.00'],[['totals','totalPieceMm'],'97.00'],[['totals','totalKerfLossMm'],'1.00'],[['totals','totalUsedMm'],'99.00'],[['totals','totalRemainingMm'],'1.00'],
    [['sticks',0,'pieces',0,'name'],'B']
  ]) {const r=validResult();let owner=r;for(const key of path.slice(0,-1))owner=owner[key];owner[path.at(-1)]=value;badReport(r,'inconsistent_result','result.'+path.join('.'));}
  let r=validResult();r.sticks[0].pieces.reverse();badReport(r,'inconsistent_result','result.sticks.0.pieces.0.rowIndex');
  r=validResult();r.totals.totalStockMm='0100.00';badReport(r,'invalid_result_schema','result.totals.totalStockMm');
  r=validResult();r.totals.totalStockMm=10000n;badReport(r,'invalid_result_schema','result.totals.totalStockMm');
  r=validResult();delete r.sticks[0].pieces[0];badReport(r,'invalid_result_schema','result.sticks.0.pieces.0');
  r=validResult();Object.defineProperty(r.sticks[0],'usedLengthMm',{get(){throw Error('getter');}});badReport(r,'invalid_result_schema','result.sticks.0.usedLengthMm');
  r=validResult();r.sticks[0].pieces[0][Symbol('sensitive')]=1;badReport(r,'invalid_result_schema','result.sticks.0.pieces.0');
  r=validResult();Object.defineProperty(r.rows[0],'quantity',{enumerable:false});badReport(r,'invalid_result_schema','result.rows.0.quantity');
  r=validResult();r.settings.stockLengthMm='100000.01';badReport(r,'invalid_result_schema','result.settings.stockLengthMm');
  r=validResult();r.rows[0].quantity=201;badReport(r,'invalid_result_schema','result.rows.0.quantity');
  r=validResult();r.sticks[0].pieces[0].pieceIndex=2;badReport(r,'invalid_result_schema','result.sticks.0.pieces.0.pieceIndex');
  r=expected(req('100','0',[row('49','2')]),[[[0,1],[0,2]]]);r.sticks[0].pieces[1].pieceIndex=1;badReport(r,'inconsistent_result','result.sticks.0.pieces.1.pieceIndex');
  badReport(null,'invalid_result_schema','result');
});
test('unsorted demand, upper setting boundaries and exact Unicode preservation',()=>{
  success(req('100','0',['30','70','40','60'].map((length,i)=>row(length,'1',`P${i}`,`r${i}`))),[[[1,1],[0,1]],[[3,1],[2,1]]]);
  success(req('100000','1000',[row('49500','2')]),[[[0,1],[0,2]]]);
  success(req('100000','1000',[row('80000')],'10000'),single);
  const r=success(req('1','1000',[row('0.01','1','e\u0301')]),single);assert.equal(r.rows[0].name,'e\u0301');
});
