// Static C# compile/typecheck and syntax checks only. Never loads the produced DLL
// or starts idle-node/native calibration/browser. Reuses installed framework CSC.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const owner=path.dirname(fileURLToPath(import.meta.url));
const label=process.argv[2]||'static-1';if(!/^static-[1-9][0-9]?$/.test(label))throw new Error('Evidence label required');
try{await fs.access(path.join(owner,'FROZEN.json'));throw new Error('FROZEN: do not modify build evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.mkdir(path.join(owner,'bin'),{recursive:true});
const framework='C:/Windows/Microsoft.NET/Framework64/v4.0.30319',output=path.join(owner,'bin/IsolatedNodeCandidate.dll');
try{await fs.access(output);await fs.copyFile(output,path.join(owner,'bin/IsolatedNodeCandidate.before-'+label+'.dll'),fs.constants.COPYFILE_EXCL);}catch(e){if(e.code!=='ENOENT')throw e;}
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const args=['/nologo','/noconfig','/nostdlib+','/target:library','/platform:x64','/warn:4','/warnaserror+','/debug-',
 ...['mscorlib.dll','System.dll','System.Core.dll','System.Web.Extensions.dll'].map(n=>'/reference:'+path.join(framework,n)),
 '/out:'+output,path.join(owner,'NativeApi.cs'),path.join(owner,'NodeIsolationSession.cs')];
const r=spawnSync(path.join(framework,'csc.exe'),args,{cwd:owner,shell:false,windowsHide:true,encoding:'utf8',timeout:30000,maxBuffer:2097152});
await fs.writeFile(path.join(owner,label+'.txt'),(r.stdout||'')+(r.stderr||''),{flag:'wx'});
const result={taskId:'NEW22-11-ISOLATION',status:r.status===0?'PASS_STATIC_COMPILE_ONLY':'FAIL_STATIC_COMPILE',compiler:path.join(framework,'csc.exe'),args,exitCode:r.status,windowsHide:true,
 source:await Promise.all(['NativeApi.cs','NodeIsolationSession.cs','idle-node.mjs','Primary-Adapter.ps1'].map(async name=>{const b=await fs.readFile(path.join(owner,name));return{path:name,bytes:b.length,sha256:hash(b)}})),
 libraryLoaded:false,nativeInvoked:false,idleNodeStarted:false,browserStarted:false};
if(r.status===0){const b=await fs.readFile(output);result.library={path:'bin/IsolatedNodeCandidate.dll',bytes:b.length,sha256:hash(b),loaded:false};}
await fs.writeFile(path.join(owner,label+'.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));if(r.status!==0)process.exitCode=1;
