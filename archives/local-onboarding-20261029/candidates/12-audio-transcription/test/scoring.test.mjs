import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSpeech, scoreSpeech, aggregateScores } from './spike/scoring.mjs';

test('scores original Chinese substitution errors without correcting model text', () => {
  const score = scoreSpeech('今天下雨了，我在家中休息。', '今天下雨了,我再加中休息。', 'chinese');
  assert.equal(score.errors, 2);
  assert.equal(score.normalizedActual, '今天下雨了我再加中休息');
  assert.equal(score.rate, 2 / score.referenceUnits);
});

test('NFKC, punctuation and whitespace normalization preserve substantive added words', () => {
  assert.deepEqual(normalizeSpeech('Ｔｈｅ BLUE cup.', 'english'), ['the', 'blue', 'cup']);
  assert.equal(scoreSpeech('The blue cup.', 'The blue cup today.', 'english').errors, 1);
  assert.equal(scoreSpeech('今天 下雨', '今天下雨字幕', 'chinese').errors, 2);
  assert.throws(() => scoreSpeech('', '', 'english'), /SCORING_INPUT_INVALID/u);
});

test('quality gate weights reference lengths and retains per-segment failures', () => {
  const scores = [{ errors: 3, referenceUnits: 5, rate: 0.6 }, ...Array.from({length:4}, () => ({ errors: 0, referenceUnits: 20, rate: 0 }))];
  const aggregate = aggregateScores(scores);
  assert(aggregate.rate < 0.2);
  assert.equal(aggregate.everySegmentWithinLimit, false);
  assert.equal(aggregate.pass, false);
});
