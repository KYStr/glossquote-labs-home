import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {applyOperation,validateRegistry,inventorySummary} from './candidate/scripts/coordination-core.mjs';
import {executeOperation} from './candidate/scripts/coordination.mjs';
import * as f from './independent-fixtures.mjs';
import {transport} from './fake-github.mjs';
function stateBeforeLateSource({mappingReviewer=f.reviewer,readyReviewer=f.reviewer,cycle=false}){
 let r=f.empty();r=f.apply(r,f.author,'register-spec',{spec:{id:f.specId,title:'Synthetic age tool',document:f.oldDocument,source:f.baseline,acceptanceCriteria:f.documentCriteria}});
 r=f.apply(r,f.ancestor,'register-task',{task:{id:'ancestor-repair',title:'Late source',workType:'maintenance',source:cycle?f.makeRef('3',f.documentPath):f.oldDocument,brief:f.evidence,acceptanceCriteria:f.maintCriteria}});r=f.startTask(r,f.ancestor,'ancestor-repair');
 r=f.addAcceptedMaintenance(r,'latest-repair',f.repair,f.makeRef('2',f.documentPath),f.repairCandidate,82);
 const target={specId:f.specId,expectedAuthorId:f.author.id,expectedDocument:f.oldDocument,expectedSource:f.baseline,expectedCriteriaHash:f.hash(f.documentCriteria),document:f.makeRef('4',f.documentPath),source:f.makeRef('4','README.md'),acceptanceCriteria:f.productCriteria,mappingRef:f.mappingRef,sourceMaintenanceTaskIds:['latest-repair']};
 const mappingTask={id:'independent-mapping',title:'Synthetic mapping',workType:'maintenance',source:f.baseline,brief:f.evidence,acceptanceCriteria:f.documentCriteria,specRevisionTargets:[target]};
 r=f.apply(r,f.mapper,'register-task',{task:mappingTask});r=f.startTask(r,f.mapper,mappingTask.id);r=f.submitTask(r,f.mapper,mappingTask.id,f.mappingCandidate,83);r=f.reviewTask(r,mappingReviewer,mappingTask.id);r=applyOperation(r,f.maintainCommand(r)).registry;r=applyOperation(r,f.readyCommand(r,readyReviewer)).registry;
 return{registry:r,target,mappingTask};
}
function addStock(r){for(let i=0;i<39;i++){const id='spec-independent-stock-'+i;r=f.apply(r,f.author,'register-spec',{spec:{id,title:'Independent stock '+i,document:f.makeRef('8','docs/specs/independent-stock-'+i+'/SPEC.md'),source:f.baseline,acceptanceCriteria:f.productCriteria}});r=f.apply(r,f.reviewer,'mark-spec-ready',{specId:id,sections:f.sections,evidence:'Independent synthetic readiness'});}assert.equal(inventorySummary(r).readyUnconsumedCount,40);return r;}
const rows=[];let recoverable;
for(const mode of ['ready-reviewer-later-maker','mapping-reviewer-later-maker','source-pending-after-ready','source-cycle-after-ready']){
 const x=stateBeforeLateSource({mappingReviewer:mode==='mapping-reviewer-later-maker'?f.ancestor:f.reviewer,readyReviewer:mode==='ready-reviewer-later-maker'?f.ancestor:f.reviewer,cycle:mode==='source-cycle-after-ready'});
 let r=f.submitTask(x.registry,f.ancestor,'ancestor-repair',f.ancestorCandidate,81);if(mode!=='source-pending-after-ready')r=f.reviewTask(r,f.reviewer,'ancestor-repair');validateRegistry(r);
 assert.equal(inventorySummary(r).readyUnconsumedCount,1);if(mode==='mapping-reviewer-later-maker')recoverable=structuredClone(r);
 r=addStock(r);r=f.apply(r,f.primary,'register-task',{task:{id:'stale-production',title:'Synthetic production',workType:'production',specId:f.specId,source:r.specs[0].document,brief:f.evidence,acceptanceCriteria:f.productCriteria}});
 const fake=transport(r,[x.target],x.mappingTask),claim=f.command(r,f.primary,'claim',{taskId:'stale-production'});const receipt=await executeOperation(fake.client,claim);assert.equal(receipt.saved,true);assert.equal(fake.state.puts,1);
 rows.push({mode,status:'BLOCKING_DEFECT_REPRODUCED',invalidStockStillCounted:1,threshold:40,productionRegisterAllowed:true,productionClaimAllowed:true,syntheticPuts:1});
}
// Recovery is available with the existing mapping action while the specification remains unassigned.
let r=recoverable;const previousHistory=structuredClone(r.specs[0].maintenanceHistory),previousTasks=structuredClone(r.tasks),spec=r.specs[0];
const nextTarget={specId:spec.id,expectedAuthorId:spec.authorId,expectedDocument:spec.document,expectedSource:spec.source,expectedCriteriaHash:f.hash(spec.acceptanceCriteria),document:f.makeRef('6',f.documentPath),source:f.makeRef('6','README.md'),acceptanceCriteria:f.productCriteria,mappingRef:f.makeRef('6','docs/reviews/fresh/map.json'),sourceMaintenanceTaskIds:['latest-repair']};
const freshTask={id:'fresh-complete-mapping',title:'Fresh mapping with known source closure',workType:'maintenance',source:f.baseline,brief:f.evidence,acceptanceCriteria:f.documentCriteria,specRevisionTargets:[nextTarget]};
r=f.apply(r,f.mapper,'register-task',{task:freshTask});assert(f.task(r,freshTask.id).contributors.includes(f.ancestor.id));r=f.startTask(r,f.mapper,freshTask.id);r=f.submitTask(r,f.mapper,freshTask.id,f.makeRef('6','docs/reviews/fresh/HANDOFF.md'),88);r=f.reviewTask(r,f.reviewer,freshTask.id);
r=applyOperation(r,f.command(r,f.primary,'apply-spec-maintenance',{taskId:freshTask.id,specId:f.specId})).registry;assert.equal(r.specs[0].status,'draft');assert.equal(r.specs[0].readiness,null);assert.equal(r.specs[0].maintenanceHistory.length,2);assert.deepEqual(r.specs[0].maintenanceHistory[0],previousHistory[0]);
assert.deepEqual(r.tasks.filter(t=>t.id!==freshTask.id),previousTasks);
r=applyOperation(r,f.readyCommand(r,f.reviewer)).registry;validateRegistry(r);assert.equal(r.specs[0].status,'ready');
const recovery={status:'PASS',existingActionsOnly:true,newMappingRequiredForLateMappingReviewer:true,historyEntries:2,originalHistoryUnchanged:true,originalTasksUnchanged:true,readyResetThenIndependentlyReviewed:true,invalidateSpecActionRequired:false};
const result={candidate:'110e809c15b10004c2aadca6a6649b9324be1419',observedAt:new Date().toISOString(),scope:'Same A02 effective-readiness defect, four legal temporal orderings; all remote writes are isolated fake transports',rows,recovery};await fs.writeFile(new URL('./effective-readiness-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
