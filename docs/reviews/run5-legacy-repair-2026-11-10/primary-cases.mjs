import assert from 'node:assert/strict';
import fs from 'node:fs';
import {run as salary} from '../../../tools/salary-converter/public/js/core/salary.mjs';
import {run as age} from '../../../tools/age-calculator/public/js/core/age.mjs';
import {run as cooking} from '../../../tools/cooking-measurement-converter/public/js/core/convert.mjs';
import {run as days} from '../../../tools/workdays-calculator/public/js/core/core.mjs';
import {createController} from '../../../tools/workdays-calculator/public/js/controller.mjs';
const results=[];function check(id,fn){fn();results.push({id,status:'PASS'});}
for(const [bonus,expected] of [['24.55','INPUT_LIMIT'],['0.55','DECIMAL_FORMAT'],['24.1','RANGE']])check('salary-'+bonus,()=>assert.equal(salary({sourceBasis:'monthly',amount:'40000',bonusMonths:bonus}).error.code,expected));
check('salary-fractional-annual-round',()=>assert.equal(salary({sourceBasis:'monthly',amount:'0.01',bonusMonths:'0'}).result.annualBase,0));
check('salary-half-up',()=>assert.equal(salary({sourceBasis:'monthly',amount:'45000',bonusMonths:'0'}).result.hourly,188));
for(const [birthDate,referenceDate,totalDays,months,remainder] of [
 ['2023-01-31','2023-02-28',28,0,28],['2023-01-31','2023-03-01',29,0,29],['2023-01-31','2023-03-02',30,0,30],['2023-01-31','2023-03-03',31,1,0],['2023-01-30','2023-03-01',30,0,30],['2024-01-31','2024-03-01',30,0,30],['2000-02-29','2025-03-01',9132,0,0]
])check('age-'+birthDate+'-'+referenceDate,()=>{const r=age({birthDate,referenceDate}).result;assert.equal(r.totalDays,totalDays);assert.equal(r.ageMonths,months);assert.equal(r.ageDays,remainder);});
for(const [fromUnit,code] of [['oz','ENUM'],['liter','INPUT_LIMIT']])check('cooking-'+fromUnit,()=>assert.equal(cooking({amount:'1',fromUnit,toUnit:'ml',ingredient:'none'}).error.code,code));
const base={mode:'count',startDate:'2026-01-05',endDate:'2026-01-09',holidays:''};
for(const [label,sep] of [['lf','\n'],['crlf','\r\n']]){
 check('holidays-400-'+label,()=>{const r=days({...base,holidays:Array(400).fill('2026-01-07').join(sep)});assert.equal(r.ok,true);assert.equal(r.result.businessDays,3);});
 check('holidays-401-'+label,()=>assert.deepEqual(days({...base,holidays:Array(401).fill('2026-01-07').join(sep)}).error,{code:'ROW_LIMIT',field:'holidays',row:401}));
}
check('holidays-raw-cap',()=>assert.equal(days({...base,holidays:' '.repeat(8193)}).error.code,'INPUT_LIMIT'));
check('workdays-negative-zero',()=>assert.equal(days({mode:'shift',startDate:'2026-01-05',days:'-0',holidays:''}).error.code,'INTEGER_FORMAT'));
check('workdays-reverse-counterexample',()=>{const r=days({...base,startDate:'2026-01-11',endDate:'2026-01-08'});assert.equal(r.result.businessDays,-1);assert.equal(days({mode:'shift',startDate:'2026-01-11',days:'-1',holidays:''}).result.resultDate,'2026-01-09');});
check('worker-creation-error-is-recoverable',()=>{const c=createController({createWorker(){throw Error('synthetic unavailable')}});c.updateDraft({...base,days:'5'});assert.equal(c.execute().status,'error');assert.equal(c.getState().error.code,'WORKER_ERROR');});
check('worker-cancel-late-does-not-revive',()=>{let w;const c=createController({createWorker(){return w={terminate(){this.stopped=true},postMessage(m){this.request=m}}}});c.updateDraft({...base,days:'5'});c.execute();const req=w.request;c.cancel();assert.equal(w.stopped,true);w.onmessage({data:{...days(base),generation:req.generation}});assert.equal(c.getState().status,'cancelled');assert.equal(c.getState().resultAvailable,false);});
check('worker-edit-late-does-not-revive',()=>{let w;const c=createController({createWorker(){return w={terminate(){this.stopped=true},postMessage(m){this.request=m}}}});c.updateDraft({...base,days:'5'});c.execute();const req=w.request;c.updateDraft({...base,days:'6'});w.onmessage({data:{...days(base),generation:req.generation}});assert.equal(c.getState().status,'dirty');assert.equal(w.stopped,true);});
check('worker-success-disposes',()=>{let w;const c=createController({createWorker(){return w={terminate(){this.stopped=true},postMessage(m){this.request=m}}}});c.updateDraft({...base,days:'5'});c.execute();w.onmessage({data:{...days(base),generation:w.request.generation}});assert.equal(c.getState().status,'success');assert.equal(w.stopped,true);});
const report={scope:'25 independent fixed arithmetic/controller cases; fake Worker events are Node unit checks, not browser evidence',count:results.length,results,browser:'NOT_RUN'};
fs.writeFileSync(new URL('./primary-cases.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({count:results.length,status:'PASS'}));
