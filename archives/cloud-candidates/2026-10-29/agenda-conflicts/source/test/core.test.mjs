// 具體邊界與獨立離散分鐘 oracle；不以待測函式生成 expected。
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft, checkAgenda, formatClock, buildReport } from '../public/js/core.mjs';
const row = (id='r1', changes={}) => ({id,titleRaw:'Session',roomRaw:'Hall',speakersRaw:'Ada; Bo',startRaw:'09:00',endRaw:'10:00',...changes});
const draft = (changes={}) => ({dateRaw:'2026-10-28',timeBasisRaw:'UTC+08:00',roomBufferRaw:'0',speakerBufferRaw:'0',rows:[row()],...changes});
const error = (input, code, field=null, index=null) => assert.deepEqual(validateDraft(input),{ok:false,error:{code,field,row:index}});
for (const [name, mutate] of [
  ['unknown root',d=>{d.extra=true;}], ['missing root',d=>{delete d.dateRaw;}], ['root symbol',d=>{d[Symbol('hidden')]=1;}],
  ['hidden root',d=>{Object.defineProperty(d,'dateRaw',{enumerable:false});}], ['null prototype',d=>{Object.setPrototypeOf(d,null);}],
  ['unknown row',d=>{d.rows[0].extra=true;}], ['row symbol',d=>{d.rows[0][Symbol('x')]=1;}], ['missing row',d=>{delete d.rows[0].roomRaw;}],
  ['custom array',d=>{d.rows.extra=true;}],['array symbol',d=>{d.rows[Symbol('x')]=true;}],['hole',d=>{delete d.rows[0];}], ['array subclass',d=>{Object.setPrototypeOf(d.rows,{});}]
]) test(`exact schema rejects ${name}`,()=>{const d=draft();mutate(d);assert.equal(validateDraft(d).error.code,'SCHEMA');});
test('getter/setter checks at root, rows and row fields never execute',()=>{
  let called=0;
  for(const place of ['root','index','row']) {
    const d=draft();const obj=place==='root'?d:place==='index'?d.rows:d.rows[0];const key=place==='root'?'dateRaw':place==='index'?'0':'roomRaw';
    Object.defineProperty(obj,key,{enumerable:true,get(){called++;return 'x';},set(){called++;}});
    assert.equal(validateDraft(d).error.code,'SCHEMA');
  }
  assert.equal(called,0);
});
test('oversized array length rejects before ownKeys/index access',()=>{
  const rows=[];rows.length=1000000000;let indexCalls=0;
  Object.defineProperty(rows,0,{get(){indexCalls++;throw Error();}});
  error(draft({rows}),'ROW_COUNT','rows');assert.equal(indexCalls,0);
  error(draft({rows:[]}),'ROW_COUNT','rows');
});
test('reflection failure and hostile thrown proxy fail closed without reading error',()=>{
  let errorReads=0;const poison=new Proxy({}, {get(){errorReads++;throw Error('do not read');}});
  const value=new Proxy({}, {getPrototypeOf(){throw poison;}});
  error(value,'SCHEMA');assert.equal(errorReads,0);
  const revoked=Proxy.revocable({},{});revoked.revoke();error(revoked.proxy,'SCHEMA');
});
test('primitive types, IDs and duplicate IDs are rejected exactly',()=>{
  error(draft({dateRaw:42}),'TYPE','dateRaw');
  error(draft({rows:[row('wrong')]}),'ID','id',0);
  error(draft({rows:[row(),row()]}),'ID','id',1);
  error(draft({rows:[row('r1',{titleRaw:null})]}),'TYPE','titleRaw',0);
});
test('calendar labels cover Gregorian century boundaries and strict grammar',()=>{
  for(const dateRaw of ['0001-01-01','9999-12-31','2000-02-29','2024-02-29'])assert.equal(validateDraft(draft({dateRaw})).ok,true,dateRaw);
  for(const dateRaw of ['0000-01-01','1900-02-29','2100-02-29','2026-02-30','2026-13-01','2026-00-01','2026-01-00','2026-1-01','2026-01-01 ','２０２６-01-01'])error(draft({dateRaw}),'DATE','dateRaw');
});
test('clock grammar rejects accidental repair, seconds and zero duration',()=>{
  for(const startRaw of ['9:00','24:00','09:60','-1:00','09:00:00',' 09:00','０９:００','09：00'])error(draft({rows:[row('r1',{startRaw})]}),'CLOCK','startRaw',0);
  for(const endRaw of ['24:01','25:00','10:0','10:00 '])error(draft({rows:[row('r1',{endRaw})]}),'CLOCK','endRaw',0);
  error(draft({rows:[row('r1',{endRaw:'09:00'})]}),'ORDER','endRaw',0);
  const value=validateDraft(draft({rows:[row('r1',{startRaw:'00:00',endRaw:'24:00'})]})).value.rows[0];
  assert.equal(value.start,0);assert.equal(value.end,1440);
});
test('buffer bounds and leading zeros do not accept other numeric grammars',()=>{
  for(const value of ['0','00','000','180'])for(const key of ['roomBufferRaw','speakerBufferRaw'])assert.equal(validateDraft(draft({[key]:value})).ok,true);
  for(const value of ['181','-1','1.0','1e2','+1',' 1','0000','１',''])for(const key of ['roomBufferRaw','speakerBufferRaw'])error(draft({[key]:value}),'BUFFER',key);
});
test('raw Unicode length, control characters and surrogate validity',()=>{
  for(const titleRaw of ['x'.repeat(257),'😀'.repeat(129)])error(draft({rows:[row('r1',{titleRaw})]}),'RAW_LENGTH','titleRaw',0);
  for(const titleRaw of ['x\n','x\u0085','x\u2028','x\u2029','\ud800','\udfff'])error(draft({rows:[row('r1',{titleRaw})]}),'TEXT','titleRaw',0);
  assert.equal(validateDraft(draft({rows:[row('r1',{titleRaw:'😀'.repeat(40)})]})).ok,true);
  error(draft({rows:[row('r1',{titleRaw:'😀'.repeat(41)})]}),'LABEL','titleRaw',0);
  assert.equal(validateDraft(draft({timeBasisRaw:'x'.repeat(60)})).ok,true);
  error(draft({timeBasisRaw:'x'.repeat(61)}),'LABEL','timeBasisRaw');
  assert.equal(validateDraft(draft({rows:[row('r1',{roomRaw:'x'.repeat(40)})]})).ok,true);
  error(draft({rows:[row('r1',{roomRaw:'x'.repeat(41)})]}),'LABEL','roomRaw',0);
});
test('speaker splitting handles blank, empty tokens, count and exact duplicate rules',()=>{
  assert.deepEqual(validateDraft(draft({rows:[row('r1',{speakersRaw:'  '})]})).value.rows[0].speakers,[]);
  assert.deepEqual(validateDraft(draft({rows:[row('r1',{speakersRaw:' A ; B ; C ; D ; E '})]})).value.rows[0].speakers,['A','B','C','D','E']);
  for(const speakersRaw of ['A;;B',';A','A;'])error(draft({rows:[row('r1',{speakersRaw})]}),'LABEL','speakersRaw',0);
  for(const speakersRaw of ['A;B;C;D;E;F','A; A'])error(draft({rows:[row('r1',{speakersRaw})]}),'SPEAKERS','speakersRaw',0);
  error(draft({rows:[row('r1',{speakersRaw:'x'.repeat(41)})]}),'LABEL','speakersRaw',0);
});
test('identity trimming is case sensitive and has no Unicode normalization',()=>{
  const d=draft({rows:[row('r1',{roomRaw:' Hall ',speakersRaw:'Ada'}),row('r2',{roomRaw:'Hall',speakersRaw:'ada'})]});
  assert.deepEqual(checkAgenda(d).value.conflicts[0].reasons,['ROOM_OVERLAP']);
  d.rows[1].roomRaw='hall';assert.equal(checkAgenda(d).value.conflicts.length,0);
  d.rows[0].speakersRaw='é';d.rows[1].speakersRaw='e\u0301';assert.equal(checkAgenda(d).value.conflicts.length,0);
});
test('containment, equal starts, no speakers and disjoint rooms have literal outcomes',()=>{
  const d=draft({rows:[row('r1',{titleRaw:'A',startRaw:'08:00',endRaw:'12:00',speakersRaw:''}),row('r2',{titleRaw:'B',startRaw:'09:00',endRaw:'10:00',speakersRaw:''}),row('r3',{titleRaw:'C',startRaw:'09:00',endRaw:'10:00',roomRaw:'Other',speakersRaw:''})]});
  assert.deepEqual(checkAgenda(d).value.conflicts,[{a:1,b:2,reasons:['ROOM_OVERLAP'],overlap:60,gap:null,speakers:[]}]);
});
test('same-room speaker does not receive a transition buffer',()=>{
  const d=draft({speakerBufferRaw:'180',rows:[row(),row('r2',{titleRaw:'Other',startRaw:'10:00',endRaw:'11:00'})]});
  assert.deepEqual(checkAgenda(d).value.conflicts,[]);
  d.roomBufferRaw='1';assert.deepEqual(checkAgenda(d).value.conflicts[0].reasons,['ROOM_BUFFER']);
});
test('speaker order does not change duplicate identity; original display order retained',()=>{
  const d=draft({rows:[row(),row('r2',{speakersRaw:'Bo; Ada'})]});
  assert.deepEqual(checkAgenda(d).value.conflicts[0].reasons,['DUPLICATE','ROOM_OVERLAP','SPEAKER_OVERLAP']);
  assert.deepEqual(checkAgenda(d).value.rows[1].speakers,['Bo','Ada']);
});
test('frozen inputs are untouched and each invocation returns fresh plain data',()=>{
  const d=draft();Object.freeze(d.rows[0]);Object.freeze(d.rows);Object.freeze(d);
  const before=JSON.stringify(d), a=checkAgenda(d), b=checkAgenda(d);
  assert.equal(JSON.stringify(d),before);assert.notEqual(a.value,b.value);assert.notEqual(a.value.rows[0],b.value.rows[0]);
});
test('all small interval pairs match an independent occupied-minute set oracle',()=>{
  const intervals=[];for(let start=0;start<4;start++)for(let end=start+1;end<=4;end++)intervals.push([start,end]);
  const time=n=>`00:0${n}`;
  for(const [as,ae]of intervals)for(const [bs,be]of intervals)for(const sameRoom of [false,true])for(const shared of [false,true])for(const buffer of [0,1,2]){
    const occupiedA=new Set(Array.from({length:ae-as},(_,i)=>as+i));
    const occupiedB=new Set(Array.from({length:be-bs},(_,i)=>bs+i));
    const overlap=[...occupiedA].filter(n=>occupiedB.has(n)).length;
    const gap=overlap?null:as>=be?as-be:bs-ae;
    const reasons=[];
    if(overlap&&sameRoom)reasons.push('ROOM_OVERLAP');
    if(overlap&&shared)reasons.push('SPEAKER_OVERLAP');
    if(gap!==null&&sameRoom&&gap<buffer)reasons.push('ROOM_BUFFER');
    if(gap!==null&&!sameRoom&&shared&&gap<buffer)reasons.push('SPEAKER_BUFFER');
    const actual=checkAgenda(draft({roomBufferRaw:String(buffer),speakerBufferRaw:String(buffer),rows:[row('r1',{titleRaw:'A',roomRaw:'X',speakersRaw:'Ada',startRaw:time(as),endRaw:time(ae)}),row('r2',{titleRaw:'B',roomRaw:sameRoom?'X':'Y',speakersRaw:shared?'Ada':'Bo',startRaw:time(bs),endRaw:time(be)})]})).value.conflicts;
    assert.deepEqual(actual,reasons.length?[{a:1,b:2,reasons,overlap,gap,speakers:shared?['Ada']:[]}]:[]);
  }
});
test('formatClock validates integer range without environment clocks',()=>{
  assert.equal(formatClock(0),'00:00');assert.equal(formatClock(1439),'23:59');assert.equal(formatClock(1440),'24:00');
  for(const n of [-1,1441,NaN,Infinity,1.5,'60',null])assert.throws(()=>formatClock(n),RangeError);
});
const reportResult = checkAgenda(draft({roomBufferRaw:'5',speakerBufferRaw:'10',rows:[row('r1',{titleRaw:'A',speakersRaw:'Ada'}),row('r2',{titleRaw:'B',roomRaw:'Other',speakersRaw:'Ada',startRaw:'09:30',endRaw:'10:30'})]})).value;
const english = `Multi-Track Agenda Checker
Date: 2026-10-28
Shared time basis: UTC+08:00
Room / speaker transition buffer (minutes): 5 / 10

Sessions:
1. 09:00–10:00 | A | Hall | Ada
2. 09:30–10:30 | B | Other | Ada

Conflicting pairs: 1
1 ↔ 2: Speaker overlap; overlap 30 min; shared speakers: Ada

Half-open intervals; no time-zone or daylight-saving conversion; no overnight or DST skipped/repeated clock times.`;
const chinese = `多軌議程衝突檢查
日期: 2026-10-28
共同時間基準: UTC+08:00
場地／講者跨場緩衝（分鐘）: 5 / 10

議程：
1. 09:00–10:00 | A | Hall | Ada
2. 09:30–10:30 | B | Other | Ada

衝突配對數: 1
1 ↔ 2: 講者重疊; 重疊 30 分鐘; 共同講者: Ada

半開區間；不轉換時區或夏令時間；不支援跨午夜與 DST 跳時／重複時刻。`;
test('reports match full bilingual literals, UTF-8 bytes, no BOM/final LF',()=>{
  for(const[locale,expected]of [['en',english],['zh-Hant',chinese]]){
    const actual=buildReport(reportResult,locale);assert.equal(actual,expected);
    assert.deepEqual(Buffer.from(actual,'utf8'),Buffer.from(expected,'utf8'));assert.notEqual(actual.charCodeAt(0),0xfeff);assert.ok(!actual.endsWith('\n'));
  }
  assert.throws(()=>buildReport(reportResult,'fr'),RangeError);
});
test('report preserves markup as plain text and uses qualified empty-result language',()=>{
  const result=checkAgenda(draft({rows:[row('r1',{titleRaw:'<img src=x onerror=alert(1)>',speakersRaw:''})]})).value;
  const text=buildReport(result,'en');assert.match(text,/<img src=x onerror=alert\(1\)>/);assert.match(text,/No conflicts under these rules/);assert.match(text,/No speaker/);
});
