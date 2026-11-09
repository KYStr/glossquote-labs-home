import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readyTasks, summarize, safeFile, verifySourceFiles} from '../scripts/workspace.mjs';
import {applyOperation, SPEC_SECTIONS, REPOSITORY, BRANCH} from '../scripts/coordination-core.mjs';
function fixture(){
  const ref={repository:REPOSITORY,commit:'a'.repeat(40),path:'fixture.md'};
  const a={id:'local-codex:fixture-actual-author',executor:'local-codex'},b={id:'cloud-dot:fixture-actual-reviewer',executor:'cloud-dot'};
  let r={schemaVersion:1,contractVersion:'fixture',revision:0,repository:REPOSITORY,branch:BRANCH,baseline:{homepage:ref,inventoryComplete:false,reconciliation:{'local-codex':null,'cloud-dot':null}},actors:[],tasks:[],specs:[],events:[]};
  const apply=(actor,action,extra={})=>{r=applyOperation(r,{actor,action,...extra,expectedRevision:r.revision,operationId:'fixture-'+r.revision,observedAt:'2026-11-09T00:00:00.000Z'}).registry;};
  for(const actor of [a,b])apply(actor,'acknowledge',{contractVersion:'fixture',baselineCommit:ref.commit,evidence:'Fixture ACK'});
  for(const actor of [a,b])apply(actor,'reconcile',{inventoryComplete:true,taskIds:[],specIds:[],evidence:'Complete fixture',evidenceRef:ref});
  const criteria=[{id:'fixture-correctness',label:'Fixture exact results'}];
  for(let i=0;i<3;i++){
    apply(a,'register-spec',{spec:{id:'spec-'+i,title:'Fixture '+i,source:ref,document:{...ref,path:'s'+i+'.md'},acceptanceCriteria:criteria}});
    if(i!==2)apply(b,'mark-spec-ready',{specId:'spec-'+i,sections:Object.fromEntries(SPEC_SECTIONS.map(s=>[s,true])),evidence:'Non-author fixture review'});
    apply(a,'register-task',{task:{id:'task-'+i,title:'Fixture '+i,workType:'production',source:ref,brief:ref,specId:'spec-'+i,acceptanceCriteria:criteria,allowedExecutors:i===0?['local-codex','cloud-dot']:['local-codex']}});
  }
  return {get registry(){return r;},apply,a};
}
test('cloud inventory excludes local-only and incomplete specs without mutating ownership',()=>{
  const f=fixture(),before=JSON.stringify(f.registry);
  assert.deepEqual(readyTasks(f.registry,'cloud-dot').map(t=>t.id),['task-0']);
  assert.deepEqual(readyTasks(f.registry,'local-codex').map(t=>t.id),['task-0','task-1']);
  assert.equal(JSON.stringify(f.registry),before);
  assert.equal(summarize(f.registry).inventory.readyUnconsumedCount,2);
  assert.throws(()=>readyTasks(f.registry,'anywhere'));
});
test('claimed/consumed stock and unknown reconciliation never appear as claimable',()=>{
  const f=fixture();f.apply(f.a,'claim',{taskId:'task-0'});
  assert.deepEqual(readyTasks(f.registry,'cloud-dot'),[]);
  const unknown=structuredClone(f.registry);unknown.baseline.inventoryComplete=false;unknown.baseline.reconciliation['cloud-dot']=null;
  assert.deepEqual(readyTasks(unknown,'local-codex'),[]);
  assert.equal(summarize(unknown).inventory.readyUnconsumedCount,null);
});
test('source verification detects tampering, missing files, repeated entries and traversal',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'glossquote-source-fixture-'));
  try{
    fs.mkdirSync(path.join(root,'sources','legacy','fixture'),{recursive:true});
    const file='sources/legacy/fixture/input.txt',data=Buffer.from('synthetic fixture\n');fs.writeFileSync(path.join(root,file),data);
    const row={path:file,bytes:data.length,gitBlob:createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex'),sha256:createHash('sha256').update(data).digest('hex')};
    assert.equal(verifySourceFiles(root,[row]).files,1);
    for(const unsafe of ['../outside','/absolute','sources/../../outside','C:/outside','sources\\file'])assert.throws(()=>safeFile(root,unsafe));
    assert.throws(()=>verifySourceFiles(root,[row,row]));
    assert.throws(()=>verifySourceFiles(root,[{...row,path:'sources/missing'}]));
    fs.writeFileSync(path.join(root,file),'changed');assert.throws(()=>verifySourceFiles(root,[row]),/Source mismatch/);
  }finally{
    const parent=path.resolve(os.tmpdir());
    assert.equal(path.dirname(path.resolve(root)),parent);
    assert.match(path.basename(root),/^glossquote-source-fixture-[A-Za-z0-9]+$/);
    fs.rmSync(root,{recursive:true});
  }
});
