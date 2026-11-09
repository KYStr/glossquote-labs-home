import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const oldSites = resolve('.runs/remaining-release-2026-11-09/release/assets/__sites');
const [newCoreArg, newFluidArg] = process.argv.slice(2);
const load = path => import(pathToFileURL(resolve(path)));
const oldCore = await load(oldSites + '/text-to-speech-reader/js/core/tts.mjs');
const newCore = newCoreArg && await load(newCoreArg);
const text = path => readFileSync(path, 'utf8');
const cases = [
  ['reported-ideographic-space', 'First.\u3000Second.', ['First.', 'Second.'], ['First.\u3000Second.']],
  ['reported-nbsp', 'First.\u00a0Second.', ['First.', 'Second.'], ['First.\u00a0Second.']],
  ['ascii-space', 'First. Second.', ['First.', 'Second.']],
  ['tab', 'First.\tSecond.', ['First.', 'Second.']],
  ['multiple-space-kinds', 'First!\u202f\u3000\u00a0Second.', ['First!', 'Second.'], ['First!\u202f\u3000\u00a0Second.']],
  ['unicode-uppercase', 'First?\u2009Élan.', ['First?', 'Élan.'], ['First?\u2009Élan.']],
  ['unicode-digit', 'First?\u00a0７ units.', ['First?', '７ units.'], ['First?\u00a0７ units.']],
  ['opening-quote', 'First.\u3000“second.”', ['First.', '“second.”'], ['First.\u3000“second.”']],
  ['lowercase', 'First.\u3000second.', ['First.\u3000second.']],
  ['unpunctuated-space', 'First\u00a0Second.', ['First\u00a0Second.']],
  ['CRLF-lowercase', 'First.\r\nsecond.', ['First.', 'second.']],
  ['CRLF-after-mixed-space', 'First.\t\u3000\r\nsecond.', ['First.', 'second.']],
  ['CR-and-LF', 'One\rTwo\nThree', ['One', 'Two', 'Three']],
  ['abbreviation-and-decimal', 'Dr.\u00a0Lee paid 3.14 dollars.\u3000Then he left.',
    ['Dr.\u00a0Lee paid 3.14 dollars.', 'Then he left.'], ['Dr.\u00a0Lee paid 3.14 dollars.\u3000Then he left.']],
  ['cjk-closing-marks', '「你好！」再見。', ['「你好！」', '再見。']],
];

const tts = cases.map(([id, input, expected, original = expected]) => {
  const baseline = oldCore.segmentText(input);
  assert.deepEqual(baseline, original, id);
  const fixed = newCore?.segmentText(input);
  if (newCore) assert.deepEqual(fixed, expected, id);
  return {id, input, expected, baseline, fixed};
});
const limits = [];
for (const core of [oldCore, ...(newCore ? [newCore] : [])]) {
  const limit = '𠀀'.repeat(20000);
  const long = core.buildChunks(limit);
  assert.equal(long.sentences.length, 1);
  assert.equal(long.chunks.length, 100);
  assert(long.chunks.every(chunk => Array.from(chunk.text).length === 200));
  assert.equal(long.chunks.map(chunk => chunk.text).join(''), limit);
  assert.throws(() => core.buildChunks(limit + '𠀀'), {code:'TEXT_TOO_LONG'});
  assert.throws(() => core.buildChunks('\u3000\u00a0'), {code:'EMPTY_TEXT'});
  limits.push({textCodePoints:20000, chunkCodePoints:200, chunks:100, overflow:'TEXT_TOO_LONG', empty:'EMPTY_TEXT'});
}
const fluid = ['index.html', 'en/index.html'].map(file => {
  const baseline = text(oldSites + '/fluid-typography/' + file);
  const previous = /<aside class="gq-inspection-notice"[^>]*>[\s\S]*?<\/aside>/g;
  const anchor = / · <a lang="(?:en|zh-Hant)" href="\/(?:en\/)?index\.html">[^<]+<\/a>/g;
  const notices = [...baseline.matchAll(previous)];
  assert.equal(notices.length, 2);
  assert(notices.every(([aside]) => [...aside.matchAll(anchor)].length === 1));
  const expected = baseline.replace(previous, aside => aside.replace(anchor, ''));
  const fixed = newFluidArg ? text(resolve(newFluidArg, file)) : null;
  if (fixed !== null) assert.equal(fixed, expected, file);
  assert.equal((expected.match(/id="language"/g) ?? []).length, 1);
  return {file, oldNoticeLanguageControls:2, fixedNoticeLanguageControls:fixed === null ? null : 0,
    soleAppLanguageControlRetained:fixed === null ? null : true,
    exactDelta:fixed === null ? null : 'only the two language anchors and adjacent separators'};
});
console.log(JSON.stringify({scope: newCore && newFluidArg ? 'original and repair' : 'original only', tts, limits, fluid}, null, 2));
