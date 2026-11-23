export const FIXTURE_KINDS = Object.freeze(['tone440', 'tone1000', 'pulse', 'stereo', 'long180']);
export function fixtureArgs(kind) {
  if (!FIXTURE_KINDS.includes(kind)) throw new Error('FIXTURE_UNKNOWN');
  const duration = kind === 'long180' ? 180 : 10;
  const audio = kind === 'tone1000' ? 'sine=frequency=1000:sample_rate=44100'
    : kind === 'pulse' ? 'aevalsrc=if(lt(mod(t\\,1)\\,0.015)\\,0.125*sin(2*PI*1000*t)\\,0):s=44100'
    : kind === 'stereo' ? 'aevalsrc=0.125*sin(2*PI*440*t)|0.125*sin(2*PI*1000*t):s=44100'
    : 'sine=frequency=440:sample_rate=44100';
  return ['-f', 'lavfi', '-i', 'color=c=blue:s=320x240:r=10', '-f', 'lavfi', '-i', audio, '-t', String(duration), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ac', '2', 'input.mp4'];
}
export const pcmArgs = (input, output) => {
  if (!['input.mp4', 'output.mp3'].includes(input) || !['reference.f32', 'actual.f32'].includes(output)) throw new Error('FIXTURE_UNKNOWN');
  return ['-i', input, '-map', '0:a:0', '-vn', '-ar', '44100', '-ac', '2', '-f', 'f32le', output];
};
