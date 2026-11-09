import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePixels, blendPixels, flattenWhite, comparisonChunks } from '../public/js/core/pixels.mjs';
import { assertSameDimensions, visualDimensions, validatePairBytes, validateFileSize, validateSettings } from '../public/js/core/geometry.mjs';
import { initialSession, reduceSession } from '../public/js/core/session.mjs';
import { rgba } from './fixtures.mjs';

test('A01 strict max RGB threshold and inclusive endpoints', () => {
  const a = rgba(100,100,100,255), b = rgba(110,100,100,255);
  assert.deepEqual(comparePixels(a,b,{ threshold:10 }), { changed:0,total:1,percent:0 });
  assert.deepEqual(comparePixels(a,b,{ threshold:9 }), { changed:1,total:1,percent:100 });
  assert.equal(comparePixels(rgba(0,0,0,255),rgba(255,0,0,255),{ threshold:255 }).changed, 0);
});
test('A02 one changed of two is 50%; alpha is ignored after flatten', () => {
  assert.deepEqual(comparePixels(rgba(1,2,3,255,0,0,0,255),rgba(1,2,3,0,1,0,0,255),{ threshold:0 }), { changed:1,total:2,percent:50 });
});
test('A03 white flatten uses specified rounding; originals remain intact', () => {
  const a = rgba(0,0,0,0,0,0,0,128,100,200,0,128);
  assert.deepEqual([...flattenWhite(a)], [255,255,255,255,127,127,127,255,177,227,127,255]);
  assert.deepEqual(comparePixels(flattenWhite(rgba(0,0,0,0)),rgba(255,255,255,255)), { changed:0,total:1,percent:0 });
  assert.equal(a[3], 0);
});
test('A04/A05 rounded blend with exact endpoint bytes', () => {
  const a = rgba(0,0,0,255,10,30,50,255), b = rgba(255,255,255,255,80,90,100,255);
  assert.deepEqual([...blendPixels(a,b,50)], [128,128,128,255,45,60,75,255]);
  assert.deepEqual(blendPixels(a,b,0), a); assert.deepEqual(blendPixels(a,b,100), b);
});
test('difference palette and faded grayscale are exact; chunk stats agree', () => {
  const iterator = comparisonChunks(rgba(100,100,100,255,0,0,0,255),rgba(110,100,100,255,0,1,0,255),{ mode:'difference',opacity:50,threshold:9 });
  assert.deepEqual(iterator.next(), { done:false, value:{ done:2,total:2 } });
  const result = iterator.next();
  assert.equal(result.done,true);
  assert.deepEqual([...result.value.pixels], [213,38,42,255,191,191,191,255]);
  assert.deepEqual(result.value.stats, { changed:1,total:2,percent:50 });
});
test('chunk iterator never processes more than 100,000 pixels per yield', () => {
  const a = new Uint8ClampedArray(200_001 * 4), b = a.slice();
  const iterator = comparisonChunks(a,b,{ mode:'blend',opacity:50,threshold:0 });
  assert.deepEqual(iterator.next().value,{ done:100_000,total:200_001 });
  assert.deepEqual(iterator.next().value,{ done:200_000,total:200_001 });
  assert.deepEqual(iterator.next().value,{ done:200_001,total:200_001 });
  assert.equal(iterator.next().value.stats.changed,0);
});
test('A06/A07/A08 exact geometry, EXIF swap and resource caps', () => {
  assert.throws(() => assertSameDimensions({width:10,height:20},{width:20,height:10}), /DIMENSION_MISMATCH/);
  assert.deepEqual(visualDimensions({width:20,height:10,orientation:6}),{width:10,height:20});
  assert.deepEqual(assertSameDimensions({width:20,height:10,orientation:6},{width:10,height:20}),{width:10,height:20});
  assert.throws(() => visualDimensions({width:4096,height:4096}), /PIXEL_LIMIT/);
  assert.throws(() => visualDimensions({width:4097,height:1}), /DIMENSION_LIMIT/);
  assert.deepEqual(visualDimensions({width:4000,height:2000}),{width:4000,height:2000});
  assert.throws(() => validateFileSize(8_388_609),/FILE_TOO_LARGE/);
  assert.throws(() => validateFileSize(0),/FILE_EMPTY/);
  assert.throws(() => validateFileSize(NaN),/HEADER_INVALID/);
  assert.doesNotThrow(() => validatePairBytes(8_388_608,8_388_608));
});
test('invalid arrays, settings, prototype and numeric edges fail closed', () => {
  for (const threshold of [-1,256,1.5,'9',Infinity,NaN]) assert.throws(() => comparePixels(rgba(0,0,0,255),rgba(0,0,0,255),{threshold}),/SETTINGS_INVALID/);
  assert.throws(() => blendPixels(rgba(0,0,0,255),rgba(0,0,0,255),101),/SETTINGS_INVALID/);
  assert.throws(() => comparePixels(new Uint8Array(4),rgba(0,0,0,255)),/PIXELS_INVALID/);
  assert.throws(() => comparePixels(rgba(0),rgba(0)),/PIXELS_INVALID/);
  assert.throws(() => comparePixels(rgba(0,0,0,255),rgba(0,0,0,255,0,0,0,255)),/DIMENSION_MISMATCH/);
  assert.throws(() => validateSettings({mode:'blend',opacity:50,threshold:0,unknown:1}),/SETTINGS_INVALID/);
  assert.throws(() => validateSettings(Object.create({mode:'blend',opacity:50,threshold:0})),/SETTINGS_INVALID/);
});
test('A10/A11 reducer rejects stale ready, edit/cancel/error always clear output', () => {
  const start = reduceSession(initialSession(),{type:'start',revision:0});
  const ready = reduceSession(start,{type:'ready',revision:0,result:{changed:0}});
  assert.equal(ready.phase,'ready');
  const edited = reduceSession(ready,{type:'edit'});
  assert.equal(edited.result,null); assert.equal(edited.revision,1);
  assert.equal(reduceSession(edited,{type:'ready',revision:0,result:{}}),edited);
  const canceled = reduceSession(start,{type:'cancel'});
  assert.equal(canceled.result,null); assert.equal(canceled.phase,'editing');
  assert.equal(reduceSession(canceled,{type:'error',revision:0,code:'BAD'}),canceled);
  assert.equal(reduceSession(ready,{type:'error',revision:0,code:'SETTINGS_INVALID'}).result,null);
});
