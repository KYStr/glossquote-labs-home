import assert from 'node:assert/strict';
import { ROOT, fileRecords } from './files.mjs';
const EXPECTED = [
  {
    "path": "public/en/index.html",
    "bytes": 10093,
    "sha256": "3d3689d4925f9ecfab3f458373486e6228a732e99d53d7149de1bf85b64a703a"
  },
  {
    "path": "public/index.html",
    "bytes": 9859,
    "sha256": "0246ac3d40ae249bc50a29749f99fffb85581963027191ad222009bff144850d"
  },
  {
    "path": "public/js/app.mjs",
    "bytes": 4974,
    "sha256": "617acfbf7c7fd6356d010722840e4358dab8ae938d28a129a6300695114b0dce"
  },
  {
    "path": "public/js/core/compare.mjs",
    "bytes": 4189,
    "sha256": "818ba921c9807b8be064255833233e10576080cde04fa5ddb84406cc8529765a"
  },
  {
    "path": "public/js/render.mjs",
    "bytes": 645,
    "sha256": "ac11aa3f4144a559d72a2222b07247d24cc781221cab5357c9c075151df54edc"
  },
  {
    "path": "public/js/state.mjs",
    "bytes": 2645,
    "sha256": "6d6ac8d9b5b5b4396080145e8344399b370013772acc1193e7a6d8d50ad59182"
  },
  {
    "path": "public/js/wording.mjs",
    "bytes": 3220,
    "sha256": "50330b3bfcbc1962ab0227b0382896a8abac222c63ead4b9252cfb5f10502470"
  },
  {
    "path": "public/robots.txt",
    "bytes": 26,
    "sha256": "331ea9090db0c9f6f597bd9840fd5b171830f6e0b3ba1cb24dfa91f0c95aedc1"
  },
  {
    "path": "public/styles/app.css",
    "bytes": 7624,
    "sha256": "9bafa29a15d8ca9081d351f90dfb903f2526a0758b02cb0bf7e58dc2c9000cf3"
  },
  {
    "path": "test/core.test.mjs",
    "bytes": 11367,
    "sha256": "c63bb2922909d21e8a6dd57f10912371357f5f286938bec642c15ba03e0c1028"
  },
  {
    "path": "test/dom-fixture.mjs",
    "bytes": 1930,
    "sha256": "6c280e36724425cf4714c9b1539556b082073f1d05325d9a41e9783d20b0e57c"
  },
  {
    "path": "test/fixtures.mjs",
    "bytes": 1756,
    "sha256": "f20dabf33f22b22a9c9c240dc3fa71fc0b4d8051abcfcbae53da9435ed0c4509"
  },
  {
    "path": "test/server.test.mjs",
    "bytes": 4437,
    "sha256": "75c278f256e80faa30308c331f3f1c1463b9d52a000370a6c4e79bf720b51d18"
  },
  {
    "path": "test/state.test.mjs",
    "bytes": 9236,
    "sha256": "281762758ae0438887acdc4d806748e4cb6917b4f1324d6d1fbfa0ed6e196f44"
  }
];
export async function checkFrozenBehavior(){assert.deepEqual(await fileRecords(ROOT, EXPECTED.map(f=>f.path)), EXPECTED);return {status:'PASS',files:EXPECTED.length};}
