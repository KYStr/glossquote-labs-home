import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {applyOperation,applyBatch,validateRegistry} from './candidate/scripts/coordination-core.mjs';
import {executeOperation} from './candidate/scripts/coordination.mjs';
import * as f from './independent-fixtures.mjs';
import {transport,key} from './fake-github.mjs';
const rows=[];
async function probe(id,fn){try{const detail=await fn();rows.push({id,status:'PASS',detail:detail??null});}catch(error){rows.push({id,status:'FAIL',error:{code:error.code,message:error.message}});}}
function accepted(){const x=f.reviewingMapping({includeAncestor:true});return{...x,registry:f.reviewTask(x.registry,f.reviewer,x.mappingTask.id)};}
function applied(){const x=accepted();return{...x,registry:applyOperation(x.registry,f.maintainCommand(x.registry)).registry};}
await probe('all-declared-makers-blocked-from-mapping-review',()=>{
 const x=f.reviewingMapping({includeAncestor:true});for(const actor of [f.author,f.original,f.ancestor,f.repair,f.mapper])assert.throws(()=>applyOperation(x.registry,f.reviewCommand(x.registry,actor,x.mappingTask.id)),{code:'INDEPENDENT_REVIEW_REQUIRED'});
 return{blockedActors:5};
});
await probe('application-preserves-all-other-records-and-clears-ready',()=>{
 const x=accepted(),before=structuredClone(x.registry),after=applyOperation(x.registry,f.maintainCommand(x.registry)).registry;
 assert.deepEqual(x.registry,before);assert.deepEqual(after.tasks,before.tasks);assert.deepEqual(after.actors,before.actors);assert.deepEqual(after.baseline,before.baseline);
 assert.deepEqual(after.events.slice(0,-1),before.events);assert.equal(after.specs[0].status,'draft');assert.equal(after.specs[0].readiness,null);
 assert.equal(after.specs[0].authorId,f.author.id);assert.equal(after.specs[0].maintenanceHistory.length,1);assert.deepEqual(after.specs[0].maintenanceHistory[0].previous.document,f.oldDocument);
 return{originalTasksPreserved:before.tasks.length};
});
await probe('all-declared-makers-blocked-from-ready',()=>{
 const x=applied();for(const actor of [f.author,f.original,f.ancestor,f.repair,f.mapper])assert.throws(()=>applyOperation(x.registry,f.readyCommand(x.registry,actor)),{code:'INDEPENDENT_REVIEW_REQUIRED'});
 return{blockedActors:5};
});
await probe('independent-eight-section-ready-retains-nine-product-criteria',()=>{
 const x=applied(),r=applyOperation(x.registry,f.readyCommand(x.registry)).registry;
 assert.equal(r.specs[0].status,'ready');assert.deepEqual(r.specs[0].acceptanceCriteria.map(x=>x.id),f.productNames);
 assert.deepEqual(f.task(r,'original-spec-task').acceptanceCriteria.map(x=>x.id),f.sectionNames);
 assert.deepEqual(f.task(r,'independent-mapping').acceptanceCriteria.map(x=>x.id),f.sectionNames);
 return{originalTaskAspects:8,mappingAspects:8,productAspects:9};
});
await probe('replay-preserves-single-history-and-event',()=>{
 const x=accepted(),cmd=f.maintainCommand(x.registry),first=applyOperation(x.registry,cmd);
 const replay=applyOperation(first.registry,cmd);assert(replay.idempotent);assert.deepEqual(replay.registry,first.registry);
 assert.throws(()=>applyOperation(first.registry,{...cmd,specId:'spec-bill-split-calculator-20261109'}),{code:'IDEMPOTENCY_CONFLICT'});
 return{historyEntries:replay.registry.specs[0].maintenanceHistory.length};
});
await probe('second-round-history-and-makers-remain',()=>{
 const x=applied();let r=applyOperation(x.registry,f.readyCommand(x.registry)).registry;const prior=structuredClone(r.specs[0]);
 const actor={id:'local-codex:astra-fixture-second-mapper',executor:'local-codex'};r=f.acknowledge(r,actor);
 const target={...x.target,expectedDocument:prior.document,expectedSource:prior.source,expectedCriteriaHash:f.hash(prior.acceptanceCriteria),
  document:f.makeRef('5',f.documentPath),source:f.makeRef('5','README.md'),mappingRef:f.makeRef('5','docs/reviews/mapping2/map.json'),sourceMaintenanceTaskIds:['independent-mapping']};
 const task={...x.mappingTask,id:'second-mapping',specRevisionTargets:[target]};
 r=f.apply(r,actor,'register-task',{task});r=f.startTask(r,actor,task.id);r=f.submitTask(r,actor,task.id,f.makeRef('5','docs/reviews/mapping2/HANDOFF.md'),84);r=f.reviewTask(r,f.reviewer,task.id);
 r=applyOperation(r,f.command(r,f.primary,'apply-spec-maintenance',{taskId:task.id,specId:f.specId})).registry;
 assert.deepEqual(r.specs[0].maintenanceHistory[0],prior.maintenanceHistory[0]);assert.deepEqual(r.specs[0].maintenanceHistory[1].previous.readiness,prior.readiness);
 for(const maker of [f.author,f.original,f.ancestor,f.repair,f.mapper,actor])assert.throws(()=>applyOperation(r,f.readyCommand(r,maker)),{code:'INDEPENDENT_REVIEW_REQUIRED'});
 validateRegistry(r);return{historyEntries:2,blockedHistoricalMakers:6};
});
await probe('stale-target-after-author-revision-rejected',()=>{
 const x=accepted();const r=f.apply(x.registry,f.author,'revise-spec',{specId:f.specId,document:f.makeRef('6',f.documentPath),source:f.baseline,acceptanceCriteria:f.documentCriteria,evidence:'Synthetic intervening author revision.'});
 assert.throws(()=>applyOperation(r,f.maintainCommand(r)),{code:'SPEC_MAINTENANCE_STALE'});
});
await probe('invalid-final-batch-child-rolls-back-every-target',()=>{
 const x=accepted(),before=structuredClone(x.registry);const first=f.maintainCommand(x.registry);
 const second={...f.maintainCommand(x.registry),expectedRevision:x.registry.revision+1,specId:'spec-outside-the-forty-20261109'};
 assert.throws(()=>applyBatch(x.registry,[first,second]));assert.deepEqual(x.registry,before);
});
await probe('unknown-target-field-and-product-rubric-substitution-rejected',()=>{
 const x=f.inputs({includeAncestor:true});
 for(const change of [{unverifiedContributor:f.reviewer.id},{acceptanceCriteria:f.documentCriteria}])assert.throws(()=>f.apply(x.registry,f.mapper,'register-task',{task:{...x.mappingTask,specRevisionTargets:[{...x.target,...change}]}}));
});
await probe('empty-sources-cannot-import-changed-bytes',async()=>{
 const x=f.inputs();x.target.sourceMaintenanceTaskIds=[];const fake=transport(x.registry,[x.target],x.mappingTask);
 await assert.rejects(executeOperation(fake.client,f.command(x.registry,f.mapper,'register-task',{task:x.mappingTask})),{code:'SPEC_SOURCE_MISMATCH'});assert.equal(fake.state.puts,0);
});
await probe('empty-sources-allow-only-byte-identical-old-document',async()=>{
 const x=f.inputs();x.target.sourceMaintenanceTaskIds=[];const fake=transport(x.registry,[x.target],x.mappingTask);
 const prior=Buffer.from(fake.files.get(key(x.target.expectedDocument)).content,'base64');fake.put(x.target.document,prior);
 Object.assign(fake.mapping.targets[0].document,{bytes:prior.length,sha256:createHash('sha256').update(prior).digest('hex')});fake.put(f.mappingRef,JSON.stringify(fake.mapping));
 const result=await executeOperation(fake.client,f.command(x.registry,f.mapper,'register-task',{task:x.mappingTask}));assert(result.saved);assert.equal(fake.state.puts,1);
 assert(!f.task(fake.state.registry,x.mappingTask.id).contributors.includes(f.ancestor.id));return{unchangedDocumentMayUseEmptySources:true};
});
await probe('empty-sources-do-not-authorize-source-file-edits',async()=>{
 const x=f.inputs();x.target.sourceMaintenanceTaskIds=[];const fake=transport(x.registry,[x.target],x.mappingTask);
 const prior=Buffer.from(fake.files.get(key(x.target.expectedDocument)).content,'base64');fake.put(x.target.document,prior);fake.put(x.target.source,'unreviewed source file change');
 await assert.rejects(executeOperation(fake.client,f.command(x.registry,f.mapper,'register-task',{task:x.mappingTask})),{code:'SPEC_SOURCE_MISMATCH'});assert.equal(fake.state.puts,0);
});
await probe('closed-or-moved-mapping-pr-prevents-put',async()=>{
 for(const mode of ['closed','moved']){const x=accepted(),fake=transport(x.registry,[x.target],x.mappingTask);if(mode==='closed')fake.state.open=false;else fake.state.head='8'.repeat(40);
  await assert.rejects(executeOperation(fake.client,f.maintainCommand(x.registry)),{code:mode==='closed'?'INVALID_STATE':'CANDIDATE_MISMATCH'});assert.equal(fake.state.puts,0);}
});
await probe('mapping-checks-cannot-be-disabled-by-verifyReferences-false',async()=>{
 const x=accepted(),fake=transport(x.registry,[x.target],x.mappingTask);fake.put(f.mappingRef,'{"targets":[]}');
 await assert.rejects(executeOperation(fake.client,f.maintainCommand(x.registry),{verifyReferences:false}),{code:'INVALID_SPEC_MAPPING'});assert.equal(fake.state.puts,0);
});
await probe('cas-conflict-attempts-exactly-one-put-without-mutation',async()=>{
 const x=accepted(),fake=transport(x.registry,[x.target],x.mappingTask);fake.state.conflict=true;
 await assert.rejects(executeOperation(fake.client,f.maintainCommand(x.registry)),{code:'REVISION_CONFLICT'});assert.equal(fake.state.puts,1);assert.deepEqual(fake.state.registry,x.registry);
});
await probe('lost-response-resolves-exact-operation-with-no-repeat-put',async()=>{
 const x=accepted(),fake=transport(x.registry,[x.target],x.mappingTask);fake.state.losePutResponse=true;const cmd=f.maintainCommand(x.registry);
 const result=await executeOperation(fake.client,cmd);assert(result.saved);assert(result.reconciledAfterLostResponse);assert.equal(fake.state.puts,1);
 const replay=await executeOperation(fake.client,cmd);assert(replay.idempotent);assert.equal(fake.state.puts,1);
});
const summary={observedAt:new Date().toISOString(),node:process.version,candidate:'e1c4d5d50b23cd8e9449632d3eb697f217dea305',
 tests:rows.length,passed:rows.filter(x=>x.status==='PASS').length,failed:rows.filter(x=>x.status==='FAIL').length,
 scope:'Additional independent offline matrix. FH-CORE-A-01 is separately reproduced and still blocks acceptance.',rows};
await fs.writeFile(new URL('./independent-matrix-results.json',import.meta.url),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
if(summary.failed)process.exitCode=1;
