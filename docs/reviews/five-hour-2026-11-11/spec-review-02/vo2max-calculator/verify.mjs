import { Q, dec, error, ok, exactStrings, basicText, match, exercise, canonicalReport, checkValue } from '../review-lib.mjs';
import { isDeepStrictEqual } from 'node:util';

const defaults={test:'cooper12',distanceMeters:'2400',time:'12:00',age:'',sex:''};
const fields=Object.keys(defaults);
const ageBands=['13-19','20-29','30-39','40-49','50-59','60+'];
const tiers=['very-poor','poor','fair','good','excellent','superior'];
// Lower bounds transcribed from the normative table, not learned from fixture answers.
const norms={
 male:[[35,38.4,45.2,51,56],[33,36.5,42.5,46.5,52.5],[31.5,35.5,41,45,49.5],[30.2,33.6,39,43.8,48.1],[26.1,31,35.8,41,45.4],[20.5,26.1,32.3,36.5,44.3]],
 female:[[25,31,35,39,42],[23.6,29,33,37,41.1],[22.8,27,31.5,35.7,40.1],[21,24.5,29,32.9,37],[20.2,22.8,27,31.5,35.8],[17.5,20.2,24.5,30.3,31.5]],
};
const rawCooper=(m)=>(m-504.9)/44.73;
const rawMile=(s)=>3.5+483/(s/60);
const r1=(x)=>Math.floor(x*10+0.5)/10;
const parseTime=(t)=>t.split(':').reduce((acc,p)=>60*acc+Number(p),0);
function evaluate(i){
 if(!exactStrings(i,fields)||!fields.every(k=>Object.getOwnPropertyDescriptor(i,k).enumerable))return error('SCHEMA');
 for(const k of fields){
  const active=k!=='distanceMeters'||i.test==='cooper12';
  const used=active&&(k!=='time'||i.test==='mile15');
  const required=used&&k!=='age'&&k!=='sex';
  const basic=basicText(i[k],8,required);
  if(basic)return error(basic,k);
  if(!used)continue;
  if(k==='test'&&!['cooper12','mile15'].includes(i[k]))return error('ENUM',k);
  if(k==='distanceMeters'){
   if(!match(i[k],/^[0-9]+(?:\.[0-9])?$/u))return error('DECIMAL_FORMAT',k);
   if(Number(i[k])>10000)return error('RANGE',k);
  }
  if(k==='time'){
   if(!match(i[k],/^(?:[0-9]{1,3}:[0-5][0-9]|[0-9]{1,2}:[0-5][0-9]:[0-5][0-9])$/u))return error('TIME_FORMAT',k);
   if(parseTime(i[k])<240||parseTime(i[k])>3600)return error('RANGE',k);
  }
  if(k==='age'&&i[k]!==''){
   if(!match(i[k],/^[0-9]+$/u))return error('INTEGER_FORMAT',k);
   if(Number(i[k])<13||Number(i[k])>99)return error('RANGE',k);
  }
  if(k==='sex'&&!['','male','female'].includes(i[k]))return error('ENUM',k);
 }
 if(!i.age!==!i.sex)return error('PAIR_REQUIRED',i.age?'sex':'age');
 const cooper=i.test==='cooper12';
 const m=cooper?Number(i.distanceMeters):null, s=cooper?null:parseTime(i.time);
 const vo2max=r1(cooper?rawCooper(m):rawMile(s));
 if(cooper&&vo2max<=0)return error('BELOW_RANGE','distanceMeters');
 let classification=null;
 if(i.age){
  const row=Math.min(5,Math.floor(Number(i.age)/10)-1);
  const tier=norms[i.sex][row].filter(x=>vo2max>=x).length;
  classification={sex:i.sex,ageBand:ageBands[row],category:tiers[tier]};
 }
 return ok({test:i.test,...(cooper?{distanceMeters:m}:{timeSeconds:s}),vo2max,classification});
}

