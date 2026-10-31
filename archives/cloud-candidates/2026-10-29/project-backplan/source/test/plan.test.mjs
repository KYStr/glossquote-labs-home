// 固定日期 oracle 與獨立 UTC 測試日曆；Date 只存在於測試，不進產品。
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { planProject, parseDuration, PlanError } from '../public/js/core/plan.mjs';
import { formatReport } from '../public/js/i18n.mjs';
const task = (id, duration, dependsOn = []) => ({ id, name: `Work ${id}`, duration, dependsOn });
const input = (tasks = [task('A', 1)], extra = {}) => ({ project: '', deadline: '2026-10-30', weekdays: [0,1,2,3,4], holidays: [], tasks, ...extra });
const dates = plan => Object.fromEntries(plan.tasks.map(task => [task.id, [task.start, task.finish]]));
const rejects = (value, code) => assert.throws(() => planProject(value), error => error instanceof PlanError && (!code || error.code === code));

test('D01 one day is inclusive', () => assert.deepEqual(dates(planProject(input())), { A:['2026-10-30','2026-10-30'] }));
test('D02 full chain', () => assert.deepEqual(dates(planProject(input([task('A',2), task('B',3,['A']),task('C',1,['B'])]))), { A:['2026-10-23','2026-10-26'],B:['2026-10-27','2026-10-29'],C:['2026-10-30','2026-10-30'] }));
const diamond = [task('A',2),task('B',3,['A']),task('C',1,['A']),task('D',2,['B','C'])];
test('D03 diamond constrains all successors', () => assert.deepEqual(dates(planProject(input(diamond))), { A:['2026-10-22','2026-10-23'],B:['2026-10-26','2026-10-28'],C:['2026-10-28','2026-10-28'],D:['2026-10-29','2026-10-30'] }));
test('D04 excluded Monday changes predecessor dates', () => assert.deepEqual(dates(planProject(input(diamond,{holidays:['2026-10-26']}))), { A:['2026-10-21','2026-10-22'],B:['2026-10-23','2026-10-28'],C:['2026-10-28','2026-10-28'],D:['2026-10-29','2026-10-30'] }));
test('D05 Sunday deadline moves back, visibly', () => { const p=planProject(input(diamond,{deadline:'2026-11-01'})); assert.deepEqual(dates(p),dates(planProject(input(diamond)))); assert.equal(p.deadline,'2026-11-01'); assert.equal(p.effectiveDeadline,'2026-10-30'); });
test('single working weekday and excluded deadline', () => assert.deepEqual(dates(planProject(input([task('A',2)],{deadline:'2026-11-06',weekdays:[4],holidays:['2026-11-06']}))), {A:['2026-10-23','2026-10-30']}));
test('D07 2000 leap century; D08 1900 common century', () => {
  assert.deepEqual(dates(planProject(input([task('A',2)],{deadline:'2000-03-01',weekdays:[0,1,2,3,4,5,6]}))),{A:['2000-02-29','2000-03-01']});
  assert.deepEqual(dates(planProject(input([task('A',2)],{deadline:'1900-03-01',weekdays:[0,1,2,3,4,5,6]}))),{A:['1900-02-28','1900-03-01']});
  rejects(input(undefined,{deadline:'1900-02-29'}),'DATE'); rejects(input(undefined,{deadline:'2100-02-29'}),'DATE');
});
test('D09 DST and year boundary have no timezone semantics', () => {
  assert.deepEqual(dates(planProject(input([task('A',3)],{deadline:'2026-11-02',weekdays:[0,1,2,3,4,5,6]}))),{A:['2026-10-31','2026-11-02']});
  assert.deepEqual(dates(planProject(input([task('A',2)],{deadline:'2027-01-01'}))),{A:['2026-12-31','2027-01-01']});
});
test('D10 minimum and maximum dates; underflow fails entire plan', () => {
  assert.deepEqual(dates(planProject(input([task('A',1)],{deadline:'0001-01-01'}))),{A:['0001-01-01','0001-01-01']});
  rejects(input([task('A',2)],{deadline:'0001-01-01'}),'DATE_RANGE');
  rejects(input([task('A',1),task('B',1,['A'])],{deadline:'0001-01-01'}),'DATE_RANGE');
  rejects(input(undefined,{deadline:'0001-01-01',weekdays:[1]}),'DATE_RANGE');
  assert.deepEqual(dates(planProject(input([task('A',1)],{deadline:'9999-12-31',weekdays:[0,1,2,3,4,5,6]}))),{A:['9999-12-31','9999-12-31']});
  rejects(input(undefined,{deadline:'10000-01-01'}),'DATE');
});
test('catalog example and excluded Wednesday', () => {
  const tasks=[task('A',3),task('B',2,['A'])];
  assert.deepEqual(dates(planProject(input(tasks,{deadline:'2026-11-06'}))),{A:['2026-11-02','2026-11-04'],B:['2026-11-05','2026-11-06']});
  assert.deepEqual(dates(planProject(input(tasks,{deadline:'2026-11-06',holidays:['2026-11-04']}))),{A:['2026-10-30','2026-11-03'],B:['2026-11-05','2026-11-06']});
});
test('weekend exclusions are not subtracted twice; disconnected tasks are scheduled', () => {
  const tasks=[task('A',2),task('B',1,['A']),task('Z',1)];
  assert.deepEqual(planProject(input(tasks,{holidays:['2026-10-25']})).tasks,planProject(input(tasks)).tasks);
  assert.equal(planProject(input(tasks)).tasks.length,3);
});
test('task order and dependency order do not change output', () => assert.deepEqual(planProject(input(diamond)),planProject(input(diamond.toReversed().map(t=>({...t,dependsOn:t.dependsOn.toReversed()}))))));
test('all graph errors including a disconnected cycle fail closed', () => {
  rejects(input([task('A',1,['B']),task('B',1,['A']),task('C',1)]),'CYCLE');
  rejects(input([task('A',1,['A'])]),'SELF_EDGE');
  rejects(input([task('A',1,['Z'])]),'MISSING_EDGE');
  rejects(input([task('A',1),task('B',1,['A','A'])]),'DUPLICATE_EDGE');
  rejects(input([task('A',1),task('A',1)]),'DUPLICATE_ID');
});
test('durations reject noncanonical text and wrong numeric types', () => {
  for(const x of ['0','-1','+1','1.0','1e2','１',' 1','1 ','01','366','','1\n']) assert.throws(()=>parseDuration(x),PlanError);
  assert.equal(parseDuration('365'),365);
  for(const x of [0,-1,1.5,366,Infinity,NaN,'2',null]) rejects(input([task('A',x)]),'DURATION');
});
test('calendar validation and holiday bounds', () => {
  for(const d of ['2026-02-30','2026-2-01','2026-01-01Z','2026-01-01\n','0000-01-01']) rejects(input(undefined,{deadline:d}),'DATE');
  rejects(input(undefined,{weekdays:[]}),'LIMIT'); rejects(input(undefined,{weekdays:[0,0]}),'WEEKDAYS');
  rejects(input(undefined,{weekdays:['1']}),'WEEKDAYS'); rejects(input(undefined,{holidays:['2026-01-01','2026-01-01']}),'HOLIDAYS');
  rejects(input(undefined,{holidays:Array(367).fill('2026-01-01')}),'LIMIT');
});
test('exact schema rejects accessors, symbols, inherited data and unreadable proxies without getter execution', () => {
  let calls=0;
  const getter = input(); Object.defineProperty(getter,'project',{get(){calls++; return 'secret';}}); rejects(getter,'SCHEMA');
  const a=[task('A',1)]; Object.defineProperty(a,0,{get(){calls++;return task('B',1);}}); rejects(input(a),'SCHEMA');
  const badTask=task('A',1); Object.defineProperty(badTask,'name',{get(){calls++;return 'x';}}); rejects(input([badTask]),'SCHEMA');
  rejects({...input(),extra:true},'SCHEMA'); rejects({...input(),[Symbol('x')]:1},'SCHEMA');
  rejects(Object.create(input()),'SCHEMA');
  const revoke=Proxy.revocable({},{}); revoke.revoke(); rejects(revoke.proxy,'SCHEMA');
  const hole=Array(1); rejects(input(hole),'SCHEMA');
  const extra=[task('A',1)]; extra.x=1; rejects(input(extra),'SCHEMA');
  assert.equal(calls,0);
});
test('names are text, bounded Unicode codepoints, no control-line injection', () => {
  const x='<img src=x onerror=alert(1)> & </script>';
  assert.equal(planProject(input([{...task('A',1),name:x}])).tasks[0].name,x);
  assert.equal(planProject(input([{...task('A',1),name:'🙂'.repeat(100)}])).tasks[0].name.length,200);
  for(const name of ['', ' ', 'x\ny','x\ty','x\u202ey','x\u0085y','x\u009fy','x\u2028y','x\u2029y','\ud800','\udc00','🙂'.repeat(101)]) rejects(input([{...task('A',1),name}]),'NAME');
});
test('limits include 50 tasks, 365 days, 366 exclusions and worst-case one-day weeks', () => {
  const tasks=Array.from({length:50},(_,i)=>task(`T${i}`,365,i?[`T${i-1}`]:[]));
  const holidays=Array.from({length:366},(_,i)=>new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10));
  const p=planProject(input(tasks,{deadline:'9999-12-31',weekdays:[0],holidays}));
  assert.equal(p.tasks.length,50); assert.ok(p.start>'9600-01-01');
  rejects(input([...tasks,task('extra',1)]),'LIMIT'); rejects(input([]),'LIMIT');
});
test('frozen outputs and no mutation of caller data', () => {
  const i=input(diamond); const before=JSON.stringify(i); const result=planProject(i);
  assert.equal(JSON.stringify(i),before); assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.tasks[0].dependsOn));
});
test('report has exact localized labels, literal user text, LF and terminal newline', () => {
  const p=planProject(input());
  const report=formatReport(p,'en');
  assert.equal(report, 'Project Deadline Backplanner\nUntitled project\n\nRequested deadline: 2026-10-30\nEffective latest finish: 2026-10-30\nLatest project start: 2026-10-30\nWorking weekdays (Monday to Sunday): Mon, Tue, Wed, Thu, Fri\nExcluded dates: None\n\n[A] Work A\n  Workdays: 1; Predecessor IDs: None\n  Latest start: 2026-10-30; Latest finish: 2026-10-30\n\nRules: durations include both endpoint workdays; a successor starts no earlier than the next workday after its predecessor finishes. Parallel tasks may overlap. Staffing, equipment, real-world feasibility and whether today is already too late are not checked. National holidays are not applied automatically.\n');
  assert.match(formatReport(p,'zh-Hant'),/^專案期限倒排\n/); assert.doesNotMatch(report,/\r/);
});
test('independent UTC calendar oracle: 200 deterministic DAGs', () => {
  let seed=123456789; const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
  for(let sample=0;sample<200;sample++) {
    const count=1+random(8); const weekdays=[0,1,2,3,4,5,6].filter(()=>random(2)); if(!weekdays.length)weekdays.push(0);
    const excluded=Array.from(new Set(Array.from({length:8},()=>`2026-10-${String(1+random(28)).padStart(2,'0')}`)));
    const calendar=[];
    for(let tick=Date.UTC(2025,0,1);tick<=Date.UTC(2026,10,6);tick+=86400000){const d=new Date(tick);const iso=d.toISOString().slice(0,10);if(weekdays.includes((d.getUTCDay()+6)%7)&&!excluded.includes(iso))calendar.push(iso);}
    const tasks=Array.from({length:count},(_,i)=>task(`N${i}`,1+random(5),Array.from({length:i},(_,j)=>`N${j}`).filter(()=>random(3)===0)));
    const expected={};
    for(let i=count-1;i>=0;i--){const next=tasks.filter(t=>t.dependsOn.includes(`N${i}`));const finish=next.length?Math.min(...next.map(t=>expected[t.id].index-1)):calendar.length-1;const start=finish-tasks[i].duration+1;expected[`N${i}`]={index:start,start:calendar[start],finish:calendar[finish]};}
    const p=planProject(input(tasks.toReversed(),{deadline:'2026-11-06',weekdays,holidays:excluded}));
    for(const actual of p.tasks){assert.equal(actual.start,expected[actual.id].start);assert.equal(actual.finish,expected[actual.id].finish);assert.equal(calendar.filter(day=>day>=actual.start&&day<=actual.finish).length,actual.duration);for(const dep of actual.dependsOn)assert.ok(p.tasks.find(t=>t.id===dep).finish<actual.start);}
  }
});
test('timezone environment cannot alter product output', () => {
  const script="import {planProject} from './public/js/core/plan.mjs'; console.log(JSON.stringify(planProject("+JSON.stringify(input(diamond))+")))";
  const outputs=['UTC','America/New_York','Pacific/Auckland','Asia/Taipei'].map(TZ=>execFileSync(process.execPath,['--input-type=module','-e',script],{cwd:new URL('../',import.meta.url),env:{...process.env,TZ},encoding:'utf8'}));
  assert.ok(outputs.every(output=>output===outputs[0]));
});
