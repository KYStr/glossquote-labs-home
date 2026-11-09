// 精確手寫 oracle 與集合不變量分開；不以被測函式產生 expected。
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoster, scheduleTournament, ScheduleError } from '../public/js/core/schedule.mjs';
import { formatReport } from '../public/js/i18n.mjs';
const build=(roster,mode='single')=>scheduleTournament({roster,mode});
const expectCode=(fn,code)=>assert.throws(fn,error=>error instanceof ScheduleError&&error.code===code&&!error.message.includes('PRIVATE_SENTINEL'));
test('four-team single literal oracle preserves input and stable IDs',()=>{
  const input={roster:'A\nB\nC\nD',mode:'single'};const before=JSON.stringify(input);const value=scheduleTournament(input);
  assert.deepEqual(value.rounds.map(r=>r.pairs),[[{a:1,b:4},{a:2,b:3}],[{a:1,b:3},{a:4,b:2}],[{a:1,b:2},{a:3,b:4}]]);
  assert.deepEqual(value.teamSchedules[2],{id:3,fixtures:[{round:1,opponent:2},{round:2,opponent:1},{round:3,opponent:4}]});
  assert.equal(value.matchCount,6);assert.equal(JSON.stringify(input),before);
});
test('five-team literal byes and pairs',()=>{
  const value=build('A\nB\nC\nD\nE');
  assert.deepEqual(value.rounds.map(r=>r.bye),[1,4,2,5,3]);
  assert.deepEqual(value.rounds.map(r=>r.pairs),[[{a:2,b:5},{a:3,b:4}],[{a:1,b:5},{a:2,b:3}],[{a:1,b:4},{a:5,b:3}],[{a:1,b:3},{a:4,b:2}],[{a:1,b:2},{a:4,b:5}]]);
});
for(let count=2;count<=32;count++)for(const mode of ['single','double'])test(`${count} teams ${mode}: pairs/degree/rounds/byes/team fixtures`,()=>{
  const times=mode==='double'?2:1;const value=build(Array.from({length:count},(_,i)=>`Team ${i+1}`).join('\n'),mode);
  const rounds=(count%2?count:count-1)*times;const seen=new Map();const byes=Array(count).fill(0);const games=Array(count).fill(0);
  assert.equal(value.rounds.length,rounds);assert.equal(value.matchCount,count*(count-1)/2*times);
  for(const round of value.rounds){
    const used=new Set();assert.equal(round.pairs.length,Math.floor(count/2));
    for(const {a,b} of round.pairs){assert.notEqual(a,b);for(const id of [a,b]){assert.ok(id>=1&&id<=count);assert.ok(!used.has(id));used.add(id);games[id-1]++;}const key=[a,b].sort((x,y)=>x-y).join(':');seen.set(key,(seen.get(key)||0)+1);}
    if(count%2){assert.ok(!used.has(round.bye));used.add(round.bye);byes[round.bye-1]++;}else assert.equal(round.bye,null);
    assert.equal(used.size,count);
  }
  assert.equal(seen.size,count*(count-1)/2);for(const repetitions of seen.values())assert.equal(repetitions,times);
  assert.deepEqual(games,Array(count).fill((count-1)*times));assert.deepEqual(byes,Array(count).fill(count%2?times:0));
  for(const team of value.teamSchedules){assert.equal(team.fixtures.length,rounds);for(const fixture of team.fixtures){const round=value.rounds[fixture.round-1];if(fixture.opponent===null)assert.equal(round.bye,team.id);else assert.ok(round.pairs.some(p=>(p.a===team.id&&p.b===fixture.opponent)||(p.b===team.id&&p.a===fixture.opponent)));}}
  if(times===2){for(let i=0;i<rounds/2;i++){assert.deepEqual(value.rounds[i+rounds/2].pairs,value.rounds[i].pairs.map(({a,b})=>({a:b,b:a})));assert.equal(value.rounds[i+rounds/2].bye,value.rounds[i].bye);}}
});
test('duplicate names, blank lines, CRLF and CR retain order and ignore only empty trimmed lines',()=>{
  assert.deepEqual(parseRoster('\n A \r\n\rA\rB\n'),{teams:[{id:1,name:'A'},{id:2,name:'A'},{id:3,name:'B'}],ignored:3});
  assert.equal(build('Same\nSame').rounds[0].pairs.length,1);
});
test('name and raw source boundaries use explicit Unicode units',()=>{
  assert.equal(parseRoster('😀'.repeat(64)+'\nB').teams[0].name.length,128);
  expectCode(()=>parseRoster('😀'.repeat(65)+'\nB'),'NAME_LONG');
  assert.equal(parseRoster('A\nB'+'\n'.repeat(8189)).teams.length,2);
  expectCode(()=>parseRoster('A\nB'+'\n'.repeat(8190)),'SOURCE_LONG');
});
test('unsupported controls and malformed surrogate reject without echo',()=>{
  for(const text of ['\u0000','\t','\u007f','\u0085','\u2028','\u2029','\u202e','\u2066','\ud800','\udc00'])expectCode(()=>parseRoster(`PRIVATE_SENTINEL${text}X\nB`),'NAME_CONTROL');
  assert.equal(parseRoster('\tA\t\nB').teams[0].name,'A');
});
test('empty, too few, too many, non-string and bad mode refuse whole result',()=>{
  for(const value of ['', 'A','\n\n',Array.from({length:33},(_,i)=>String(i)).join('\n')])expectCode(()=>parseRoster(value),'TEAM_COUNT');
  for(const value of [null,[],{},1])expectCode(()=>parseRoster(value),'SCHEMA');
  for(const mode of ['',1,'DOUBLE','Single',null])expectCode(()=>build('A\nB',mode),'MODE');
});
test('exact schema and getters/proxy refusal does not echo or invoke getter',()=>{
  let calls=0;const accessor={mode:'single',get roster(){calls++;return 'A\nB';}};
  for(const input of [accessor,null,[],Object.assign(Object.create(null),{roster:'A\nB',mode:'single'}),{roster:'A\nB',mode:'single',extra:1},{roster:'A\nB',mode:'single',[Symbol('x')]:1},Object.defineProperty({mode:'single'},'roster',{value:'A\nB'}),new Proxy({},{ownKeys(){throw new Error('PRIVATE_SENTINEL');}})])expectCode(()=>scheduleTournament(input),'SCHEMA');
  assert.equal(calls,0);
});
test('result is recursively frozen; input remains mutable and unchanged',()=>{
  const result=build('A\nB\nC');const visit=value=>{if(value&&typeof value==='object'){assert.ok(Object.isFrozen(value));for(const part of Object.values(value))visit(part);}};visit(result);
});
test('literal two-team double English report, with no BOM or trailing newline',()=>{
  assert.equal(formatReport(build('A\nB','double'),'en'),[
    'Round-Robin Scheduler','Double round robin','Teams: 2 · Rounds: 2 · Matches: 2','Blank lines ignored: 0',
    'Deterministic input-order schedule. Left/right is not home/away. Venues, time slots and fairness are not optimized.','',
    'Fixtures by round','Round 1','  [#1] A vs [#2] B','Round 2','  [#2] B vs [#1] A','',
    'Team schedules','[#1] A','  Round 1: vs [#2] B','  Round 2: vs [#2] B','[#2] B','  Round 1: vs [#1] A','  Round 2: vs [#1] A'
  ].join('\n'));
});
test('Chinese report and hostile HTML remain plain strings',()=>{
  const report=formatReport(build('<img src=x onerror=1>\n</script>'),'zh-Hant');
  assert.ok(report.startsWith('循環賽賽程表\n單循環'));assert.ok(report.includes('[#1] <img src=x onerror=1> 對 [#2] </script>'));
  assert.ok(!report.endsWith('\n'));assert.notEqual(report.charCodeAt(0),0xfeff);assert.throws(()=>formatReport(build('A\nB'),'fr'));
});
