import { readFile, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { measurementContext } from './measurement-context.mjs';

const { lockPath, evidence, taskId, positional } = await measurementContext();
const receiptPath = path.join(evidence, 'measurement-lock-acquisition.json');
const [action] = positional;
if (positional.length !== 1 || !['acquire', 'release', 'status'].includes(action)) throw new Error('LOCK_ACTION_INVALID');
if (action === 'acquire') {
  const receipt = { toolId: '12-audio-transcription', taskId, owner: 'original-audio-chat/' + randomUUID(), startTime: new Date().toISOString() };
  try {
    await writeFile(lockPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    await writeFile(receiptPath, JSON.stringify({ ...receipt, lockPath }, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ status: 'ACQUIRED', ...receipt }));
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log(JSON.stringify({ status: 'OCCUPIED', holder: JSON.parse(await readFile(lockPath, 'utf8')) }));
    process.exitCode = 2;
  }
} else if (action === 'release') {
  const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
  const current = JSON.parse(await readFile(lockPath, 'utf8'));
  if (receipt.taskId !== taskId || current.owner !== receipt.owner || current.taskId !== receipt.taskId || current.startTime !== receipt.startTime || current.toolId !== receipt.toolId) throw new Error('LOCK_NOT_OWNED');
  await unlink(lockPath);
  await writeFile(path.join(path.dirname(receiptPath), 'measurement-lock-release.json'), JSON.stringify({ status: 'RELEASED', owner: receipt.owner, releasedAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx' });
  console.log('LOCK RELEASED (own receipt matched)');
} else {
  try { console.log(JSON.stringify({ status: 'OCCUPIED', holder: JSON.parse(await readFile(lockPath, 'utf8')) })); }
  catch (error) { if (error.code !== 'ENOENT') throw error; console.log('LOCK FREE'); }
}
