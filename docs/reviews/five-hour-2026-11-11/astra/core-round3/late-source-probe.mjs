import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {applyOperation,validateRegistry,inventorySummary} from './candidate/scripts/coordination-core.mjs';
import {executeOperation} from './candidate/scripts/coordination.mjs';
import * as f from './independent-fixtures.mjs';
import {transport} from './fake-github.mjs';
let r=f.empty();
r=f.apply(r,f.author,'register-spec',{spec:{id:f.specId,title:'Synthetic age tool',document:f.oldDocument,source:f.baseline,acceptanceCriteria:f.documentCriteria}});
r=f.apply(r,f.ancestor,'register-task',{task:{id:'ancestor-repair',title:'Published source not yet submitted to registry',workType:'maintenance',source:f.oldDocument,brief:f.evidence,acceptanceCriteria:f.maintCriteria}});
r=f.startTask(r,f.ancestor,'ancestor-repair');
r=f.addAcceptedMaintenance(r,'latest-repair',f.repair,f.makeRef('2',f.documentPath),f.repairCandidate,82);
const target={specId:f.specId,expectedAuthorId:f.author.id,expectedDocument:f.oldDocument,expectedSource:f.baseline,expectedCriteriaHash:f.hash(f.documentCriteria),document:f.makeRef('4',f.documentPath),source:f.makeRef('4','README.md'),acceptanceCriteria:f.productCriteria,mappingRef:f.mappingRef,sourceMaintenanceTaskIds:['latest-repair']};
const mappingTask={id:'independent-mapping',title:'Synthetic mapping',workType:'maintenance',source:f.baseline,brief:f.evidence,acceptanceCriteria:f.documentCriteria,specRevisionTargets:[target]};
r=f.apply(r,f.mapper,'register-task',{task:mappingTask});r=f.startTask(r,f.mapper,mappingTask.id);r=f.submitTask(r,f.mapper,mappingTask.id,f.mappingCandidate,83);r=f.reviewTask(r,f.reviewer,mappingTask.id);r=applyOperation(r,f.maintainCommand(r)).registry;
r=applyOperation(r,f.readyCommand(r,f.ancestor)).registry;
assert.equal(r.specs[0].readiness.reviewerId,f.ancestor.id);
const priorReady=structuredClone(r.specs[0].readiness);
r=f.submitTask(r,f.ancestor,'ancestor-repair',f.ancestorCandidate,81);r=f.reviewTask(r,f.reviewer,'ancestor-repair');
validateRegistry(r);assert.equal(r.specs[0].status,'ready');assert(!r.specs[0].contributors.includes(f.ancestor.id));assert.deepEqual(r.specs[0].readiness,priorReady);
const stockAfterAncestorKnown=inventorySummary(r).readyUnconsumedCount;
// Satisfy the unchanged real threshold with 39 independent synthetic specifications.
for(let i=0;i<39;i++){
 const id='spec-independent-stock-'+i,document=f.makeRef('8','docs/specs/independent-stock-'+i+'/SPEC.md');
 r=f.apply(r,f.author,'register-spec',{spec:{id,title:'Independent stock '+i,document,source:f.baseline,acceptanceCriteria:f.productCriteria}});
 r=f.apply(r,f.reviewer,'mark-spec-ready',{specId:id,sections:f.sections,evidence:'Synthetic independent stock readiness.'});
}
assert.equal(inventorySummary(r).readyUnconsumedCount,40);
r=f.apply(r,f.primary,'register-task',{task:{id:'production-from-stale-readiness',title:'Synthetic production',workType:'production',specId:f.specId,source:r.specs[0].document,brief:f.evidence,acceptanceCriteria:f.productCriteria}});
const claim=f.command(r,f.primary,'claim',{taskId:'production-from-stale-readiness'});
const claimed=applyOperation(r,claim).registry;assert.equal(f.task(claimed,'production-from-stale-readiness').status,'claimed');
const fake=transport(r,[target],mappingTask);
const receipt=await executeOperation(fake.client,claim);assert.equal(receipt.saved,true);assert.equal(fake.state.puts,1);
const result={status:'POTENTIAL_BLOCKING_DEFECT_REPRODUCED',candidate:'110e809c15b10004c2aadca6a6649b9324be1419',scope:'All registry records constructed by legal pure-core operations; final claim also executed through actual adapter with isolated fake transport',ancestorInitiallyUnsubmitted:true,ancestorBecameAcceptedAfterReady:true,readyReviewerIsNowKnownAncestor:true,ancestorMissingFromSpecContributors:true,stockAfterAncestorKnown,thresholdSatisfiedWithIndependentFakeStock:40,productionClaimAllowed:true,syntheticAdapterPuts:fake.state.puts,readyPreserved:priorReady};
await fs.writeFile(new URL('./late-source-result.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
