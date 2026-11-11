import { Q, dec, error, ok, exactStrings, basicText, match, inRange, exercise, canonicalReport, standardController } from '../review-lib.mjs';

const defaults={fatherHeightCm:'178',motherHeightCm:'165',childSex:'boy'};
const fields=Object.keys(defaults);
function evaluate(input){
 if(!exactStrings(input,fields))return error('SCHEMA');
 for(const k of fields){
  const s=input[k],basic=basicText(s,8);
  if(basic)return error(basic,k);
  if(k==='childSex'){
   if(!['boy','girl'].includes(s))return error('ENUM',k);
   continue;
  }
  if(!match(s,/^(0|[1-9][0-9]{0,2})(?:\.[0-9])?$/u))return error('DECIMAL_FORMAT',k);
  if(!inRange(dec(s),100,230))return error('RANGE',k);
 }
 const halfSum=dec(input.fatherHeightCm).add(dec(input.motherHeightCm)).div(new Q(2));
 const correction=new Q(input.childSex==='boy'?13:-13,2);
 const estimate=halfSum.add(correction), delta=new Q(17,2);
 return ok({childSex:input.childSex,targetCm:estimate.round(1),rangeLowCm:estimate.sub(delta).round(1),rangeHighCm:estimate.add(delta).round(1)});
}
function extra(){
 const anthropometry=[{fatherHeightCm:'100.0',motherHeightCm:'100.0',childSex:'girl'},
  {fatherHeightCm:'230.0',motherHeightCm:'230.0',childSex:'boy'},
  {...defaults,fatherHeightCm:'175.5',motherHeightCm:'168.0'}].map(i=>({input:i,output:evaluate(i)}));
 const onlyParentHeights={fatherHeightCm:'178',motherHeightCm:'165'};
 return {bareExport:canonicalReport(evaluate(defaults).result), anthropometry, omitChildField:{input:onlyParentHeights,output:evaluate(onlyParentHeights)}};
}
exercise(import.meta.url,{slug:'child-height-predictor',pr:238,fixtureBlob:'3aae38d54340aabe5a0750fefc9b0600b3b2be83',expectedCount:17,core:evaluate,controller:standardController(evaluate,defaults),extra});
