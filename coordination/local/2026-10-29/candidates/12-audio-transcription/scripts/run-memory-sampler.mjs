import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './verify-assets.mjs';
import { measurementContext } from './measurement-context.mjs';

const { evidence, taskId, label, lockPath, positional } = await measurementContext();
const [action, browser, ...ids] = positional;
if (!['start', 'stop'].includes(action) || !['chrome', 'edge'].includes(browser) || (action === 'start' ? ids.length < 1 || ids.length > 4 || ids.some(id => !/^[1-9]\d{0,8}$/u.test(id)) : ids.length !== 0)) throw new Error('MEMORY_ARGUMENT_INVALID');
const output = path.join(evidence, `${browser}${label ? '-' + label : ''}-process-memory.jsonl`);
if (action === 'stop') { await writeFile(output + '.stop', 'task-owned sampler stop\n', { flag: 'wx' }); }
else {
  const receipt = JSON.parse(await readFile(path.join(evidence, 'measurement-lock-acquisition.json'), 'utf8'));
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  if (!receipt.owner || lock.owner !== receipt.owner || lock.taskId !== taskId || receipt.taskId !== taskId || lock.startTime !== receipt.startTime || lock.toolId !== '12-audio-transcription') throw new Error('MEASUREMENT_LOCK_NOT_OWNED');
  const source = await readFile(path.join(root, 'scripts/sample-process-memory.ps1'), 'utf8');
  const child = spawn('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', source], {
    cwd: root, shell: false, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    env: { SystemRoot: 'C:\\Windows', windir: 'C:\\Windows', Path: 'C:\\Windows\\System32;C:\\Windows', TEMP: evidence, TMP: evidence, GQ_MEMORY_TARGETS: ids.join(','), GQ_MEMORY_BROWSER: browser === 'edge' ? 'msedge' : 'chrome', GQ_MEMORY_OUTPUT: output, GQ_MEMORY_EVIDENCE: evidence },
  });
  console.log(`MEMORY SAMPLER ${browser}: child PID ${child.pid}, targets ${ids.join(',')}, output ${output}`);
  child.stdout.pipe(process.stdout); child.stderr.pipe(process.stderr);
  child.on('exit', (code, signal) => { process.exitCode = code ?? 1; console.log(JSON.stringify({ code, signal })); });
}
