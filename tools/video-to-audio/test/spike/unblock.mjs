import { fixtureArgs } from './fixtures.mjs';

const hash = async (bytes) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (value) => value.toString(16).padStart(2, '0')).join('');
const inspectValid = (value) => value?.streams?.length === 2
  && value.streams.some((stream) => stream.codec_type === 'video' && stream.codec_name === 'h264')
  && value.streams.some((stream) => stream.codec_type === 'audio' && stream.codec_name === 'aac' && stream.sample_rate === '44100' && stream.channels === 2)
  && Math.abs(Number(value.format?.duration) - 10) <= .1;

// Bounded blocker proof, independent of the full T02 measurements.
export async function runUnblockProof(engine, { onReport = () => {}, onPhase = () => {} } = {}) {
  const result = { status: 'RUNNING', originalBindingExit: null, fixture: null, cases: [], output: null, cancellation: 'NOT_RUN', fullT02: 'NOT_RUN' };
  onPhase('Generating synthetic 10-second H.264/AAC video');
  const generationExit = await engine.spikeExec(fixtureArgs('tone440'));
  if (generationExit !== 0) throw new Error('CONVERT_FAILED');
  const valid = await engine.spikeRead('input.mp4');
  result.fixture = { generationExit, bytes: valid.length, sha256: await hash(valid) };
  result.originalBindingExit = await engine.spikeOriginalProbeExit();
  onReport(result);
  const validProbe = async (label) => {
    onPhase(label); await engine.write(valid.slice());
    const probe = await engine.probe();
    const pass = inspectValid(probe);
    result.cases.push({ label, exit: 0, pass, probe });
    onReport(result);
    if (!pass) throw new Error('MEDIA_UNSUPPORTED');
  };
  const rejectedProbe = async (label, bytes) => {
    onPhase(label);
    if (bytes !== null) await engine.write(bytes);
    let rejected = false, code = null, exit = null;
    try { if (bytes === null) await engine.spikeMissingProbe(); else await engine.probe(); }
    catch (error) { rejected = true; code = error.message; exit = Number.isInteger(error.probeExit) ? error.probeExit : null; }
    const pass = rejected && code === 'MEDIA_UNSUPPORTED' && exit !== null && exit !== 0;
    result.cases.push({ label, rejected, code, exit, pass });
    onReport(result);
    if (!pass) throw new Error('MEDIA_UNSUPPORTED');
  };
  await validProbe('Valid probe 1');
  await rejectedProbe('Malformed bytes rejected', new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
  await validProbe('Valid probe 2 after malformed bytes');
  await rejectedProbe('Empty file rejected', new Uint8Array());
  await validProbe('Valid probe 3 after empty file');
  await rejectedProbe('Truncated MP4 rejected', valid.slice(0, 64));
  await validProbe('Valid probe 4 after truncated MP4');
  await rejectedProbe('Missing file rejected by native ffprobe', null);
  await validProbe('Valid probe 5 after missing file');
  onPhase('Convert and probe a real synthetic MP3');
  const convertExit = await engine.convert();
  const output = await engine.readOutput();
  const outputProbe = await engine.probe('output.mp3');
  const audio = outputProbe.streams?.[0];
  const pass = convertExit === 0 && outputProbe.streams?.length === 1 && audio.codec_name === 'mp3'
    && audio.sample_rate === '44100' && audio.channels === 2 && Number(audio.bit_rate) === 128000
    && Math.abs(Number(outputProbe.format?.duration) - 10) <= .1;
  result.output = { convertExit, bytes: output.length, probe: outputProbe, pass };
  result.probeWorkerTerminations = engine.probeWorkerTerminationCount;
  result.status = result.originalBindingExit === -1 && result.cases.every((entry) => entry.pass) && pass && result.probeWorkerTerminations === 10 ? 'PASS' : 'FAIL';
  await engine.cleanup();
  onReport(result);
  return result;
}
