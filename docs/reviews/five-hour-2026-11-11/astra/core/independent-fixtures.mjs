// Reviewer-authored synthetic coordination records. No network or real registry mutation.
import {createHash} from 'node:crypto';
import {applyOperation,REPOSITORY,BRANCH} from './candidate/scripts/coordination-core.mjs';
export const repo=REPOSITORY;
export const primary={id:'local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf',executor:'local-codex'};
export const author={id:'cloud-dot:astra-fixture-author',executor:'cloud-dot'};
export const original={id:'cloud-dot:astra-fixture-original-maker',executor:'cloud-dot'};
export const ancestor={id:'local-codex:astra-fixture-ancestor-maker',executor:'local-codex'};
export const repair={id:'local-codex:astra-fixture-repair-maker',executor:'local-codex'};
export const mapper={id:'local-codex:astra-fixture-mapping-maker',executor:'local-codex'};
export const reviewer={id:'local-codex:astra-fixture-independent-reviewer',executor:'local-codex'};
export const sectionNames=['goal','scope','userFlow','inputsOutputs','implementation','acceptance','tests','handoff'];
export const sections=Object.fromEntries(sectionNames.map(x=>[x,true]));
export const documentCriteria=sectionNames.map(id=>({id,label:'Review all declared targets: '+id}));
export const productNames=['functionality','boundaries','privacy','security','usability','accessibility','localization-seo','toolchain-provenance','compatibility'];
export const productCriteria=productNames.map(id=>({id,label:'Fixed synthetic product requirement: '+id}));
export const maintCriteria=[{id:'spec-corrections',label:'Correct specified document issue'},{id:'exact-fixtures',label:'Check exact new cases'},{id:'provenance-and-scope',label:'Check fixed provenance and bounded changes'}];
export const specId='spec-age-calculator-20261109';
export const documentPath='docs/specs/age-calculator/SPEC.md';
export const makeRef=(digit,path)=>({repository:repo,commit:digit.repeat(40),path});
export const baseline=makeRef('0','README.md');
export const evidence=makeRef('9','docs/reviews/synthetic-evidence.md');
export const oldDocument=makeRef('1',documentPath);
export const ancestorCandidate=makeRef('2','docs/reviews/ancestor/HANDOFF.md');
export const repairCandidate=makeRef('3','docs/reviews/repair/HANDOFF.md');
export const mappingCandidate=makeRef('4','docs/reviews/mapping/HANDOFF.md');
export const mappingRef=makeRef('4','docs/reviews/mapping/map.json');
export const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
export const hash=x=>createHash('sha256').update(canonical(x)).digest('hex');
let serial=0;
export function command(registry,actor,action,fields={}){return{action,actor,operationId:'astra-independent-operation-'+(++serial),expectedRevision:registry.revision,observedAt:'2026-11-11T03:00:00.000Z',...fields};}
export function apply(registry,actor,action,fields={}){return applyOperation(registry,command(registry,actor,action,fields)).registry;}
export const task=(r,id)=>r.tasks.find(t=>t.id===id);
export function acknowledge(registry,actor){return apply(registry,actor,'acknowledge',{contractVersion:registry.contractVersion,baselineCommit:baseline.commit,evidence:'Synthetic offline acknowledgement; not a real actor claim.'});}
export function empty(){
 let r={schemaVersion:1,contractVersion:'2026-10-29.1',revision:0,repository:repo,branch:BRANCH,baseline:{homepage:baseline,inventoryComplete:false,reconciliation:{'local-codex':null,'cloud-dot':null}},actors:[],specs:[],tasks:[],events:[]};
 for(const a of [primary,author,original,ancestor,repair,mapper,reviewer])r=acknowledge(r,a);
 for(const a of [author,primary])r=apply(r,a,'reconcile',{inventoryComplete:true,taskIds:[],specIds:[],evidence:'Synthetic empty inventory.',evidenceRef:evidence});
 return r;
}
export function startTask(r,actor,id){r=apply(r,actor,'claim',{taskId:id});return apply(r,actor,'start',{taskId:id,claimId:task(r,id).owner.claimId,evidence:'Synthetic work started.'});}
export function submitTask(r,actor,id,candidate,number){return apply(r,actor,'submit',{taskId:id,claimId:task(r,id).owner.claimId,candidate,pullRequest:'https://github.com/'+repo+'/pull/'+number,evidence:'Synthetic candidate publication.',evidenceRef:evidence});}
export function reviewCommand(r,actor,id){return command(r,actor,'review',{taskId:id,candidate:task(r,id).submission.candidate,verdict:'accepted',rubricComplete:true,requiredChecksComplete:true,aspects:task(r,id).acceptanceCriteria.map(c=>({id:c.id,score:95,evidence:'Synthetic literal evidence for '+c.id})),evidence:'Synthetic independent assessment.',evidenceRef:evidence});}
export function reviewTask(r,actor,id){return applyOperation(r,reviewCommand(r,actor,id)).registry;}
export function addAcceptedMaintenance(r,id,actor,source,candidate,number){
 r=apply(r,actor,'register-task',{task:{id,title:id,workType:'maintenance',source,brief:makeRef('9','docs/reviews/'+id+'/TASK.md'),acceptanceCriteria:maintCriteria}});
 r=startTask(r,actor,id);r=submitTask(r,actor,id,candidate,number);return reviewTask(r,reviewer,id);
}
export function inputs({includeAncestor=false}={}){
 let r=empty();r=apply(r,author,'register-spec',{spec:{id:specId,title:'Synthetic age tool',document:oldDocument,source:baseline,acceptanceCriteria:documentCriteria}});
 r=apply(r,author,'register-task',{task:{id:'original-spec-task',title:'Original authoring',workType:'spec',source:baseline,brief:makeRef('1','docs/specs/age-calculator/BRIEF.md'),acceptanceCriteria:documentCriteria}});
 r=apply(r,original,'claim',{taskId:'original-spec-task'});
 r=addAcceptedMaintenance(r,'ancestor-repair',ancestor,oldDocument,ancestorCandidate,81);
 r=addAcceptedMaintenance(r,'latest-repair',repair,makeRef('2',documentPath),repairCandidate,82);
 const target={specId,expectedAuthorId:author.id,expectedDocument:oldDocument,expectedSource:baseline,expectedCriteriaHash:hash(documentCriteria),
  document:makeRef('4',documentPath),source:makeRef('4','README.md'),acceptanceCriteria:productCriteria,mappingRef,
  sourceMaintenanceTaskIds:includeAncestor?['ancestor-repair','latest-repair']:['latest-repair']};
 const mappingTask={id:'independent-mapping',title:'Synthetic eight-section mapping',workType:'maintenance',source:baseline,brief:makeRef('9','docs/reviews/mapping/TASK.md'),acceptanceCriteria:documentCriteria,specRevisionTargets:[target]};
 return {registry:r,target,mappingTask};
}
export function reviewingMapping(options={}){
 const f=inputs(options);let r=apply(f.registry,mapper,'register-task',{task:f.mappingTask});r=startTask(r,mapper,f.mappingTask.id);r=submitTask(r,mapper,f.mappingTask.id,mappingCandidate,83);return{...f,registry:r};
}
export function maintainCommand(r){return command(r,primary,'apply-spec-maintenance',{taskId:'independent-mapping',specId});}
export function readyCommand(r,actor=reviewer){return command(r,actor,'mark-spec-ready',{specId,document:r.specs[0].document,sections,evidence:'Synthetic eight-section readiness.',evidenceRef:evidence});}
