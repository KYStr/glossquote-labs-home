export function normalizeSpeech(text, language) {
  if (typeof text !== 'string' || Array.from(text).length > 20000 || !['chinese', 'english'].includes(language)) throw new Error('SCORING_INPUT_INVALID');
  const normalized = text.normalize('NFKC').replace(/\p{P}/gu, '');
  return language === 'chinese' ? Array.from(normalized.replace(/\s/gu, '')) : normalized.toLowerCase().trim().split(/\s+/u).filter(Boolean);
}

export function editDistance(reference, actual) {
  let previous = Array.from({ length: actual.length + 1 }, (_, index) => index);
  for (let row = 0; row < reference.length; row += 1) {
    const next = [row + 1];
    for (let column = 0; column < actual.length; column += 1) next.push(Math.min(next[column] + 1, previous[column + 1] + 1, previous[column] + (reference[row] === actual[column] ? 0 : 1)));
    previous = next;
  }
  return previous[actual.length];
}

export function scoreSpeech(reference, actual, language) {
  const expected = normalizeSpeech(reference, language), observed = normalizeSpeech(actual, language);
  if (expected.length === 0 || expected.length > 512) throw new Error('SCORING_INPUT_INVALID');
  const errors = editDistance(expected, observed);
  return { metric: language === 'chinese' ? 'CER' : 'WER', errors, referenceUnits: expected.length, rate: errors / expected.length, normalizedReference: expected.join(language === 'chinese' ? '' : ' '), normalizedActual: observed.join(language === 'chinese' ? '' : ' ') };
}

export function aggregateScores(scores) {
  if (!Array.isArray(scores) || scores.length !== 5 || scores.some(item => !Number.isInteger(item.errors) || !Number.isInteger(item.referenceUnits) || item.referenceUnits < 1)) throw new Error('SCORING_INPUT_INVALID');
  const errors = scores.reduce((sum, item) => sum + item.errors, 0), referenceUnits = scores.reduce((sum, item) => sum + item.referenceUnits, 0);
  return { errors, referenceUnits, rate: errors / referenceUnits, everySegmentWithinLimit: scores.every(item => item.rate <= 0.4), pass: errors / referenceUnits <= 0.2 && scores.every(item => item.rate <= 0.4) };
}
