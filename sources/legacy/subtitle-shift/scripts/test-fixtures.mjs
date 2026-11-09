// Independent test-only fake-data helpers; never import implementation formatters.
export const basic = '1\n00:00:01,000 --> 00:00:02,500\nHello\n';
export const shiftedBasic = '1\n00:00:02,250 --> 00:00:03,750\nHello\n';
export const request = (srtRaw = basic, direction = 'later', secondsRaw = '1.25') => ({ srtRaw, direction, secondsRaw });
export const cue = (index = '1', timing = '00:00:01,000 --> 00:00:02,500', text = 'Hello') => `${index}\n${timing}\n${text}\n`;
export function referenceTime(ms) {
  // Test oracle uses division/remainder and toFixed, independently of core.
  const totalSeconds = Math.trunc(ms / 1000);
  return [Math.trunc(totalSeconds / 3600), Math.trunc(totalSeconds / 60) % 60, totalSeconds % 60].map(n => n.toFixed(0).padStart(2, '0')).join(':') + ',' + (ms % 1000).toFixed(0).padStart(3, '0');
}
export function manyCues(count, textFor = () => 'x') {
  return Array.from({ length: count }, (_, i) => `${i + 1}\n${referenceTime(i)} --> ${referenceTime(i + 1)}\n${textFor(i)}\n`).join('\n');
}
export function byteLimitFixture(target) {
  for (let n = 1; n <= 2000; n++) {
    const indexBytes = Array.from({ length: n }, (_, i) => String(i + 1).length).reduce((a, b) => a + b, 0);
    const remainingText = target - (indexBytes + 33 * n - 1);
    if (remainingText < n || remainingText > 1000 * n) continue;
    let extra = remainingText - n;
    const lengths = Array.from({ length: n }, () => { const take = Math.min(999, extra); extra -= take; return 1 + take; });
    if (extra !== 0) throw new Error('fixture remainder');
    return manyCues(n, i => 'x'.repeat(lengths[i]));
  }
  throw new Error('fixture cannot fit');
}
