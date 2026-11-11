import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const run=spawnSync(process.execPath,['--test','test/coordination.test.mjs'],{cwd:path.join(root,'candidate'),windowsHide:true,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});
await fs.writeFile(path.join(root,'candidate-tests.stdout.txt'),run.stdout??'');await fs.writeFile(path.join(root,'candidate-tests.stderr.txt'),run.stderr??'');
const result={observedAt:new Date().toISOString(),candidate:'110e809c15b10004c2aadca6a6649b9324be1419',node:process.version,exit:run.status,tests:Number(run.stdout.match(/(?:#|ℹ) tests (\d+)/)?.[1]??0),passed:Number(run.stdout.match(/(?:#|ℹ) pass (\d+)/)?.[1]??0),failed:Number(run.stdout.match(/(?:#|ℹ) fail (\d+)/)?.[1]??0),scope:'Full 55-test coordination suite required for changed source resolver; injected fake transports only'};
await fs.writeFile(path.join(root,'candidate-tests.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(run.status!==0||result.passed!==55||result.failed!==0)process.exitCode=1;
