import { Q, dec, error, ok, isPlain, exactStrings, basicText, match, inRange, exercise, canonicalReport, ReferenceState, checkValue } from '../review-lib.mjs';

const defaults={sex:'male',weightKg:'70',drinks:[{volumeMl:'350',abvPercent:'5'}],elapsedMinutes:'0'};
const scalarKeys=['sex','weightKg','elapsedMinutes'];
const rules={
  weightKg:[/^[0-9]+(?:\.[0-9])?$/u,20,500,'DECIMAL_FORMAT'],
  volumeMl:[/^[0-9]+$/u,1,5000,'INTEGER_FORMAT'],
  abvPercent:[/^[0-9]+(?:\.[0-9])?$/u,0.1,100,'DECIMAL_FORMAT'],
  elapsedMinutes:[/^[0-9]+$/u,0,1440,'INTEGER_FORMAT'],
};
const fail = (code,field,row=null) => ({ok:false,error:{code,field,row}});
const own = (i,k) => Object.getOwnPropertyDescriptor(i,k)?.value;
const ceil = (q) => Number((q.n+q.d-1n)/q.d);
const minStep = new Q(1,400);
function verify(k,v,row) {
  const basic=basicText(v,8);
  if(basic) return fail(basic,k,row);
  if(k==='sex') return ['male','female'].includes(v)?null:fail('ENUM',k,row);
  const [pattern,min,max,format]=rules[k];
  if(!match(v,pattern)) return fail(format,k,row);
  if(!inRange(dec(v),min,max))return fail('RANGE',k,row);
  return null;
}
function derive(i) {
  const g=i.drinks.reduce((sum,row)=>sum.add(dec(row.volumeMl).mul(dec(row.abvPercent)).mul(new Q(789,100000))),new Q(0));
  const peak=g.div(dec(i.weightKg).mul(i.sex==='male'?new Q(17,25):new Q(11,20)));
  const modeled=peak.sub(dec(i.elapsedMinutes).mul(minStep));
  return {g,peak,b:modeled.n<0n?new Q(0):modeled};
}
function evaluate(i) {
  if(!isPlain(i)||Reflect.ownKeys(i).length!==4||!scalarKeys.every(k=>typeof own(i,k)==='string')||!Array.isArray(own(i,'drinks')))return error('SCHEMA');
  for(const k of ['sex','weightKg']){
    const fail=verify(k,i[k]);if(fail)return fail;
  }
  if(i.drinks.length===0)return fail('EMPTY','drinks');
  if(i.drinks.length>12)return fail('ROW_LIMIT','drinks',13);
  for(let j=0;j<i.drinks.length;j++){
    // SPEC lists a global SCHEMA and then overrides it for invalid rows without specifying a row-shape error.
    // All literal fixtures have well-shaped rows; leave out-of-fixture malformed rows explicitly undefined.
    if(!exactStrings(i.drinks[j],['volumeMl','abvPercent']))return {unspecified:'row shape error',row:j+1};
    for(const k of ['volumeMl','abvPercent']){
      const e=verify(k,i.drinks[j][k],j+1);if(e)return e;
    }
  }
  const elapsed=verify('elapsedMinutes',i.elapsedMinutes);if(elapsed)return elapsed;
  const {g,peak,b}=derive(i);
  const delta=b.sub(new Q(3,10));
  return ok({totalAlcoholGrams:g.round(1),peakBacGL:peak.round(3),bacGL:b.round(3),
    bacPercent:b.div(new Q(10)).round(3),breathMgL:b.div(new Q(2)).round(3),
    band:delta.n<0n?'below-threshold':b.cmp(new Q(1,2))<0?'administrative':'criminal',
    minutesToZero:ceil(b.div(minStep)),minutesToBelowAdmin:delta.n<0n?0:ceil(delta.div(minStep))});
}
function controller(id,i) {
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
}
function extra(){
  const cases=[{...defaults,weightKg:'52.6',drinks:[{volumeMl:'272',abvPercent:'5'}]},
    {...defaults,weightKg:'52.6',drinks:[{volumeMl:'205',abvPercent:'6.8'}]}];
  const exactBoundary=cases.map(input=>{
    const {b}=derive(input),out=evaluate(input).result;
    const afterSpecified=b.sub(minStep.mul(new Q(out.minutesToBelowAdmin)));
    return {input,exactB:b,proseResult:out,exactBAfterDeclaredMinutes:afterSpecified,
      strictlyBelow:afterSpecified.cmp(new Q(3,10))<0,
      strictModelMinimum:afterSpecified.cmp(new Q(3,10))<0?out.minutesToBelowAdmin:out.minutesToBelowAdmin+1};
  });
  const roundedBand={...defaults,weightKg:'70.1',drinks:[{volumeMl:'362',abvPercent:'5'}]};
  const invalidRow={...defaults,drinks:[{volumeMl:350,abvPercent:'5'}]};
  return {exactBoundary,roundedBand:{input:roundedBand,exactB:derive(roundedBand).b,output:evaluate(roundedBand)},
    invalidRow:{input:invalidRow,firstShapeSentence:error('SCHEMA'),overrideRowRule:evaluate(invalidRow)},
    bareExport:canonicalReport(evaluate(defaults).result)};
}
exercise(import.meta.url,{slug:'bac-calculator',pr:235,fixtureBlob:'8b605893dc6e8b04136d405f5df6fdcb83efccaf',expectedCount:16,core:evaluate,controller,extra});
