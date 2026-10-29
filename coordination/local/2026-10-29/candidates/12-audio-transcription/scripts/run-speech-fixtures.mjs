import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root } from './verify-assets.mjs';
import { readFixturePcm, writeFixtureWav } from '../test/fixtures/wav-builder.mjs';

const quality = process.argv.slice(2).length === 1 && process.argv[2] === '--suite=quality';
if (process.argv.length > 2 && !quality) throw new Error('FIXTURE_SUITE_INVALID');
const evidence = path.resolve(root, '../../.runs/audio-transcription/20261011-resume-t02');
await mkdir(evidence, { recursive: true });

// Reviewed, repository-owned fixed source; no file execution-policy or system setting changes.
const source = await readFile(path.join(root, 'scripts', 'make-speech-fixtures.ps1'), 'utf8');
const child = spawnSync('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', source], {
  cwd: root, shell: false, encoding: 'utf8', timeout: 60_000,
  env: { SystemRoot: 'C:\\Windows', windir: 'C:\\Windows', Path: 'C:\\Windows\\System32;C:\\Windows', TEMP: evidence, TMP: evidence, ...(quality ? { GQ_SPEECH_SUITE: 'quality' } : {}) },
});
if (child.status !== 0) {
  const failurePath = path.join(evidence, `speech-fixtures-failure-${new Date().toISOString().replaceAll(/[:.]/gu, '-')}.json`);
  await writeFile(failurePath, JSON.stringify({ status: child.status, errorCode: child.error?.code, stderr: child.stderr }, null, 2) + '\n', { flag: 'wx' });
  console.error(`OFFLINE_SPEECH_FIXTURES_NOT_RUN: ${failurePath}`);
  process.exitCode = 1;
}
else {
  const cases = JSON.parse(child.stdout);
  if (!Array.isArray(cases) || cases.length !== (quality ? 10 : 2)) throw new Error('FIXTURE_GENERATION_INVALID');
  const destination = path.join(root, 'test', 'fixtures', 'generated', ...(quality ? ['t02-v1'] : []));
  const raw = new Map();
  for (const item of cases) {
    let bytes = await readFile(path.join(destination, ...(quality ? ['raw'] : []), item.id + '.wav'));
    const pcm = readFixturePcm(bytes);
    item.rawDurationSeconds = pcm.length / 16_000;
    item.rawSha256 = createHash('sha256').update(bytes).digest('hex');
    raw.set(item.id, pcm);
    if (quality) {
      if (pcm.length > 160_000) throw new Error('FIXTURE_SHORT_EXCEEDS_TEN_SECONDS');
      const padded = new Int16Array(Math.max(80_000, pcm.length));
      padded.set(pcm); // Trailing silence only; never truncate or alter speech.
      bytes = writeFixtureWav(padded);
      await writeFile(path.join(destination, item.id + '.wav'), bytes, { flag: 'wx' });
    }
    item.path = `/fixtures/generated/${quality ? 't02-v1/' : ''}${item.id}.wav`;
    item.bytes = bytes.length;
    item.sha256 = createHash('sha256').update(bytes).digest('hex');
    item.durationSeconds = (bytes.length - 44) / 32_000;
  }
  if (quality) {
    for (const [prefix, language] of [['zh', 'chinese'], ['en', 'english']]) {
      const selected = cases.filter(item => item.language === language);
      const pcm = new Int16Array(480_000);
      let offset = 0;
      for (const item of selected) {
        const speech = raw.get(item.id);
        if (offset + speech.length > pcm.length) throw new Error('FIXTURE_COMPOSITE_EXCEEDS_THIRTY_SECONDS');
        pcm.set(speech, offset); offset += speech.length + 8_000;
      }
      const bytes = writeFixtureWav(pcm);
      const id = prefix + '-30';
      await writeFile(path.join(destination, id + '.wav'), bytes, { flag: 'wx' });
      cases.push({ id, language, reference: selected.map(item => item.reference).join(' '), sourceIds: selected.map(item => item.id), gapSeconds: 0.5, durationSeconds: 30, path: `/fixtures/generated/t02-v1/${id}.wav`, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
    const bytes = writeFixtureWav(new Int16Array(480_000));
    await writeFile(path.join(destination, 'silence-30.wav'), bytes, { flag: 'wx' });
    cases.push({ id: 'silence-30', language: 'english', reference: '', durationSeconds: 30, path: '/fixtures/generated/t02-v1/silence-30.wav', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const record = { mode: quality ? 't02-quality-v1' : 'minimum-compatibility-only', syntheticOnly: true, generator: 'Windows offline System.Speech; no voice installation', padding: 'Trailing zeros to minimum five seconds; composite joins all five raw phrases with 0.5s gaps then pads to exactly 30s; no speech trimming', cases };
  await writeFile(path.join(destination, quality ? 'quality-speech.json' : 'minimum-speech.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  console.log(`FIXTURES PASS: ${cases.length} offline synthetic cases (${record.mode})`);
}
