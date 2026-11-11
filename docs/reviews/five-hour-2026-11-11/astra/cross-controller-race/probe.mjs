import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url)),pins=JSON.parse(await fs.readFile(path.join(root,'source-pins.json'),'utf8'));
for(const f of pins.files){const b=await fs.readFile(path.join(root,'candidate',f.path));assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),f.blob,f.path);}
const cases=[],tools=[];
for(const slug of pins.slugs){
 const base=path.join(root,'candidate/tools',slug,'public/js'),controller=await import(pathToFileURL(path.join(base,'controller.mjs'))),corePin=pins.files.find(x=>x.path.startsWith('tools/'+slug+'/public/js/core/')&&!x.path.endsWith('/messages.mjs')),core=await import(pathToFileURL(path.join(root,'candidate',corePin.path)));
 const make=()=>{const workers=[];const c=controller.createController({createWorker(){const w={terminated:false,message:null,terminate(){this.terminated=true;},postMessage(m){this.message=structuredClone(m);}};workers.push(w);return w;}});const run=()=>c.run?c.run():c.execute();const status=()=>c.getState().state??c.getState().status;const example=()=>c.loadExample?c.loadExample():c.updateDraft({mode:'count',startDate:'2026-11-02',endDate:'2026-11-06',days:'5',holidays:''});const edit=x=>c.edit?c.edit(x):c.updateDraft(x);return{c,workers,run,status,example,edit};};
 for(const route of ['run-again','cancel-run','edit-run','reset-run'])for(const outcome of ['success','validation-error']){
  const h=make();h.example();if(outcome==='validation-error'){const d=h.c.getState().draft;h.edit(Object.fromEntries(Object.keys(d).map(k=>[k,''])));}
  h.run();const old=h.workers[0],oldHandler=old.onmessage,oldPayload=core.run(old.message.snapshot);assert.equal(oldPayload.ok,outcome==='success',slug+' old payload');
  if(route==='cancel-run')h.c.cancel();
  if(route==='reset-run')h.c.reset();
  if(route==='edit-run'){const d=h.c.getState().draft,key=Object.keys(d)[0];h.edit({...d,[key]:String(d[key])+'-changed'});}
  if(outcome==='validation-error')h.example();
  h.run();const current=h.workers[1];assert.equal(h.status(),'busy');assert(old.terminated);assert(!current.terminated);assert.notEqual(old.message.generation,current.message.generation);
  const before=structuredClone(h.c.getState());oldHandler({data:{generation:old.message.generation,...oldPayload}});const after=structuredClone(h.c.getState());
  const currentTerminatedByStale=current.terminated;const ignored=h.status()==='busy'&&!current.terminated&&after.result===null&&after.error===null;
  let finalCurrentReply=null;if(ignored){const payload=core.run(current.message.snapshot);current.onmessage({data:{generation:current.message.generation,...payload}});finalCurrentReply={expected:payload.ok?'success':'error',actual:h.status()};assert.equal(finalCurrentReply.actual,finalCurrentReply.expected);}
  cases.push({slug,route,outcome,oldGeneration:old.message.generation,currentGeneration:current.message.generation,oldTerminated:true,before,oldPayload,after,currentTerminatedByStale,currentTerminatedAfterFinalControl:current.terminated,staleIgnored:ignored,verdict:ignored?'PASS_STALE_REJECTED':'CONFIRMED_STALE_REPLY_ACCEPTED',finalCurrentReply});
 }
 for(const control of ['current-success','wrong-message-generation','old-onerror']){
  const h=make();h.example();h.run();const old=h.workers[0];let current=old;
  if(control==='old-onerror'){h.run();current=h.workers[1];old.onerror({message:'controlled stale error'});assert.equal(h.status(),'busy');assert(!current.terminated);}
  if(control==='wrong-message-generation'){old.onmessage({data:{generation:old.message.generation+99,...core.run(old.message.snapshot)}});assert.equal(h.status(),'busy');assert(!old.terminated);}
  const payload=core.run(current.message.snapshot);assert.equal(payload.ok,true);current.onmessage({data:{generation:current.message.generation,...payload}});assert.equal(h.status(),'success');assert.deepEqual(h.c.getState().result,payload.result);cases.push({slug,control,verdict:'PASS_CONTROL'});
 }
 const file=path.join(base,'controller.mjs'),text=await fs.readFile(file,'utf8'),lines=text.split(/\r?\n/),source=pins.files.find(x=>x.path==='tools/'+slug+'/public/js/controller.mjs');
 tools.push({slug,path:source.path,blob:source.blob,line:lines.findIndex(x=>x.includes('data.generation !== postedGeneration')||x.includes('myGeneration !== generation'))+1,pattern:text.includes('data.generation !== postedGeneration || state !== "busy"'),negativeCases:8,confirmedFailures:cases.filter(x=>x.slug===slug&&x.verdict==='CONFIRMED_STALE_REPLY_ACCEPTED').length,controls:3,verdict:cases.some(x=>x.slug===slug&&x.verdict==='CONFIRMED_STALE_REPLY_ACCEPTED')?'CONFIRMED_DEFECT':'PASS_TESTED_RACE_GUARD'});
}
const findings=tools.filter(x=>x.confirmedFailures>0),result={status:findings.length?'DEFECTS_CONFIRMED':'PASS_TESTED_SCOPE',observedAt:new Date().toISOString(),node:process.version,sourceCommit:pins.head,sourcePins:31,scopeTools:10,tools,cases,totalCases:cases.length,confirmedNegativeCases:cases.filter(x=>x.verdict==='CONFIRMED_STALE_REPLY_ACCEPTED').length,positiveControls:cases.filter(x=>x.verdict==='PASS_CONTROL').length,patternOnly:[],notRun:['real browser Worker delivery scheduling','DOM/download/GUI','PR325 two controllers already handled by primary'],limitations:'Controlled injected Worker preserves old callback after terminate to exercise controller contract; no claim about native browser delivery frequency. Core run only constructs authentic worker payload, not independent arithmetic acceptance.'};
await fs.writeFile(path.join(root,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,tools,totalCases:result.totalCases,confirmedNegativeCases:result.confirmedNegativeCases,positiveControls:result.positiveControls}));
process.exitCode=findings.length?1:0;

