import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, PUBLIC_FILES } from '../scripts/check.mjs';

test('S: static privacy contract; this is not browser Network/Storage evidence', async () => {
  for (const file of PUBLIC_FILES.filter(file => file.endsWith('.mjs'))) {
    const js = await readFile(join(ROOT, 'public', file), 'utf8');
    assert.doesNotMatch(js, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|navigator\.clipboard|document\.cookie|history\.|location\.|innerHTML|outerHTML|insertAdjacentHTML|DOMParser|\beval\s*\(|new Function|console\.|showOpenFilePicker|showSaveFilePicker|showDirectoryPicker|FileReader|\.text\s*\(|\.arrayBuffer\s*\(/);
    assert.doesNotMatch(js, /addEventListener\(['"](?:drop|dragover|paste)/);
  }
  const app = await readFile(join(ROOT, 'public/js/app.mjs'), 'utf8');
  assert.match(app, /lifecycle\.addEventListener\('pagehide',[^\n]*reset\(\); workspace\.clear\(\)/);
  assert.match(app, /lifecycle\.addEventListener\('pageshow',[^\n]*event\.persisted[^\n]*workspace\.clear\(\)/);
  assert.match(app, /removeAttribute\('href'\)/); assert.match(app, /URL\.revokeObjectURL/);
  assert.match(app, /element\.textContent = text/); assert.match(app, /previous\.abort\.abort\(\)/);
  for (const file of ['filename-planner.mjs', 'zip-store.mjs']) {
    const core = await readFile(join(ROOT, 'public/js/core', file), 'utf8');
    assert.doesNotMatch(core, /\bdocument\b|\bwindow\b|\bnavigator\b/);
  }
});
test('S: UI layout intent and child-process isolation are explicit; actual layout NOT_RUN', async () => {
  const css = await readFile(join(ROOT, 'public/styles/app.css'), 'utf8');
  for (const value of ['[hidden]', '44px', ':focus-visible', 'prefers-reduced-motion', '48rem', '75rem', 'overflow-wrap: anywhere', 'minmax(0, 1fr)']) assert.ok(css.includes(value));
  assert.doesNotMatch(css, /@import|url\(/);
  for (const file of ['check.mjs', 'verify-zip.mjs']) {
    const js = await readFile(join(ROOT, 'scripts', file), 'utf8');
    for (const call of js.matchAll(/spawnSync\([^;]+/g)) {
      assert.match(call[0], /windowsHide: true/); assert.match(call[0], /shell: false/); assert.match(call[0], /timeout: \d+/);
    }
  }
});
