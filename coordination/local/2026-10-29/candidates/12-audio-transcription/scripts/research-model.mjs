import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const candidate = Object.freeze({
  modelId: 'Xenova/whisper-base',
  revision: '64da57285918e20ea79ea5c88eed7197933abaa8',
  runtimeVersion: '3.8.1',
  dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
});

const modelFiles = [
  'README.md', 'config.json', 'generation_config.json', 'preprocessor_config.json',
  'tokenizer.json', 'tokenizer_config.json',
];
const sources = [
  ['fixed-model-api.json', `https://huggingface.co/api/models/${candidate.modelId}/revision/${candidate.revision}?blobs=true`],
  ...modelFiles.map(name => [name === 'README.md' ? 'fixed-model-card.txt' : name, `https://huggingface.co/${candidate.modelId}/resolve/${candidate.revision}/${name}`]),
  ['transformers-package.json', 'https://registry.npmjs.org/@huggingface%2ftransformers/3.8.1'],
  ['ort-package.json', 'https://registry.npmjs.org/onnxruntime-web/1.22.0-dev.20250409-89f8206ba4'],
  ['transformers-dtypes.txt', 'https://raw.githubusercontent.com/huggingface/transformers.js/3.8.1/src/utils/dtypes.js'],
  ['transformers-models.txt', 'https://raw.githubusercontent.com/huggingface/transformers.js/3.8.1/src/models.js'],
  ['transformers-env.txt', 'https://raw.githubusercontent.com/huggingface/transformers.js/3.8.1/src/env.js'],
  ['transformers-hub.txt', 'https://raw.githubusercontent.com/huggingface/transformers.js/3.8.1/src/utils/hub.js'],
  ['transformers-LICENSE.txt', 'https://raw.githubusercontent.com/huggingface/transformers.js/3.8.1/LICENSE'],
  ['ort-LICENSE.txt', 'https://raw.githubusercontent.com/microsoft/onnxruntime/89f8206ba4/LICENSE'],
  ['ort-ThirdPartyNotices.txt', 'https://raw.githubusercontent.com/microsoft/onnxruntime/89f8206ba4/ThirdPartyNotices.txt'],
  ['whisper-LICENSE.txt', 'https://raw.githubusercontent.com/openai/whisper/v20250625/LICENSE'],
  ['upstream-model-card.txt', 'https://huggingface.co/openai/whisper-base/resolve/e37978b90ca9030d5170a5c07aadb050351a65bb/README.md'],
];

async function retrieve(url) {
  const response = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(180_000) });
  if (!response.ok) throw new Error(`PUBLIC_SOURCE_STATUS_${response.status}`);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 4 * 1024 * 1024) { await reader.cancel(); throw new Error('RESEARCH_SOURCE_TOO_LARGE'); }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function research() {
  const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const evidenceRoot = path.resolve(project, '../../.runs/audio-transcription/20261011-unblock');
  await mkdir(evidenceRoot, { recursive: true });
  const destination = path.join(evidenceRoot, `research-${new Date().toISOString().replaceAll(/[:.]/gu, '-')}`);
  await mkdir(destination); // New evidence only; existing runs are never overwritten.
  const results = await Promise.allSettled(sources.map(async ([name, url]) => {
    const bytes = await retrieve(url);
    await writeFile(path.join(destination, name), bytes, { flag: 'wx' });
    return { name, url, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  }));
  const records = results.map((result, index) => result.status === 'fulfilled' ? result.value : { name: sources[index][0], url: sources[index][1], error: result.reason.message });
  await writeFile(path.join(destination, 'research-sources.json'), JSON.stringify({ candidate, records }, null, 2) + '\n', { flag: 'wx' });
  if (results.some(result => result.status === 'rejected')) throw new Error(`RESEARCH_INCOMPLETE: ${destination}`);
  return { destination, sourceCount: records.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await research())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
