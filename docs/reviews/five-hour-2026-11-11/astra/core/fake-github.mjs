// Offline reviewer-owned GitHub transport. No real fetch, authentication or remote write.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {GitHubClient} from './candidate/scripts/coordination.mjs';
import {BRANCH} from './candidate/scripts/coordination-core.mjs';
import {repo,baseline,evidence,oldDocument,ancestorCandidate,repairCandidate,mappingCandidate,mappingRef,makeRef,documentPath} from './independent-fixtures.mjs';
export const key=ref=>ref.repository+'/'+ref.commit+'/'+ref.path;
export function payload(data){const bytes=Buffer.isBuffer(data)?data:Buffer.from(data);return{type:'file',sha:createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),size:bytes.length,encoding:'base64',content:bytes.toString('base64')};}
export function transport(registry,targets,mappingTask){
 const files=new Map();
 const put=(ref,data)=>files.set(key(ref),payload(data));
 const add=ref=>{if(ref)put(ref,'Synthetic fixed file: '+ref.path+'\n');};
 add(baseline);add(evidence);add(mappingCandidate);add(mappingTask.source);add(mappingTask.brief);
 for(const s of registry.specs){add(s.document);add(s.source);}
 for(const t of registry.tasks){for(const ref of [t.source,t.brief,t.submission?.candidate,t.submission?.evidenceRef,t.acceptance?.evidenceRef])add(ref);}
 const oldBytes='Original synthetic specification\n';
 const ancestorBytes='Original specification corrected by ancestor A\n';
 const newBytes=ancestorBytes+'Further correction by B\n';
 put(oldDocument,oldBytes);put(makeRef('2',documentPath),ancestorBytes);put(makeRef('3',documentPath),newBytes);
 const sourceBytes='Synthetic fixed file: README.md\n';put(baseline,sourceBytes);
 const descriptor=(ref,b)=>({repository:ref.repository,path:ref.path,bytes:Buffer.byteLength(b),sha256:createHash('sha256').update(b).digest('hex')});
 const mapping={targets:targets.map(target=>{
  put(target.document,newBytes);put(target.source,sourceBytes);
  const {mappingRef,document,source,...rest}=target;
  return{...rest,document:descriptor(document,newBytes),source:descriptor(source,sourceBytes)};
 })};
 put(mappingRef,JSON.stringify(mapping));
 const state={registry:structuredClone(registry),puts:0,calls:[],head:mappingCandidate.commit,open:true,losePutResponse:false,conflict:false};
 const client=new GitHubClient('synthetic-fixture-not-a-credential',{fetchFn:async(raw,init)=>{
  const url=new URL(raw);assert.equal(url.origin,'https://api.github.com');assert.equal(init.redirect,'error');
  state.calls.push({path:url.pathname,ref:url.searchParams.get('ref'),method:init.method});
  const registryPath='/repos/'+repo+'/contents/coordination/work-registry.json';
  let response;
  if(url.pathname===registryPath){
   if(init.method==='PUT'){
    state.puts++;const request=JSON.parse(init.body);
    if(state.conflict)return{ok:false,status:409};
    assert.equal(request.branch,BRANCH);assert.equal(request.sha,payload(JSON.stringify(state.registry,null,2)+'\n').sha);
    state.registry=JSON.parse(Buffer.from(request.content,'base64').toString('utf8'));
    if(state.losePutResponse)throw Error('Synthetic lost PUT response');
    response={};
   }else{assert.equal(url.searchParams.get('ref'),BRANCH);response=payload(JSON.stringify(state.registry,null,2)+'\n');}
  }else if(url.pathname==='/repos/'+repo+'/pulls/83')response={head:{sha:state.head,repo:{full_name:repo}},state:state.open?'open':'closed'};
  else{
   const match=/^\/repos\/([^/]+\/[^/]+)\/contents\/(.+)$/.exec(url.pathname);
   if(match)response=files.get(key({repository:match[1],commit:url.searchParams.get('ref'),path:decodeURIComponent(match[2])}));
  }
  return response===undefined?{ok:false,status:404}:{ok:true,text:async()=>JSON.stringify(response)};
 }});
 return{client,state,files,put,mapping};
}
