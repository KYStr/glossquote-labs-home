import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInput } from '../public/js/core/parser.js';
import { chooseKeeper, exclusionIndexes, excludeConfirmed, moveBookmark, renameFolder, setIncluded, validatePath } from '../public/js/core/organizer.js';
import { bytes } from './fixtures.mjs';
export const duplicates = '<DL><DT><H3>A</H3><DL><DT><A HREF="https://example.com/a">First</A><DT><H3>Child</H3><DL><DT><A HREF="https://example.com/a">Second</A></DL></DL></DL>';
test('K49-22–24: keeper does not exclude; exclusion needs confirmation; moves preserve original', () => {
  const job = parseInput(bytes(duplicates));
  chooseKeeper(job, 'url-group-001', 1);
  assert(job.bookmarks.every(item => item.included));
  assert.deepEqual(job.bookmarks.map(item => item.suggestedKeeper), [false, true]);
  assert.throws(() => chooseKeeper(job, 'url-group-001', 999));
  assert.deepEqual(exclusionIndexes(job, 'url-group-001'), [0]);
  assert.equal(excludeConfirmed(job, [0]), false);
  assert.equal(job.bookmarks[0].included, true);
  assert.equal(setIncluded(job, 1, false), false);
  assert.equal(setIncluded(job, 1, false, true), true);
  moveBookmark(job, 0, ['Work', '2026']);
  assert.deepEqual(job.bookmarks[0].folderPath, ['Work', '2026']);
  assert.deepEqual(job.bookmarks[0].originalFolderPath, ['A']);
});
test('folder rename atomically updates descendants and preserves original paths', () => {
  const job = parseInput(bytes(duplicates));
  renameFolder(job, ['A'], ['Work', '2026']);
  assert.deepEqual(job.bookmarks.map(item => item.folderPath), [['Work', '2026'], ['Work', '2026', 'Child']]);
  assert.deepEqual(job.bookmarks.map(item => item.originalFolderPath), [['A'], ['A', 'Child']]);
  const before = JSON.stringify(job);
  assert.throws(() => renameFolder(job, ['Work'], Array(12).fill('x')));
  assert.equal(JSON.stringify(job), before);
});
test('folder segment boundary bytes, levels and punctuation', () => {
  for (const path of [[], ['x'.repeat(255)], ['中'.repeat(85)], ['Research / notes', '<text>', '🙂'], Array(12).fill('x')]) assert.deepEqual(validatePath(path), path);
  for (const path of [['x'.repeat(256)], ['中'.repeat(86)], [''], ['.'], ['..'], ['bad\u0085'], ['bad\n'], Array(13).fill('x')]) assert.throws(() => validatePath(path));
});
