import { Q, dec, error, ok, exactStrings, match, inRange, exercise, canonicalReport, standardController } from '../review-lib.mjs';

const defaults={heightCm:'',sex:'female'};
const fields=Object.keys(defaults);
const examples={
 male:{devine:[50,2.3],robinson:[52,1.9],miller:[56.2,1.41],hamwi:[106,6]},
 female:{devine:[45.5,2.3],robinson:[49,1.7],miller:[53.1,1.36],hamwi:[100,5]},
};
const evaluateLinear=(over60,[base,slope])=>dec(base).add(over60.mul(dec(slope)));
function evaluate(i){
 if(!exactStrings(i,fields))return error('SCHEMA');
 for(const k of fields){
  const s=i[k];
  if(s.length>8)return error('INPUT_LIMIT',k);
  if(!s.isWellFormed()||/[\u0000-\u001F\u007F-\u009F\p{Cf}]/u.test(s))return error('UNICODE',k);
  if(s==='')return error('EMPTY',k);
  if(k==='heightCm'){
   if(!match(s,/^[0-9]+(?:\.[0-9])?$/u))return error('DECIMAL_FORMAT',k);
   if(!inRange(dec(s),130,230))return error('RANGE',k);
  } else if(!['male','female'].includes(s))return error('ENUM',k);
 }
 const height=dec(i.heightCm),metres=height.div(new Q(100)),area=metres.mul(metres);
 const inches=height.div(dec(2.54)),over60=inches.sub(new Q(60));
 const formulasKg=Object.fromEntries(Object.entries(examples[i.sex]).map(([formula,coef])=>{
  let q=evaluateLinear(over60,coef);
  if(formula==='hamwi')q=q.mul(dec('0.45359237'));
  return [formula,q.round(1)];
 }));
 return ok({heightCm:height.round(1),sex:i.sex,heightInches:inches.round(1),formulasKg,
  healthyRangeKg:{lowKg:area.mul(dec(18.5)).round(1),highKg:area.mul(dec(24.9)).round(1)},
  bmi22Kg:area.mul(new Q(22)).round(1)});
}
function extra(){
 const input={heightCm:'170',sex:'male'};
 const {result}=evaluate(input);
 const area=dec('1.7').mul(dec('1.7')),over60=dec('170').div(dec('2.54')).sub(new Q(60));
 const original= evaluateLinear(over60,[51.65,1.85]);
 const altMiller=evaluateLinear(over60,[55.7,1.39]);
 const hypotheticalBMI=dec('72.1').div(area);
 const underFive=evaluate({heightCm:'130',sex:'female'}).result;
 const lone=JSON.parse('"'+String.fromCharCode(92)+'ud800"');
 return {bareExport:canonicalReport(result),
   normalBand:{input,displayedHighKg:result.healthyRangeKg.highKg,highFrom24_9:area.mul(dec(24.9)),
     exactExclusiveHighKg:area.mul(new Q(25)),exampleKg:72.1,exampleBMI:hypotheticalBMI,exampleBMI3dp:hypotheticalBMI.round(3),
     exampleBelow25:hypotheticalBMI.cmp(new Q(25))<0},
   formulaProvenance:{input,declaredRobinsonKg:result.formulasKg.robinson,originalRobinsonExactKg:original,originalRobinsonRoundedKg:original.round(1),
     declaredMillerKg:result.formulasKg.miller,alternatePublishedMillerKg:altMiller.round(1)},
   adultExtrapolation:{syntheticHeightCm:130,candidate:underFive,
     bmiOfDevineResult:dec(underFive.formulasKg.devine).div(dec('1.69')).round(2)},
   unicode:{loneSurrogate:evaluate({...input,heightCm:lone}),formatControl:evaluate({...input,heightCm:'170\u200B'}),c0:evaluate({...input,heightCm:'170\n'}),fullwidth:evaluate({...input,heightCm:'１７０'})}};
}
exercise(import.meta.url,{slug:'ideal-weight-calculator',pr:239,fixtureBlob:'ce1d7499c48b65291c8f9899a5049c0eec24830c',expectedCount:19,core:evaluate,controller:standardController(evaluate,defaults),extra});
