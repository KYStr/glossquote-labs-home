import path from 'node:path';
import { realpath, stat } from 'node:fs/promises';
import { root } from './verify-assets.mjs';

export async function measurementContext(args = process.argv.slice(2), { projectRoot = root } = {}) {
  const options = new Map(), positional = [];
  for (const value of args) {
    if (!value.startsWith('--')) { positional.push(value); continue; }
    const match = /^--(evidence|task|label)=([^\r\n]+)$/u.exec(value);
    if (!match || options.has(match[1])) throw new Error('MEASUREMENT_ARGUMENT_INVALID');
    options.set(match[1], match[2]);
  }
  const taskId = options.get('task') ?? 'RESUME-12-T02-20261011';
  if (!/^[A-Z0-9][A-Z0-9_-]{0,79}$/u.test(taskId)) throw new Error('MEASUREMENT_TASK_INVALID');
  const label = options.get('label');
  if (label !== undefined && !/^[a-z][a-z0-9-]{0,63}$/u.test(label)) throw new Error('MEASUREMENT_LABEL_INVALID');
  const family = await realpath(path.resolve(projectRoot, '../..'));
  const allowed = await realpath(path.join(family, '.runs/audio-transcription'));
  const allowedRelative = path.relative(family, allowed);
  if (allowedRelative.startsWith('..') || path.isAbsolute(allowedRelative)) throw new Error('MEASUREMENT_EVIDENCE_INVALID');
  const evidence = await realpath(options.get('evidence') ?? path.join(allowed, '20261011-resume-t02'));
  const relative = path.relative(allowed, evidence);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !(await stat(evidence)).isDirectory()) throw new Error('MEASUREMENT_EVIDENCE_INVALID');
  return { taskId, evidence, label, positional, lockPath: path.join(family, '.runs/media-spike-measurement.lock') };
}
