// Source-contract regression only. No assembly load, native call or fault injection.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const owner=path.dirname(fileURLToPath(import.meta.url));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=['NodeIsolationSession.cs','Primary-Adapter.ps1','history/NodeIsolationSession.static-3.cs.txt'];
const inputs=await Promise.all(files.map(async name=>{const b=await fs.readFile(path.join(owner,name));return {name,b,text:b.toString('utf8')};}));
const [current,adapter,prior]=inputs;
function expression(source){
 const match=source.match(/public bool HasOutstandingNativeLeases\s*\{\s*get\s*\{\s*return\s+([^;]+);\s*\}\s*\}/);
 assert.ok(match,'Lifecycle guard must have one inspectable boolean return');
 return match[1].replace(/Valid\((original\.(?:thread|process)|jobA|jobB)\)/g,(_,key)=>key.replace('.','_'));
}
// A closed boolean grammar evaluates the actual C# property, not a copied guard.
function evaluate(source,state){
 const text=expression(source);const tokens=text.match(/releaseFailed|releaseReceiptsWritten|released|original_thread|original_process|jobA|jobB|\|\||&&|!|\(|\)/g)||[];
 assert.equal(tokens.join(''),text.replace(/\s/g,''),'Unexpected lifecycle expression syntax');let at=0;
 const unary=()=>{const t=tokens[at++];if(t==='!')return !unary();if(t==='('){const v=or();assert.equal(tokens[at++],')');return v;}assert.ok(Object.hasOwn(state,t),'Unknown guard field');return state[t];};
 const and=()=>{let v=unary();while(tokens[at]==='&&'){at++;const r=unary();v=v&&r;}return v;};
 const or=()=>{let v=and();while(tokens[at]==='||'){at++;const r=and();v=v||r;}return v;};
 const result=or();assert.equal(at,tokens.length);return result;
}
const keys=['releaseFailed','released','releaseReceiptsWritten','original_thread','original_process','jobA','jobB'];
let blocked=0,safe=0;const historicalFailures=[];
for(let bits=0;bits<128;bits++){
 const state=Object.fromEntries(keys.map((k,i)=>[k,Boolean(bits&(1<<i))]));
 // Safe exit requires successful completed release/evidence and zero owned HANDLEs.
 const expectedSafe=state.released&&state.releaseReceiptsWritten&&!state.releaseFailed&&![state.original_thread,state.original_process,state.jobA,state.jobB].some(Boolean);
 assert.equal(evaluate(current.text,state),!expectedSafe,JSON.stringify(state));
 if(expectedSafe)safe++;else blocked++;
 if(evaluate(prior.text,state)!==!expectedSafe)historicalFailures.push(state);
}
const threadOnly={releaseFailed:false,released:false,releaseReceiptsWritten:false,original_thread:true,original_process:false,jobA:false,jobB:false};
assert.equal(evaluate(prior.text,threadOnly),false,'Reproduce the reviewed thread-only regression');
assert.equal(evaluate(current.text,threadOnly),true);
assert.ok(historicalFailures.length>0,'Regression must reject the previous source');
assert.match(current.text,/if\(releaseFailed\)throw new Stop\("RELEASE_PREVIOUSLY_FAILED_NO_RETRY"/);
assert.match(current.text,/CloseOwned\(ref original\.thread\)/);
assert.match(current.text,/if\(!released\)\{releaseFailed=true;throw new Stop\("OWNED_HANDLE_RELEASE_FAILED_NO_BLIND_RETRY"/);
assert.match(current.text,/if\(ok\)handle=IntPtr\.Zero;return ok;/);
assert.match(current.text,/if\(!releaseReceiptsWritten\)throw new Stop\("RELEASED_BUT_EXIT_RECEIPT_MISSING"/);
assert.match(adapter.text,/if \(\$released\) \{ \$script:New22OutstandingLeases\.Remove\(\$Session\.OutputDirectory\) \}/);
assert.match(adapter.text,/function Assert-New22NoOutstandingLeases[\s\S]*?if \(\$script:New22OutstandingLeases\.Count -ne 0\) \{ throw/);
const result={taskId:'NEW22-11-ISOLATION',status:'PASS_STATIC_SOURCE_CONTRACT_ONLY',command:'node lifecycle-static-regression.mjs',exitCode:0,truthTableCases:128,blockedStates:blocked,safeStates:safe,priorSourceRegressionReproduced:true,priorSourceMismatches:historicalFailures.length,threadOnlyRegressionReproduced:true,guardExpression:expression(current.text),inputs:inputs.map(({name,b})=>({path:name,bytes:b.length,sha256:hash(b)})),libraryLoaded:false,nativeInvoked:false,actualCloseHandleFailureInjected:false};
await fs.writeFile(path.join(owner,'lifecycle-static-regression.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
