import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const result=spawnSync(process.execPath,['--test','test/coordination.test.mjs'],{cwd:path.join(root,'candidate'),windowsHide:true,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});
await fs.writeFile(path.join(root,'candidate-tests.stdout.txt'),result.stdout??'');
await fs.writeFile(path.join(root,'candidate-tests.stderr.txt'),result.stderr??'');
const receipt={observedAt:new Date().toISOString(),node:process.version,command:'node --test test/coordination.test.mjs',candidate:'e1c4d5d50b23cd8e9449632d3eb697f217dea305',exit:result.status,signal:result.signal,
 testCount:Number(result.stdout.match(/(?:#|ℹ) tests (\d+)/)?.[1]??0),passCount:Number(result.stdout.match(/(?:#|ℹ) pass (\d+)/)?.[1]??0),failCount:Number(result.stdout.match(/(?:#|ℹ) fail (\d+)/)?.[1]??0),
 scope:'Full candidate offline suite; every network client uses injected fake transport; CLI token branch is not executed'};
await fs.writeFile(path.join(root,'candidate-tests.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
if(result.status!==0||receipt.testCount!==49||receipt.passCount!==49||receipt.failCount!==0)process.exitCode=1;
