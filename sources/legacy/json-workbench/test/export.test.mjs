import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeOutput, createExporter } from '../public/js/core/export.mjs';
test('JS-23 UTF-8 bytes preserve exact raw numbers, escapes and no BOM', () => {
  const text = '{"x":9007199254740993,"y":1.2300,"z":-0,"e":1e400,"s":"\\u0061","utf":"中😀"}';
  const bytes = encodeOutput(text).value;
  assert.equal(new TextDecoder().decode(bytes),text);
  assert.notDeepEqual([...bytes.slice(0,3)],[239,187,191]);
  assert.equal(encodeOutput('x'.repeat(4194304)).ok,true);
  assert.equal(encodeOutput('x'.repeat(4194305)).error.code,'OUTPUT_TOO_LARGE');
});
test('JS-23 clipboard refusal is recoverable and never reads clipboard', async () => {
  let writes = 0;
  const exporter = createExporter({clipboard:{writeText:async()=>{writes++;throw new Error('denied');}}});
  assert.equal(await exporter.copy('{}'),false); assert.equal(writes,1);
  assert.equal(await createExporter().copy('{}'),false);
});
test('JS-24 fixed JSON download, timeout/new download/clear cleanup and failure cleanup', () => {
  const revoked = []; const downloads = []; const blobs = []; const timers = new Map();
  let next = 0;
  const exporter = createExporter({
    urlAPI:{createObjectURL:blob=>{blobs.push(blob);return `blob:fixture-${++next}`;},revokeObjectURL:url=>revoked.push(url)},
    triggerDownload:(url,name)=>downloads.push({url,name}),
    schedule:(fn,ms)=>{assert.equal(ms,1000);timers.set(next,fn);return next;},
    cancelTimer:id=>timers.delete(id),
  });
  assert.equal(exporter.download('-0').ok,true);
  assert.deepEqual(downloads[0],{url:'blob:fixture-1',name:'formatted.json'});
  assert.equal(blobs[0].type,'application/json');
  exporter.download('1.2300'); assert.deepEqual(revoked,['blob:fixture-1']);
  timers.get(2)(); assert.deepEqual(revoked,['blob:fixture-1','blob:fixture-2']);
  exporter.download('1e400'); exporter.release(); exporter.release();
  assert.deepEqual(revoked,['blob:fixture-1','blob:fixture-2','blob:fixture-3']);
});
