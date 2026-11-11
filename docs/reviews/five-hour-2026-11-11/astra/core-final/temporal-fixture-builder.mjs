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

export {stateBeforeLateSource,addStock};
