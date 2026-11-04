import { readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { FIXTURE, requireValue } from './evidence.mjs';

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const PINNED = Object.freeze([
  {
    "path": ".runs/batch20-browser-release-2026-10-25/owner-12-integrated/transport-ab.mjs",
    "bytes": 9197,
    "sha256": "e2b1d95080e96d2f8ee7615b307e4647c490f1c456ae7da8a6e9a93b2faa5d2e"
  },
  {
    "path": ".runs/batch20-browser-release-2026-10-25/owner-12-integrated/reader-extracted.mjs",
    "bytes": 1951,
    "sha256": "b1cfedc495eba438b7969ec2a0a72ce2db1e05e73dcdcdb1aa8536a950403015"
  },
  {
    "path": ".runs/batch20-browser-release-2026-10-25/owner-12-integrated/source-identity.mjs",
    "bytes": 2663,
    "sha256": "174dc0bc51ee70c0620b56e2416552c9a03f56d2328a11184b702b4eeedb7343"
  },
  {
    "path": ".runs/media-acceptance-intake-2026-10-22/owner-12/PRIMARY-CDP-PLAN.md",
    "bytes": 9581,
    "sha256": "19876f35ec5562514d0e7ce2c53b048982e57de32d3c01c74340118f7ae7a0bf"
  },
  {
    "path": ".runs/media-acceptance-intake-2026-10-22/owner-12/planned-cdp-input.json",
    "bytes": 346,
    "sha256": "b07891be01cbac868459c52edcc7337dfe454092b31b91ac8930b3029236a786"
  },
  {
    "path": ".runs/media-unblock-followup-2026-10-19/direct-cdp-client.mjs",
    "bytes": 11567,
    "sha256": "79c93d9131be42e35bed000307f61192384c2abcfcadf8225ee2b112cb3535e4"
  },
  {
    "path": ".runs/media-unblock-followup-2026-10-19/native-network-observer-v3.mjs",
    "bytes": 49467,
    "sha256": "947bde42c30ced66d6a73721db5780ad2d06e780d92567c99c3aad007026b5d7"
  },
  {
    "path": ".runs/browser-acceptance-2026-10-19/station-v3/u19-runner.mjs",
    "bytes": 9592,
    "sha256": "ea4d95effa412a400d5f2d6c7866abb19d8ebd33cb45cb0decdbda5402222f4e"
  },
  {
    "path": ".runs/browser-acceptance-2026-10-19/station-v3/launch.ps1",
    "bytes": 1746,
    "sha256": "672a51930a70ef977c9c619d00322da5821ba4a929f5f9fb89f4b4c723de7063"
  },
  {
    "path": ".runs/browser-acceptance-2026-10-19/station-v3/Boundary.cs",
    "bytes": 9791,
    "sha256": "e90eab79936688e793ea02d378fc7c2691be02fb740e0c27c3f9347c8a192db9"
  },
  {
    "path": ".runs/browser-acceptance-2026-10-19/station-v3/check-tree.ps1",
    "bytes": 1407,
    "sha256": "d681fcc5605a783b42c62a7b8714c5f37e1d1f150af810d4ee2f9f986a5e4f3c"
  },
  {
    "path": "tool-projects/12-audio-transcription/public/js/core/memory-phases.mjs",
    "bytes": 4361,
    "sha256": "0dc951d349c4cbf6713e0c8058c47c5bbdf572f95ed33b8ad0030bf5da366e20"
  },
  {
    "path": "tool-projects/12-audio-transcription/public/model-manifest.json",
    "bytes": 4687,
    "sha256": "0eec37ebd321925e4c75332e6e7987fd36a8bd29260fe9fd9ed761eb6fd3edc0"
  },
  {
    "path": ".runs/media-acceptance-intake-2026-10-22/owner-12/candidate-inventory.json",
    "bytes": 7467,
    "sha256": "62ed62957cde7d21fb094bdf0d76cf25c2317d1ed28cf78959884ac3a65f98ab"
  }
].map(row => Object.freeze(row)));
const digest = value => createHash('sha256').update(value).digest('hex');
export async function verifyFrozenInputs() {
  const seen = new Map();
  for (const row of PINNED) {
    const file = path.resolve(ROOT, row.path);
    let current = file;
    for (;;) {
      requireValue(!(await lstat(current)).isSymbolicLink(), 'FIXED_INPUT_LINK_REJECTED');
      if (current === path.resolve(ROOT)) break;
      const parent = path.dirname(current); requireValue(parent !== current, 'FIXED_INPUT_BOUNDARY'); current = parent;
    }
    const bytes = await readFile(file);
    requireValue(bytes.length === row.bytes && digest(bytes) === row.sha256, 'FIXED_INPUT_CHANGED');
    seen.set(row.path, bytes);
  }
  const prep = new URL('./', import.meta.url);
  const inventory = JSON.parse(seen.get('.runs/media-acceptance-intake-2026-10-22/owner-12/candidate-inventory.json'));
  requireValue(inventory.state === 'FROZEN' && inventory.scope === 'NODE_PREPARATION_ONLY', 'FROZEN_PREPARATION_REQUIRED');
  const module = seen.get('.runs/batch20-browser-release-2026-10-25/owner-12-integrated/reader-extracted.mjs').toString('utf8');
  const first = module.indexOf('async function getBytes('), last = module.indexOf('export {getBytes};', first);
  const readerSource = module.slice(first, last);
  requireValue(first >= 0 && last > first && digest(readerSource) === FIXTURE.readerSha256, 'FIXED_READER_CHANGED');
  return { readerSource, prep, transportUrl: new URL('./transport-ab.mjs', import.meta.url), sourceIdentityUrl: new URL('./source-identity.mjs', import.meta.url), observerUrl: new URL('../../media-unblock-followup-2026-10-19/native-network-observer-v3.mjs', import.meta.url), directClientUrl: new URL('../../media-unblock-followup-2026-10-19/direct-cdp-client.mjs', import.meta.url), sourceFingerprints: PINNED };
}
