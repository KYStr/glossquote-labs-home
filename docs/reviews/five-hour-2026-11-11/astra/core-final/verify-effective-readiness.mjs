import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {applyOperation,validateRegistry,inventorySummary,LABS_BATCH_POLICY} from './candidate/scripts/coordination-core.mjs';
import {executeOperation} from './candidate/scripts/coordination.mjs';
import {stateBeforeLateSource,addStock} from './temporal-fixture-builder.mjs';
import * as f from './independent-fixtures.mjs';
import {transport} from './fake-github.mjs';
const rows=[];
async function test(id,body){try{rows.push({id,status:'PASS',detail:await body()??null});}catch(error){rows.push({id,status:'FAIL',error:{name:error.name,code:error.code,message:error.message}});}}
const scenarios=[
 {mode:'ready-reviewer-later-maker',options:{readyReviewer:f.ancestor},code:'INDEPENDENT_REVIEW_REQUIRED'},
 {mode:'mapping-reviewer-later-maker',options:{mappingReviewer:f.ancestor},code:'MAPPING_REVIEW_CONFLICT'},
 {mode:'source-pending-after-ready',options:{},pending:true,code:'MAINTENANCE_SOURCE_PENDING'},
 {mode:'source-cycle-after-ready',options:{cycle:true},code:'MAINTENANCE_SOURCE_CYCLE'},
 {mode:'new-maker-with-independent-reviewers',options:{},code:'MAINTENANCE_SOURCE_STALE'}
];
const production=(r,id='synthetic-production')=>({id,title:'Synthetic production',workType:'production',specId:f.specId,source:r.specs[0].document,brief:f.evidence,acceptanceCriteria:f.productCriteria});
function discover(r,pending=false){r=f.submitTask(r,f.ancestor,'ancestor-repair',f.ancestorCandidate,81);return pending?r:f.reviewTask(r,f.reviewer,'ancestor-repair');}
const staleStates=[];
for(const scenario of scenarios)await test('effective-gates-'+scenario.mode,async()=>{
 const x=stateBeforeLateSource(scenario.options);const before=addStock(x.registry);assert.equal(inventorySummary(before).readyUnconsumedCount,40);
 // Register before discovery for a legal existing-task claim probe; keep another unassigned branch for recovery.
 const registered=f.apply(before,f.primary,'register-task',{task:production(before)}),stale=discover(registered,scenario.pending),unassigned=discover(before,scenario.pending);
 validateRegistry(stale);validateRegistry(unassigned);assert.equal(inventorySummary(stale).readyUnconsumedCount,39);assert.equal(inventorySummary(unassigned).readyUnconsumedCount,39);
 assert.deepEqual(stale.specs,registered.specs);assert.deepEqual(f.task(stale,'independent-mapping'),f.task(registered,'independent-mapping'));assert.deepEqual(f.task(stale,'synthetic-production'),f.task(registered,'synthetic-production'));
 const reg=f.command(unassigned,f.primary,'register-task',{task:production(unassigned,'new-production')});assert.throws(()=>applyOperation(unassigned,reg),{code:scenario.code});
 const claim=f.command(stale,f.primary,'claim',{taskId:'synthetic-production'});assert.throws(()=>applyOperation(stale,claim),{code:scenario.code});
 const registrationTransport=transport(unassigned,[x.target],x.mappingTask);await assert.rejects(executeOperation(registrationTransport.client,reg),{code:scenario.code});assert.equal(registrationTransport.state.puts,0);assert.deepEqual(registrationTransport.state.registry,unassigned);
 const claimTransport=transport(stale,[x.target],x.mappingTask);await assert.rejects(executeOperation(claimTransport.client,claim),{code:scenario.code});assert.equal(claimTransport.state.puts,0);assert.deepEqual(claimTransport.state.registry,stale);
 staleStates.push({scenario,registry:unassigned,target:x.target,mappingTask:x.mappingTask});
 return{code:scenario.code,oldSnapshotStillValid:true,oldRecordsUnchanged:true,effectiveStock:39,staleStockExcluded:1,newRegistrationAndClaimRejected:true,syntheticPuts:0};
});
await test('new-ready-cannot-bypass-incomplete-current-mapping',()=>{
 const x=stateBeforeLateSource({});let r=x.registry;
 // Build the same legal pre-readiness state independently so no stored readiness is edited.
 const beforeReady=r.events.findLast(e=>e.action==='apply-spec-maintenance');assert(beforeReady);
 // A second unchanged-byte mapping safely resets to draft with current known makers, before late discovery.
 const spec=r.specs[0],target={...x.target,expectedDocument:spec.document,expectedSource:spec.source,expectedCriteriaHash:f.hash(spec.acceptanceCriteria),document:f.makeRef('5',f.documentPath),source:f.makeRef('5','README.md'),mappingRef:f.makeRef('5','docs/reviews/pre-discovery/map.json')};
 const task={...x.mappingTask,id:'pre-discovery-second-mapping',specRevisionTargets:[target]};r=f.apply(r,f.mapper,'register-task',{task});r=f.startTask(r,f.mapper,task.id);r=f.submitTask(r,f.mapper,task.id,f.makeRef('5','docs/reviews/pre-discovery/HANDOFF.md'),85);r=f.reviewTask(r,f.reviewer,task.id);r=applyOperation(r,f.command(r,f.primary,'apply-spec-maintenance',{taskId:task.id,specId:f.specId})).registry;
 r=discover(r);validateRegistry(r);assert.equal(r.specs[0].status,'draft');assert.throws(()=>applyOperation(r,f.readyCommand(r,f.reviewer)),{code:'MAINTENANCE_SOURCE_STALE'});assert.throws(()=>applyOperation(r,f.readyCommand(r,f.ancestor)),{code:'INDEPENDENT_REVIEW_REQUIRED'});
});
await test('unrelated-new-source-does-not-invalidate-effective-ready',()=>{
 const x=stateBeforeLateSource({readyReviewer:f.ancestor});let r=f.addAcceptedMaintenance(x.registry,'unrelated-maintenance',f.original,f.baseline,f.makeRef('8','docs/reviews/unrelated/HANDOFF.md'),89);assert.equal(inventorySummary(r).readyUnconsumedCount,1);assert.deepEqual(r.specs,x.registry.specs);
 r=f.apply(r,f.primary,'register-task',{task:production(r)});r=f.apply(r,f.primary,'claim',{taskId:'synthetic-production'});assert.equal(f.task(r,'synthetic-production').status,'claimed');
});
await test('existing-claim-and-consumption-preserved-but-reclaim-rejected',()=>{
 const x=stateBeforeLateSource({readyReviewer:f.ancestor});let r=addStock(x.registry);r=f.apply(r,f.primary,'register-task',{task:production(r)});r=f.apply(r,f.primary,'claim',{taskId:'synthetic-production'});const claimed=structuredClone(r),oldTask=structuredClone(f.task(r,'synthetic-production'));r=discover(r);validateRegistry(r);
 assert.deepEqual(f.task(r,'synthetic-production'),oldTask);assert.deepEqual(r.specs,claimed.specs);assert.equal(inventorySummary(r).readyUnconsumedCount,39);
 r=f.apply(r,f.primary,'release',{taskId:'synthetic-production',claimId:oldTask.owner.claimId,checkpoint:'Synthetic preserved ownership deliberately released',reason:'Synthetic reclaim probe',evidenceRef:f.evidence});
 assert.throws(()=>applyOperation(r,f.command(r,f.primary,'claim',{taskId:'synthetic-production'})),{code:'INDEPENDENT_REVIEW_REQUIRED'});
 return{existingOwnerClaimAndReadinessPreserved:true,newReclaimRejected:true};
});
for(const item of staleStates)await test('existing-mapping-recovery-'+item.scenario.mode,async()=>{
 let r=item.registry;
 if(item.scenario.pending)r=f.reviewTask(r,f.reviewer,'ancestor-repair');
 let direct='latest-repair',directCandidate=f.repairCandidate;
 if(item.scenario.options.cycle){
  // A cycle cannot be accepted as provenance. A separately accepted clean replacement supplies the same literal bytes.
  const maker={id:'local-codex:astra-fixture-clean-source-maker',executor:'local-codex'};r=f.acknowledge(r,maker);direct='clean-repair';directCandidate=f.makeRef('7','docs/reviews/clean/HANDOFF.md');r=f.addAcceptedMaintenance(r,direct,maker,f.oldDocument,directCandidate,87);
 }
 const old=structuredClone(r),spec=r.specs[0],target={specId:f.specId,expectedAuthorId:spec.authorId,expectedDocument:spec.document,expectedSource:spec.source,expectedCriteriaHash:f.hash(spec.acceptanceCriteria),document:f.makeRef('6',f.documentPath),source:f.makeRef('6','README.md'),acceptanceCriteria:f.productCriteria,mappingRef:f.makeRef('6','docs/reviews/fresh/map.json'),sourceMaintenanceTaskIds:[direct]};
 const task={id:'fresh-complete-mapping',title:'New independently reviewed complete mapping',workType:'maintenance',source:f.baseline,brief:f.evidence,acceptanceCriteria:f.documentCriteria,specRevisionTargets:[target]},candidate=f.makeRef('6','docs/reviews/fresh/HANDOFF.md');
 const fake=transport(r,[target],task);fake.state.head=candidate.commit;fake.put(target.mappingRef,JSON.stringify(fake.mapping));fake.put(candidate,'Synthetic fixed fresh mapping evidence\n');fake.put({...directCandidate,path:f.documentPath},'Original specification corrected by ancestor A\nFurther correction by B\n');
 const execute=(actor,action,fields)=>executeOperation(fake.client,f.command(fake.state.registry,actor,action,fields));
 await execute(f.mapper,'register-task',{task});assert(f.task(fake.state.registry,task.id).contributors.includes(f.ancestor.id));await execute(f.mapper,'claim',{taskId:task.id});const claimId=f.task(fake.state.registry,task.id).owner.claimId;await execute(f.mapper,'start',{taskId:task.id,claimId,evidence:'Synthetic mapping work'});await execute(f.mapper,'submit',{taskId:task.id,claimId,candidate,pullRequest:'https://github.com/'+f.repo+'/pull/83',evidence:'Synthetic fixed mapping',evidenceRef:f.evidence});
 const putsBeforeReject=fake.state.puts;await assert.rejects(executeOperation(fake.client,f.reviewCommand(fake.state.registry,f.ancestor,task.id)),{code:'INDEPENDENT_REVIEW_REQUIRED'});assert.equal(fake.state.puts,putsBeforeReject);
 await executeOperation(fake.client,f.reviewCommand(fake.state.registry,f.reviewer,task.id));await execute(f.primary,'apply-spec-maintenance',{taskId:task.id,specId:f.specId});
 const applied=fake.state.registry;assert.equal(applied.specs[0].status,'draft');assert.equal(applied.specs[0].readiness,null);assert.equal(applied.specs[0].maintenanceHistory.length,2);assert.deepEqual(applied.specs[0].maintenanceHistory[0],old.specs[0].maintenanceHistory[0]);assert.deepEqual(applied.specs[0].maintenanceHistory[1].previous.readiness,old.specs[0].readiness);assert.deepEqual(applied.tasks.filter(t=>t.id!==task.id),old.tasks);
 const putsBeforeReady=fake.state.puts;await assert.rejects(executeOperation(fake.client,f.readyCommand(fake.state.registry,f.ancestor)),{code:'INDEPENDENT_REVIEW_REQUIRED'});assert.equal(fake.state.puts,putsBeforeReady);
 await executeOperation(fake.client,f.readyCommand(fake.state.registry));assert.equal(inventorySummary(fake.state.registry).readyUnconsumedCount,40);
 await execute(f.primary,'register-task',{task:production(fake.state.registry)});await execute(f.primary,'claim',{taskId:'synthetic-production'});assert.equal(f.task(fake.state.registry,'synthetic-production').status,'claimed');assert.equal(fake.state.puts,9);assert.equal(inventorySummary(fake.state.registry).readyUnconsumedCount,39);
 return{historicalSnapshotsAndTasksPreserved:true,readyResetAndIndependentlyRechecked:true,sourceCycleUsedNewAcceptedCleanSource:Boolean(item.scenario.options.cycle),pendingSourceAcceptedBeforeRecovery:Boolean(item.scenario.pending),restoredEffectiveStock:40,productionClaimAfterRecovery:true,successfulSyntheticPuts:9,rejectedSyntheticPuts:0};
});
assert.deepEqual(LABS_BATCH_POLICY,{threshold:40,claimBatchSize:5,maxActivePerActor:1,submissionMode:'batch'});
const result={candidate:'93595abc7b2f9c46a07aaaa74418b3882c8901b4',observedAt:new Date().toISOString(),node:process.version,tests:rows.length,passed:rows.filter(r=>r.status==='PASS').length,failed:rows.filter(r=>r.status==='FAIL').length,scope:'Independent effective-readiness recheck with exact old fixture builders; no author tests, real credentials or registry writes',policyUnchanged:true,rows};await fs.writeFile(new URL('./effective-readiness-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(result.failed)process.exitCode=1;
