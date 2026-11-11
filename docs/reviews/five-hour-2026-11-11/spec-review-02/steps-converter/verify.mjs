import { Q, dec, error, ok, exactStrings, basicText, numericFormat, inRange, exercise, canonicalReport, ReferenceState, checkValue } from '../review-lib.mjs';

const defaults = {steps:'10000',strideSource:'height',strideCm:'70',heightCm:'170',calories:'off',weightKg:'65'};
const order = Object.keys(defaults);
function evaluate(i) {
  if (!exactStrings(i,order)) return error('SCHEMA');
  for (const key of order) {
    const active = (key !== 'heightCm'||i.strideSource==='height') && (key !== 'strideCm'||i.strideSource==='measured') && (key !== 'weightKg'||i.calories==='on');
    const value=i[key];
    const basic=basicText(value,8,active);
    if(basic) return error(basic,key);
    if(!active) continue;
    if(key==='strideSource' || key==='calories') {
      if(!(key==='strideSource'?['measured','height']:['off','on']).includes(value)) return error('ENUM',key);
      continue;
    }
    const rule={steps:[0,0,99999999],strideCm:[2,20,150],heightCm:[1,80,250],weightKg:[1,20,500]}[key];
    if(!numericFormat(value,rule[0]))return error(rule[0]===0?'INTEGER_FORMAT':'DECIMAL_FORMAT',key);
    if(!inRange(dec(value),rule[1],rule[2]))return error('RANGE',key);
  }
  const stride=i.strideSource==='height'?dec(i.heightCm).mul(new Q(207,500)):dec(i.strideCm);
  const km=stride.mul(dec(i.steps)).div(new Q(100000));
  return ok({strideCm:stride.round(1),distanceKm:km.round(2),stepsPerKm:new Q(100000).div(stride).round(),
    caloriesKcal:i.calories==='on'?new Q(3,4).mul(dec(i.weightKg)).mul(km).round():null});
}
function controller(id,i) {
  const m=new ReferenceState(evaluate,defaults);
  if(id==='state-dirty-error') {
    m.finish(m.start(i.initial));
    const afterRun=m.snapshot();
    m.edit(i.edit);
    const afterEdit=m.snapshot();
    m.finish(m.start());
    return {derived:{afterRun,afterEdit,afterRerun:m.snapshot()}};
  }
  if(id==='state-cancel-late') {
    const token=m.start(i.draft);
    const whilePending=m.snapshot();
    m.cancel();
    const afterCancel=m.snapshot({draft:true});
    const late=evaluate(i.draft);
    m.finish(token,late);
    const afterLateResult=m.snapshot();
    m.reset();
    return {derived:{whilePending,afterCancel,afterLateResult,afterReset:m.snapshot({draft:true})},
      checks:[checkValue('lateResult from cancelled input',i.lateResult,late.result)]};
  }
  if(id==='state-replace-late') {
    const old=m.start(i.olderDraft);
    m.finish(m.start(i.newerDraft));
    const afterNewerResult=m.snapshot();
    const late=evaluate(i.olderDraft);
    m.finish(old,late);
    return {derived:{afterNewerResult,afterOlderLateResult:m.snapshot()},
      checks:[checkValue('olderLateResult from replaced input',i.olderLateResult,late.result)]};
  }
  throw new Error('unknown state fixture '+id);
}
function extra() {
  const rounding={...defaults,steps:'100000',heightCm:'171'};
  const measured={...defaults,steps:'1000',strideSource:'measured',strideCm:'140'};
  const calcActual=evaluate(rounding).result;
  const fromDisplayed=evaluate({...rounding,strideSource:'measured',strideCm:String(calcActual.strideCm)}).result;
  const nameplate=canonicalReport(evaluate(defaults).result);
  const paceRows=[20,15].map(pace=>{const stepsPerMile=1916+63.4*pace-14.1*70;
    return {maleHeightInches:70,paceMinutesPerMile:pace,stepsPerMile,singleStepCm:160934.4/stepsPerMile,ratioToHeight:160934.4/stepsPerMile/177.8};});
  return {download:nameplate,reportBytesAndDigestMatch:nameplate.bytes===74&&nameplate.sha256==='4489db044b31e62ef7cd6ee2748de127590b4788d0f641feb2ad3c274939fdcd',
    faqContradiction:{input:rounding,calculated:calcActual,ifUsingDisplayed:fromDisplayed},
    twoStepVsOneStep:{input:measured,ifEnteringTwoStepStride:evaluate(measured),ifEnteringTruePerStep:evaluate({...measured,strideCm:'70'})},
    primaryEquationCounterexample:paceRows,
    compendium:{historical2011:[3.5/4.8,4.3/5.6],published2024AtSameSpeeds:[3.8/4.8,4.8/5.6]}};
}
exercise(import.meta.url,{slug:'steps-converter',pr:234,fixtureBlob:'892b9192c36f7ec5906db8b692f09a567287d083',expectedCount:22,core:evaluate,controller,extra});
