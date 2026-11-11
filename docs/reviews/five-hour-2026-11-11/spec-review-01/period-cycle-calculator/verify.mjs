import {isDeepStrictEqual} from 'node:util';
import {audit, checkpoint as p, err, plain, reportOf, sortedJSON} from '../recheck-lib.mjs';

const fields=['lastPeriodStart','cycleLength','periodLength'];
const init={lastPeriodStart:'',cycleLength:'28',periodLength:'5'};
const leap=y=>y%4===0 && (y%100!==0 || y%400===0);
const monthDays=(y,m)=>[31,leap(y)?29:28,31,30,31,30,31,31,30,31,30,31][m-1];
// Calendar stepping, independent of the specified Julian-day algorithm and host clocks.
function add(date,delta) {
  let [y,m,d]=date;
  for(let i=0;i<delta;i++){
    if(++d<=monthDays(y,m)) continue;
    d=1;
    if(++m===13) {m=1;y++;}
  }
  return [y,m,d];
}
function fmt([y,m,d]) {
  return [String(y).padStart(4,'0'),String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');
}
const ymd=/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const positive=/^(?:0|[1-9][0-9]*)$/;
function run(x) {
  if(!plain(x)||Reflect.ownKeys(x).length!==fields.length||!fields.every(k=>
    typeof Object.getOwnPropertyDescriptor(x,k)?.value==='string')) return err('SCHEMA');
  const parsed=[];
  for(const [i,k] of fields.entries()){
    const s=x[k];
    if(s.length>(i===0?10:8)) return err('INPUT_LIMIT',k);
    if(!s.isWellFormed()) return err('UNICODE',k);
    if(!s.length) return err('EMPTY',k);
    if(i===0) {
      if(!ymd.test(s)) return err('DATE_FORMAT',k);
      const date=s.split('-').map(Number);
      const [y,m,d]=date;
      if(m<1||m>12||d<1||d>monthDays(y,m)) return err('INVALID_DATE',k);
      if(s<'1900-01-01'||s>'2100-12-31') return err('RANGE',k);
      parsed.push(date);
    } else {
      if(!positive.test(s)) return err('INTEGER_FORMAT',k);
      const n=Number(s), [lo,hi]=i===1?[21,35]:[1,10];
      if(n<lo||n>hi) return err('RANGE',k);
      parsed.push(n);
    }
  }
  const [base,c,p]=parsed;
  const cycles=Array.from({length:4},(_,index)=>{
    const start=add(base,index*c), ov=c-14;
    return {index,start:fmt(start),periodEnd:fmt(add(start,p-1)),ovulation:fmt(add(start,ov)),
      fertileStart:fmt(add(start,ov-5)),fertileEnd:fmt(add(start,ov+1))};
  });
  return {ok:true,result:{cycles}};
}
const settle=draft=>{
  const out=run(draft);
  return out.ok?p('success',true):p('error',false,{error:out.error});
};
function checkPayload(draft,result) {
  if(!isDeepStrictEqual(run(draft).result,result)) throw new Error('Synthetic late payload dates do not match calendar oracle');
}
function controller(id,i) {
  switch(id){
    case 'state-dirty-error':
      return {afterRun:settle(i.initial),afterEdit:p('dirty',false),afterRerun:settle(i.edit)};
    case 'state-cancel-late':
      checkPayload(i.draft,i.lateResult);
      return {whilePending:p('busy',false),afterCancel:p('cancelled',false,{draft:i.draft}),
        afterLateResult:p('cancelled',false),afterReset:p('empty',false,{draft:init})};
    case 'state-replace-late':
      checkPayload(i.olderDraft,i.olderLateResult);
      return {afterNewerResult:settle(i.newerDraft),afterOlderLateResult:settle(i.newerDraft)};
    default: throw new Error('Unknown scenario '+id);
  }
}
const v=(lastPeriodStart,cycleLength='28',periodLength='5')=>({lastPeriodStart,cycleLength,periodLength});
function extra() {
  const shortSupport=v('2026-10-26','37');
  const sample=v('2026-10-26');
  const sampleResult=run(sample).result;
  const stale=v('2026-09-01'), cutoff='2026-11-11';
  const starts=run(stale).result.cycles.map(c=>c.start);
  const high=v('2100-12-31','35','10');
  return [
    {id:'PERIOD-01',input:shortSupport,spec:run(shortSupport),note:'37 days is outside the tool range; this alone does not justify a clinical flag.'},
    {id:'PERIOD-02',input:sample,resultFileExample:JSON.parse(sortedJSON(sampleResult)),reportEvidence:reportOf(sampleResult),
      containsInputDate:sample.lastPeriodStart===sampleResult.cycles[0].start,
      topLevelKeys:Object.keys(sampleResult),hasEstimateOrNoContraceptionMetadata:false},
    {id:'PERIOD-03',input:stale,illustrativeViewingDate:cutoff,starts,
      specSummary:starts[1],specSummaryIsEarlier:starts[1]<cutoff},
    {id:'calendar-bounds',runs:[v('1900-02-29'),v('2000-02-29'),v('2100-02-29'),high,v('2101-01-01')]
      .map(input=>({input,derived:run(input)}))},
    {id:'interval-overlap',input:v('2026-11-02','21','10'),
      first:run(v('2026-11-02','21','10')).result.cycles[0],
      note:'Do not infer fertile/safe status from the overlap of two estimated intervals.'}
  ];
}
audit({fixtureSHA:'2cb62ee0bf2ae3941b971caf5fdb9905a644f98cf57894c85a5acbec0144132d',
  run,runController:controller,additional:extra});
