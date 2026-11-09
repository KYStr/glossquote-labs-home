import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from '../scripts/verify-assets.mjs';
import { measurementContext } from '../scripts/measurement-context.mjs';
test('measurement evidence is an existing directory inside its own family, including junction resolution', async t => {
  const tempRoot = path.join(root, 'test/.tmp'); await mkdir(tempRoot, { recursive: true });
  const fixture = await mkdtemp(path.join(tempRoot, 'memory-context-'));
  const projectRoot = path.join(fixture, 'family/tool-projects/audio');
  const evidence = path.join(fixture, 'family/.runs/audio-transcription/new');
  const outside = path.join(fixture, 'outside');
  await mkdir(projectRoot, { recursive: true }); await mkdir(evidence, { recursive: true }); await mkdir(outside);
  t.after(async () => {
    const resolved = await realpath(fixture), allowed = await realpath(tempRoot), relative = path.relative(allowed, resolved);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative)); await rm(resolved, { recursive: true, force: true });
  });
  const options = ['start', 'chrome', '42', '--task=T02-MEMORY-ROOTCAUSE', '--evidence=' + evidence];
  const result = await measurementContext(options, { projectRoot });
  assert.deepEqual(result.positional, ['start', 'chrome', '42']); assert.equal(result.evidence, await realpath(evidence));
  for (const invalid of [['--unknown=x'], ['--label=../escape'], ['--task=bad task'], ['--task=T02', '--task=T03'], ['--evidence=' + outside]]) await assert.rejects(measurementContext(invalid, { projectRoot }));
  const file = path.join(evidence, 'not-a-directory'); await writeFile(file, 'fake');
  await assert.rejects(measurementContext(['--evidence=' + file], { projectRoot }), /EVIDENCE_INVALID/u);
  const junction = path.join(evidence, 'junction'); await symlink(outside, junction, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(measurementContext(['--evidence=' + junction], { projectRoot }), /EVIDENCE_INVALID/u);
});