const status={
 idle:['Ready','準備就緒'],dirty:['Changed — not calculated yet','內容已修改，尚未計算'],
 submitting:['Calculating…','計算中…'],success:['Calculation complete','計算完成'],
 error:['Cannot calculate — check input','無法計算，請檢查輸入'],
};
function model(draft) {
 let sequence=1,state='idle',result=null;
 const clear=(next)=>{++sequence;state=next;result=null;};
 return {
  edit(patch) {draft={...draft,...patch};clear('dirty');},
  run(){clear('submitting');const outcome=evaluate(draft);if(!outcome.ok)state='error';return {draft,sequence,outcome};},
  finish(reply){if(state==='submitting'&&reply.sequence===sequence&&isDeepStrictEqual(draft,reply.draft)){
   result=reply.outcome.ok?reply.outcome.result:null;state=reply.outcome.ok?'success':'error';
  }},
  short(){return {displayed:result,reportDownload:result?'available':'unavailable',state};},
  announce(){return {statusEn:status[state][0],statusZh:status[state][1]};},
  snapshot(){return {...this.short(),currentDraft:draft,currentSequence:sequence,statusText:this.announce().statusZh};},
 };
}
function controller(id,i){
 const m=model(i.initialDraft??i.olderDraft);
 if(id==='state-dirty-error'){
  const first=m.run();m.finish(first);
  const afterRun={...m.short(),...m.announce()};
  m.edit(i.edit);const afterEdit=m.short();
  const second=m.run();
  return {derived:{afterRun,afterEdit,afterRerun:m.short()},checks:[
   checkValue('runDraft from first submit',i.runDraft,first.draft),
   checkValue('workerOutcome',i.workerOutcome,first.outcome),checkValue('localOutcome',i.localOutcome,second.outcome)]};
 }
 if(id==='state-cancel-late'){
  const afterLoad=m.snapshot(),first=m.run(),afterSubmit=m.snapshot();
  m.edit(i.edit);const afterEdit=m.snapshot();m.finish(first);const afterLateReply=m.snapshot();
  const second=m.run(),afterSecondSubmit=m.snapshot();m.finish(second);const afterSecondReply=m.snapshot();
  return {derived:{afterLoad,afterSubmit,afterEdit,afterLateReply,afterSecondSubmit,afterSecondReply},checks:[
   checkValue('requestDraft',i.requestDraft,first.draft),checkValue('editedDraft',i.editedDraft,second.draft),
   checkValue('workerOutcome',i.workerOutcome,first.outcome),checkValue('secondWorkerOutcome',i.secondWorkerOutcome,second.outcome)]};
 }
 if(id==='state-replace-late'){
  const afterLoad=m.snapshot(),first=m.run(),afterOlderSubmit=m.snapshot();
  m.edit(i.newerDraft);const second=m.run(),afterNewerRun=m.snapshot();
  m.finish(first);const afterOlderReply=m.snapshot();
  return {derived:{afterLoad,afterOlderSubmit,afterNewerRun,afterOlderReply},checks:[
   checkValue('olderWorkerOutcome',i.olderWorkerOutcome,first.outcome),checkValue('newerOutcome',i.newerOutcome,second.outcome)]};
 }
 throw new Error('unknown fixture '+id);
}
function decode(rows) {
 return {slug:'vo2max-calculator',cases:rows.map(row=>{
  if(row.kind==='core')return row;
  const {kind,id,checkpoints,afterRun,afterEdit,afterRerun,...input}=row;
  return {id,kind,input,expected:checkpoints??{afterRun,afterEdit,afterRerun}};
 })};
}
function extra(){
 const bound=['505','506','507.1','507.2','10000'].map(distanceMeters=>({input:distanceMeters,
  raw:rawCooper(Number(distanceMeters)),rounded:r1(rawCooper(Number(distanceMeters))),outcome:evaluate({...defaults,distanceMeters})}));
 const origMile=new Q(1609344,1000);
 const xIntercept=dec('0.3138').mul(origMile), slope=dec('0.0278').mul(origMile);
 const m=dec('2400');
 const printable={originalInterceptMeters:xIntercept,originalSlopeMetersPerUnit:slope,
  raw1968:m.sub(xIntercept).div(slope),rounded1968:m.sub(xIntercept).div(slope).round(1),
  rawCandidate:rawCooper(2400),roundedCandidate:r1(rawCooper(2400)),rawClaimedEquivalentKm:22.351*2.4-11.288};
 const mileBounds=['4:00','1:00:00'].map(time=>({input:time,speedKmH:2.414016/(parseTime(time)/3600),result:evaluate({...defaults,test:'mile15',time})}));
 return {cooperBoundaries:bound,minPositiveRawDistanceMeters:504.9+0.05*44.73,mileBounds,printable,
  download:canonicalReport(evaluate(defaults).result)};
}
exercise(import.meta.url,{slug:'vo2max-calculator',pr:236,fixtureBlob:'e3830cfe8da0d512dc74f49a5781290c9ee71fca',expectedCount:27,core:evaluate,controller,extra,decode});
