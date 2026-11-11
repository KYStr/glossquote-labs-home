import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {applyOperation,validateRegistry,operationReferences,specMappingVerification} from './candidate/scripts/coordination-core.mjs';
import {executeOperation} from './candidate/scripts/coordination.mjs';
import * as f from './independent-fixtures.mjs';
import {transport,key} from './fake-github.mjs';
const rows=[];
async function test(id,body){try{rows.push({id,status:'PASS',detail:await body()??null});}catch(error){rows.push({id,status:'FAIL',error:{name:error.name,code:error.code,message:error.message}});}}
const register=x=>f.command(x.registry,f.mapper,'register-task',{task:x.mappingTask});
const expectedMakerIds=[f.author.id,f.original.id,f.ancestor.id,f.repair.id,f.mapper.id].sort();
function variant(mode){
 let r=f.empty();r=f.apply(r,f.author,'register-spec',{spec:{id:f.specId,title:'Synthetic age tool',document:f.oldDocument,source:f.baseline,acceptanceCriteria:f.documentCriteria}});
 r=f.apply(r,f.ancestor,'register-task',{task:{id:'ancestor-repair',title:'Ancestor variant',workType:'maintenance',source:mode==='cycle'?f.makeRef('3',f.documentPath):f.oldDocument,brief:f.makeRef('9','docs/reviews/ancestor/TASK.md'),acceptanceCriteria:f.maintCriteria}});
 r=f.startTask(r,f.ancestor,'ancestor-repair');let owner=f.ancestor;
 if(mode==='handoff'){
  owner={id:'local-codex:astra-fixture-ancestor-successor',executor:'local-codex'};r=f.acknowledge(r,owner);
  const offer=f.command(r,f.ancestor,'offer-handoff',{taskId:'ancestor-repair',claimId:f.task(r,'ancestor-repair').owner.claimId,toActorId:owner.id,checkpoint:'Synthetic safe handoff',evidenceRef:f.evidence});
  r=applyOperation(r,offer).registry;r=f.apply(r,owner,'accept-handoff',{taskId:'ancestor-repair',offerId:offer.operationId,evidence:'Synthetic successor accepts'});
  r=f.apply(r,owner,'start',{taskId:'ancestor-repair',claimId:f.task(r,'ancestor-repair').owner.claimId,evidence:'Synthetic successor starts'});
 }
 if(mode!=='unsubmitted')r=f.submitTask(r,owner,'ancestor-repair',f.ancestorCandidate,81);
 if(mode!=='unsubmitted'&&mode!=='pending')r=f.reviewTask(r,f.reviewer,'ancestor-repair');
 r=f.addAcceptedMaintenance(r,'latest-repair',f.repair,f.makeRef('2',f.documentPath),f.repairCandidate,82);
 const target={specId:f.specId,expectedAuthorId:f.author.id,expectedDocument:f.oldDocument,expectedSource:f.baseline,expectedCriteriaHash:f.hash(f.documentCriteria),document:f.makeRef('4',f.documentPath),source:f.makeRef('4','README.md'),acceptanceCriteria:f.productCriteria,mappingRef:f.mappingRef,sourceMaintenanceTaskIds:['latest-repair']};
 return{registry:r,target,mappingTask:{id:'independent-mapping',title:'Synthetic mapping',workType:'maintenance',source:f.baseline,brief:f.makeRef('9','docs/reviews/mapping/TASK.md'),acceptanceCriteria:f.documentCriteria,specRevisionTargets:[target]},ancestorOwner:owner};
}
await test('original-A01-pure-core-rejected-with-independent-recovery',()=>{
 const x=f.reviewingMapping();let r=x.registry;
 assert.deepEqual(f.task(r,x.mappingTask.id).contributors.slice().sort(),expectedMakerIds);
 assert.throws(()=>applyOperation(r,f.reviewCommand(r,f.ancestor,x.mappingTask.id)),{code:'INDEPENDENT_REVIEW_REQUIRED'});
 r=f.reviewTask(r,f.reviewer,x.mappingTask.id);const tasksBefore=structuredClone(r.tasks);
 r=applyOperation(r,f.maintainCommand(r)).registry;assert.deepEqual(r.tasks,tasksBefore);assert.equal(r.specs[0].status,'draft');assert.equal(r.specs[0].readiness,null);
 assert.deepEqual(r.specs[0].contributors.slice().sort(),expectedMakerIds);
 assert.throws(()=>applyOperation(r,f.readyCommand(r,f.ancestor)),{code:'INDEPENDENT_REVIEW_REQUIRED'});
 r=applyOperation(r,f.readyCommand(r)).registry;validateRegistry(r);assert.equal(r.specs[0].status,'ready');
 return{mappingReviewRejected:true,readyRejected:true,independentReady:'PASS',inheritedMakers:5};
});
await test('original-A01-full-adapter-rejected-before-PUT-with-independent-recovery',async()=>{
 const x=f.inputs(),fake=transport(x.registry,[x.target],x.mappingTask);const execute=(actor,action,fields)=>executeOperation(fake.client,f.command(fake.state.registry,actor,action,fields));
 await execute(f.mapper,'register-task',{task:x.mappingTask});await execute(f.mapper,'claim',{taskId:x.mappingTask.id});const claimId=f.task(fake.state.registry,x.mappingTask.id).owner.claimId;
 await execute(f.mapper,'start',{taskId:x.mappingTask.id,claimId,evidence:'Synthetic work'});await execute(f.mapper,'submit',{taskId:x.mappingTask.id,claimId,candidate:f.mappingCandidate,pullRequest:'https://github.com/'+f.repo+'/pull/83',evidence:'Synthetic fixed source',evidenceRef:f.evidence});
 const before=fake.state.puts;await assert.rejects(executeOperation(fake.client,f.reviewCommand(fake.state.registry,f.ancestor,x.mappingTask.id)),{code:'INDEPENDENT_REVIEW_REQUIRED'});assert.equal(fake.state.puts,before);
 await executeOperation(fake.client,f.reviewCommand(fake.state.registry,f.reviewer,x.mappingTask.id));await executeOperation(fake.client,f.maintainCommand(fake.state.registry));
 const beforeReady=fake.state.puts;await assert.rejects(executeOperation(fake.client,f.readyCommand(fake.state.registry,f.ancestor)),{code:'INDEPENDENT_REVIEW_REQUIRED'});assert.equal(fake.state.puts,beforeReady);
 await executeOperation(fake.client,f.readyCommand(fake.state.registry));assert.equal(fake.state.puts,7);assert.equal(fake.state.registry.specs[0].status,'ready');
 assert(fake.state.calls.some(c=>c.path.endsWith(f.ancestorCandidate.path)&&c.ref===f.ancestorCandidate.commit));
 return{rejectedSyntheticPuts:0,successfulSyntheticPuts:7,independentReady:'PASS',ancestorReferenceRead:true};
});
await test('ancestor-path-differs-and-every-known-reference-is-required',async()=>{
 const x=f.inputs(),cmd=register(x),refs=operationReferences(x.registry,cmd).map(key),up=f.task(x.registry,'ancestor-repair');assert.notEqual(up.submission.candidate.path,f.task(x.registry,'latest-repair').source.path);
 for(const ref of [up.source,up.brief,up.submission.candidate,up.submission.evidenceRef,up.acceptance.evidenceRef])assert(refs.includes(key(ref)));
 const fake=transport(x.registry,[x.target],x.mappingTask);fake.files.delete(key(up.submission.candidate));await assert.rejects(executeOperation(fake.client,cmd),{status:404});assert.equal(fake.state.puts,0);
});
await test('same-commit-multiple-records-all-makers-inherited',()=>{
 const x=f.inputs(),other={id:'local-codex:astra-fixture-other-ancestor',executor:'local-codex'};let r=f.acknowledge(x.registry,other);
 r=f.addAcceptedMaintenance(r,'other-ancestor',other,f.oldDocument,{...f.ancestorCandidate,path:'docs/reviews/second-ancestor/HANDOFF.md'},84);
 const cmd=f.command(r,f.mapper,'register-task',{task:x.mappingTask}),out=applyOperation(r,cmd).registry;
 const contributors=f.task(out,x.mappingTask.id).contributors;assert(contributors.includes(f.ancestor.id));assert(contributors.includes(other.id));assert.equal(contributors.length,new Set(contributors).size);
 const lineage=specMappingVerification(r,cmd).targets[0].lineage.map(t=>t.id).sort();assert.deepEqual(lineage,['ancestor-repair','latest-repair','other-ancestor']);return{lineage};
});
await test('former-and-current-ancestor-owners-are-both-inherited',()=>{
 const x=variant('handoff'),r=applyOperation(x.registry,register(x)).registry,makers=f.task(r,x.mappingTask.id).contributors;
 assert(makers.includes(f.ancestor.id));assert(makers.includes(x.ancestorOwner.id));return{formerOwner:f.ancestor.id,currentOwner:x.ancestorOwner.id};
});
await test('shared-ancestor-DAG-and-direct-duplicate-do-not-form-false-cycle',()=>{
 const x=f.inputs({includeAncestor:true});x.registry=f.addAcceptedMaintenance(x.registry,'parallel-repair',f.original,f.makeRef('2',f.documentPath),f.makeRef('5','docs/reviews/parallel/HANDOFF.md'),85);x.target.sourceMaintenanceTaskIds.push('parallel-repair');
 const cmd=register(x),r=applyOperation(x.registry,cmd).registry,lineage=specMappingVerification(x.registry,cmd).targets[0].lineage.map(t=>t.id);
 assert.equal(lineage.length,3);assert.equal(new Set(lineage).size,3);assert(f.task(r,x.mappingTask.id).contributors.includes(f.ancestor.id));
});
await test('multi-spec-parent-preserves-makers-from-every-declared-target',()=>{
 const x=f.inputs(),billId='spec-bill-split-calculator-20261109',billDoc=f.makeRef('1','docs/specs/bill-split-calculator/SPEC.md');let r=f.apply(x.registry,f.author,'register-spec',{spec:{id:billId,title:'Synthetic bill tool',document:billDoc,source:f.baseline,acceptanceCriteria:f.documentCriteria}});
 const ageTarget={...x.target,sourceMaintenanceTaskIds:[]},billTarget={...x.target,specId:billId,expectedDocument:billDoc,document:{...billDoc,commit:f.mappingRef.commit},sourceMaintenanceTaskIds:['ancestor-repair']};
 const upstream={...x.mappingTask,specRevisionTargets:[ageTarget,billTarget]};r=f.apply(r,f.mapper,'register-task',{task:upstream});r=f.startTask(r,f.mapper,upstream.id);r=f.submitTask(r,f.mapper,upstream.id,f.mappingCandidate,83);r=f.reviewTask(r,f.reviewer,upstream.id);
 const nextMaker={id:'local-codex:astra-fixture-downstream-maker',executor:'local-codex'};r=f.acknowledge(r,nextMaker);r=f.addAcceptedMaintenance(r,'downstream-repair',nextMaker,f.makeRef('4',f.documentPath),f.makeRef('5','docs/reviews/downstream/HANDOFF.md'),86);
 const nextTarget={...x.target,document:f.makeRef('6',f.documentPath),source:f.makeRef('6','README.md'),mappingRef:f.makeRef('6','docs/reviews/downstream/map.json'),sourceMaintenanceTaskIds:['downstream-repair']};
 const next={...x.mappingTask,id:'downstream-mapping',specRevisionTargets:[nextTarget]},cmd=f.command(r,f.repair,'register-task',{task:next}),out=applyOperation(r,cmd).registry,makers=f.task(out,next.id).contributors;
 for(const actor of [f.ancestor,f.mapper,nextMaker])assert(makers.includes(actor.id));
 const lineage=specMappingVerification(r,cmd).targets[0].lineage.map(t=>t.id).sort();assert.deepEqual(lineage,['ancestor-repair','downstream-repair','independent-mapping']);return{lineage};
});
for(const [mode,code] of [['cycle','MAINTENANCE_SOURCE_CYCLE'],['pending','MAINTENANCE_SOURCE_PENDING']])await test('known-'+mode+'-rejects-core-and-adapter-before-PUT',async()=>{
 const x=variant(mode),cmd=register(x);validateRegistry(x.registry);assert.throws(()=>applyOperation(x.registry,cmd),{code});const fake=transport(x.registry,[x.target],x.mappingTask);await assert.rejects(executeOperation(fake.client,cmd),{code});assert.equal(fake.state.puts,0);assert.deepEqual(fake.state.registry,x.registry);
});
await test('pending-record-at-same-commit-cannot-hide-behind-accepted-record',()=>{
 const x=f.inputs(),other={id:'local-codex:astra-fixture-pending-ancestor',executor:'local-codex'};let r=f.acknowledge(x.registry,other);
 r=f.apply(r,other,'register-task',{task:{id:'pending-ancestor',title:'Pending candidate',workType:'maintenance',source:f.oldDocument,brief:f.evidence,acceptanceCriteria:f.maintCriteria}});r=f.startTask(r,other,'pending-ancestor');r=f.submitTask(r,other,'pending-ancestor',{...f.ancestorCandidate,path:'docs/reviews/pending/HANDOFF.md'},87);
 assert.throws(()=>applyOperation(r,f.command(r,f.mapper,'register-task',{task:x.mappingTask})),{code:'MAINTENANCE_SOURCE_PENDING'});
});
await test('late-accepted-ancestor-before-mapping-review-blocks-existing-mapping',()=>{
 const x=variant('unsubmitted');let r=f.apply(x.registry,f.mapper,'register-task',{task:x.mappingTask});r=f.startTask(r,f.mapper,x.mappingTask.id);r=f.submitTask(r,f.mapper,x.mappingTask.id,f.mappingCandidate,83);
 r=f.submitTask(r,f.ancestor,'ancestor-repair',f.ancestorCandidate,81);r=f.reviewTask(r,f.reviewer,'ancestor-repair');validateRegistry(r);
 assert.throws(()=>applyOperation(r,f.reviewCommand(r,f.reviewer,x.mappingTask.id)),{code:'INDEPENDENT_REVIEW_REQUIRED'});
});
await test('ancestor-bytes-do-not-replace-wrong-direct-source',async()=>{
 const x=f.inputs(),fake=transport(x.registry,[x.target],x.mappingTask);const expected='Original specification corrected by ancestor A\nFurther correction by B\n';fake.put(f.makeRef('2',f.documentPath),expected);fake.put(f.makeRef('3',f.documentPath),'Wrong direct-source bytes\n');
 await assert.rejects(executeOperation(fake.client,register(x)),{code:'SPEC_SOURCE_MISMATCH'});assert.equal(fake.state.puts,0);
});
const result={candidate:'110e809c15b10004c2aadca6a6649b9324be1419',observedAt:new Date().toISOString(),node:process.version,tests:rows.length,passed:rows.filter(x=>x.status==='PASS').length,failed:rows.filter(x=>x.status==='FAIL').length,scope:'Narrow independent recheck of FH-CORE-A-01; FH-CORE-A-02 is separately reproduced and still blocks acceptance',rows};
await fs.writeFile(new URL('./source-chain-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(result.failed)process.exitCode=1;
