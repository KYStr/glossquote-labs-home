import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceInventory} from '../scripts/review-source.mjs';
test('T09 publication inventory is exact source only and excludes workspace/private/build content',async()=>{
  const records=await sourceInventory();
  assert.ok(records.some(record=>record.path==='public/en/index.html'));
  assert.ok(records.some(record=>record.path==='docs/U02-ERROR-LOCATION.md'));
  assert.ok(records.some(record=>record.path==='test/formatter.test.mjs'));
  assert.ok(records.every(record=>/^[a-f0-9]{64}$/u.test(record.sha256)));
  assert.equal(records.some(record=>/^(?:HANDOFF.md|TASK-ENTRY.md|AGENTS.md|TASKS.md|dist\/|\.runs\/)/u.test(record.path)),false);
  assert.equal(new Set(records.map(record=>record.path)).size,records.length);
});
