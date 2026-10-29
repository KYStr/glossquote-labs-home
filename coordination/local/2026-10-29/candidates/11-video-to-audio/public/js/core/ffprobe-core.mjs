import createFFmpegCore from '../../vendor/ffmpeg/core-0.12.10/ffmpeg-core.js';
import { retainNativeProbeReturn } from './ffprobe-return.mjs';

// First-party entry loaded by the unchanged official module Worker. The WASM
// URL is always supplied by the adapter from its verified, same-origin bytes.
export default async function createProbeCore(options) {
  return retainNativeProbeReturn(await createFFmpegCore(options));
}
