import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PROJECT_ROOT } from './files.mjs';
import { validateAgenda } from '../public/js/core/validate.mjs';
import { analyseAgenda } from '../public/js/core/analyse.mjs';
import { serializeAgendaReport } from '../public/js/core/output.mjs';

const raw = {
  rooms: ['R1', 'R2'], speakers: ['S', 'T'], transitionMinutes: 10,
  sessions: [
    { id: 'A', title: 'Synthetic opening／合成開場', roomIndex: 0, speakerIndexes: [0], start: '09:00', end: '10:00' },
    { id: 'B', title: 'Synthetic parallel／合成平行場', roomIndex: 0, speakerIndexes: [1], start: '09:30', end: '09:45' },
    { id: 'C', title: 'Synthetic next room／合成換房場', roomIndex: 1, speakerIndexes: [0], start: '10:00', end: '11:00' }
  ]
};
const expected = {
  schema: 'gq.agenda-check', version: 1, settings: { transitionMinutes: 10 },
  coverage: { checkedPairs: 3, roomUnassignedSessionIds: [], speakerUnassignedSessionIds: [] },
  sessions: [
    { id: 'A', title: 'Synthetic opening／合成開場', room: 'R1', speakers: ['S'], startMinute: 540, endMinute: 600 },
    { id: 'B', title: 'Synthetic parallel／合成平行場', room: 'R1', speakers: ['T'], startMinute: 570, endMinute: 585 },
    { id: 'C', title: 'Synthetic next room／合成換房場', room: 'R2', speakers: ['S'], startMinute: 600, endMinute: 660 }
  ],
  overlapPairs: [{ sessionIds: ['A', 'B'], reasons: ['room_overlap'], sharedSpeakers: [] }],
  transitionWarnings: [{ sessionIds: ['A', 'C'], sharedSpeakers: ['S'], fromRoom: 'R1', toRoom: 'R2', gapMinutes: 0, requiredMinutes: 10 }],
  roomSchedules: [
    { room: 'R1', sessions: [{ id: 'A', startMinute: 540, endMinute: 600 }, { id: 'B', startMinute: 570, endMinute: 585 }] },
    { room: 'R2', sessions: [{ id: 'C', startMinute: 600, endMinute: 660 }] }
  ],
  speakerSchedules: [
    { speaker: 'S', sessions: [{ id: 'A', startMinute: 540, endMinute: 600 }, { id: 'C', startMinute: 600, endMinute: 660 }] },
    { speaker: 'T', sessions: [{ id: 'B', startMinute: 570, endMinute: 585 }] }
  ]
};
const checked = validateAgenda(raw);
assert.equal(checked.ok, true);
const result = analyseAgenda(checked.agenda);
const outputRoot = path.join(PROJECT_ROOT, 'evidence/m1/outputs');
await mkdir(outputRoot, { recursive: true });
await writeFile(path.join(outputRoot, 'synthetic-input.json'), `${JSON.stringify(raw, null, 2)}\n`);
await writeFile(path.join(outputRoot, 'independent-expected.json'), `${JSON.stringify(expected, null, 2)}\n`);
for (const language of ['zh-Hant', 'en']) {
  const serialized = serializeAgendaReport(result, { language });
  assert.equal(serialized.ok, true);
  assert.deepEqual(JSON.parse(serialized.files.json.text), expected);
  assert.ok(serialized.files.txt.text.includes('A ↔ B'));
  assert.ok(serialized.files.txt.text.includes('A → C'));
  assert.ok(serialized.files.txt.text.includes('R1 → R2'));
  const destination = path.join(outputRoot, language);
  await mkdir(destination, { recursive: true });
  for (const file of Object.values(serialized.files)) {
    assert.equal(Buffer.byteLength(file.text, 'utf8'), file.bytes);
    await writeFile(path.join(destination, file.name), file.text, 'utf8');
  }
}
const acceptance = {
  milestone: 'B20-61-M1', date: '2026-10-23', data: 'synthetic only',
  core: Array.from({ length: 20 }, (_, i) => ({ id: `A${String(i + 1).padStart(2, '0')}`,
    status: i === 15 ? 'PASS_NODE_OUTPUT_STATIC_DOM' : i === 19 ? 'PASS_NODE_CONTROLLER_SCHEDULER' : 'PASS_NODE',
    browser: [15, 19].includes(i) ? 'NOT_RUN_USER_FOCUS_INCIDENT' : 'not claimed' })),
  browser: ['B01', 'B02', 'B03', 'B04'].map(id => ({ id, status: 'NOT_RUN_USER_FOCUS_INCIDENT' })),
  http: { pureRouting: 'PASS_NODE', actualListenAndHTTP: 'NOT_RUN_SCOPE_NO_SERVER' },
  publication: 'NOT_PUBLISHED_M1_ONLY', hosting: 'NOT_DEPLOYED_M1_ONLY', externalReview: 'NOT_RUN',
  outputAssertions: 'Full parsed JSON equals independently written expected; TXT includes actual issue pairs and directed transition; UTF-8 file bytes verified.',
  caveat: 'A18 literal 2MiB/+1 tests cover the shared atomic byte gate; serializer integration and a valid oversized agenda are separate tests. Node is not browser/Worker/download/Network/Storage acceptance.'
};
await writeFile(path.join(PROJECT_ROOT, 'evidence/m1/acceptance.json'), `${JSON.stringify(acceptance, null, 2)}\n`);
process.stdout.write('PASS synthetic artifacts: 2 languages, 4 real report files, full independent JSON oracle; no browser or server started.\n');
