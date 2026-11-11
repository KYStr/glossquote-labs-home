import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));
const inputs=[{name:'legacy',commit:'0a0f94718e2e3851ecf61008548e6ab4319e49eb',blob:'b07a9a780548674aa958703a83ec93190d82a76c'},
 {name:'candidate-parent',commit:'e1c4d5d50b23cd8e9449632d3eb697f217dea305',blob:'32d125ced6c7bbed506e9c38380ee2779ab627fe'}];
const results=[];await fs.mkdir(path.join(root,'registry-snapshots'),{recursive:true});
for(const input of inputs){
 const response=await fetch('https://raw.githubusercontent.com/KYStr/glossquote-labs-home/'+input.commit+'/coordination/work-registry.json',{signal:AbortSignal.timeout(30000)});
 assert(response.ok);const bytes=Buffer.from(await response.arrayBuffer());
 assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),input.blob);
 const filename=path.join(root,'registry-snapshots',input.name+'.json');await fs.writeFile(filename,bytes,{flag:'wx'});
 const result=spawnSync(process.execPath,['scripts/coordination.mjs','validate',filename],{cwd:path.join(root,'candidate'),windowsHide:true,encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024});
 assert.equal(result.status,0,result.stderr);const summary=JSON.parse(result.stdout);
 results.push({...input,bytes:bytes.length,exit:result.status,summary});
}
await fs.writeFile(path.join(root,'snapshot-validation.json'),JSON.stringify({observedAt:new Date().toISOString(),status:'PASS',node:process.version,results},null,2)+'\n');
console.log(JSON.stringify(results.map(x=>({name:x.name,exit:x.exit,revision:x.summary.revision,ready:x.summary.inventory.readyUnconsumedCount}))));
