import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const framework = 'C:/Windows/Microsoft.NET/Framework64/v4.0.30319';
const compiler = path.join(framework, 'csc.exe');
const source = path.join(root, 'NativeContinuationCollector.cs');
const label = process.argv[2] || 'compile-1';
if (!/^compile-[1-9][0-9]?$/.test(label)) throw new Error('Fixed evidence label required');
const output = path.join(root, 'build', `NativeContinuationCollector.${label}.dll`);
await fs.mkdir(path.dirname(output), { recursive: true });
const args = ['/nologo', '/noconfig', '/nostdlib+', '/target:library', '/platform:x64', '/optimize+', '/warn:4', '/warnaserror+', '/debug-',
  ...['mscorlib.dll', 'System.dll', 'System.Core.dll', 'System.Web.Extensions.dll'].map((n) => '/reference:' + path.join(framework, n)),
  '/out:' + output, source];
const child = spawnSync(compiler, args, { cwd: root, shell: false, windowsHide: true, timeout: 30000, encoding: 'utf8', maxBuffer: 1048576 });
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
await fs.writeFile(path.join(root, label + '.txt'), (child.stdout || '') + (child.stderr || ''), { flag: 'wx' });
const result = { taskId: 'MU20-11-M1', status: child.status === 0 ? 'PASS_COMPILE_ONLY_NOT_EXECUTED' : 'FAIL_COMPILE', compiler, args,
  windowsHide: true, exitCode: child.status, signal: child.signal, errorCode: child.error?.code || null,
  source: { path: 'NativeContinuationCollector.cs', sha256: hash(await fs.readFile(source)) }, nativeCodeExecuted: false, libraryLoaded: false };
if (child.status === 0) { const bytes = await fs.readFile(output); result.assembly = { path: 'build/' + path.basename(output), bytes: bytes.length, sha256: hash(bytes), executed: false, loaded: false }; }
await fs.writeFile(path.join(root, label + '.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result));
if (child.status !== 0) process.exitCode = 1;
