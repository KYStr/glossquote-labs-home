const rate = 44100;
const channels = 2;
function correlation(reference, actual, offset) {
  const start = rate; let cross = 0, left = 0, right = 0;
  for (let i = start; i < start + 2048; i += 4) {
    const j = i + offset;
    if (j < 0 || j * channels >= actual.length) continue;
    const a = reference[i * channels], b = actual[j * channels];
    cross += a * b; left += a * a; right += b * b;
  }
  return left > 0 && right > 0 ? cross / Math.sqrt(left * right) : -1;
}
function align(reference, actual) {
  let offset = 0, best = -Infinity;
  for (let candidate = -4096; candidate <= 4096; candidate++) {
    const score = correlation(reference, actual, candidate);
    if (score > best) { best = score; offset = candidate; }
  }
  return offset;
}
function frequency(pcm, channel) {
  const first = rate, last = Math.min(rate * 8, pcm.length / channels - rate);
  const crossings = [];
  for (let i = first + 1; i < last; i++) {
    const before = pcm[(i - 1) * channels + channel], current = pcm[i * channels + channel];
    if (before <= 0 && current > 0) crossings.push(i - 1 + (-before / (current - before)));
  }
  return crossings.length > 1 ? (crossings.length - 1) * rate / (crossings.at(-1) - crossings[0]) : null;
}
export function audioMetrics(reference, actual, { alignPulse = false, expectedFrequencies = null } = {}) {
  const offset = alignPulse ? align(reference, actual) : 0;
  const snr = [], peaks = [], signalEnergy = [];
  const start = Math.max(rate / 2, -offset);
  const end = Math.min(reference.length / channels - rate / 2, actual.length / channels - offset - rate / 2);
  for (let channel = 0; channel < channels; channel++) {
    let signal = 0, noise = 0, peak = 0;
    for (let i = start; i < end; i++) {
      const a = reference[i * channels + channel], b = actual[(i + offset) * channels + channel];
      signal += a * a; noise += (a - b) ** 2; peak = Math.max(peak, Math.abs(b));
    }
    if (!(signal > 0) || end <= start) throw new Error('INVALID_QUALITY_FIXTURE');
    signalEnergy.push(signal); snr.push(noise === 0 ? 'Infinity' : 10 * Math.log10(signal / noise)); peaks.push(peak);
  }
  const frequencies = [frequency(actual, 0), frequency(actual, 1)];
  const frequencyErrors = expectedFrequencies?.map((expected, channel) => frequencies[channel] === null ? null : Math.abs(frequencies[channel] - expected)) ?? null;
  return { offsetSamples: offset, snrDb: snr, peaks, signalEnergy, frequenciesHz: frequencies, frequencyErrorsHz: frequencyErrors,
    pass: snr.every((value) => value === 'Infinity' || value >= 20) && peaks.every((value) => value > 0 && value < .999) && (!frequencyErrors || frequencyErrors.every((value) => value !== null && value <= 1)) };
}
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.onmessage = ({ data }) => {
    try { self.postMessage({ result: audioMetrics(new Float32Array(data.reference), new Float32Array(data.actual), data.options) }); }
    catch { self.postMessage({ error: 'INVALID_QUALITY_FIXTURE' }); }
  };
}
