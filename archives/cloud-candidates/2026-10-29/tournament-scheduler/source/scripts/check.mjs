// 離線來源契約掃描；不是瀏覽器安全認證，與實際受控測試分開記錄。
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { snapshotTree, validateTree } from './files.mjs';
import { HEADERS } from './policy.mjs';
export function checkSnapshot(snapshot) {
  for (const [relative, bytes] of snapshot) {
    const text = bytes.toString('utf8');
    if (relative.endsWith('.mjs')) {
      // 用 stdin 檢查已讀快照，避免重新開啟檔案造成另一組 bytes。
      const run = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: text, encoding: 'utf8' });
      assert.equal(run.status, 0, run.stderr);
      assert.doesNotMatch(text, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|caches|eval|Function)\s*[.(]/);
      assert.doesNotMatch(text, /\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.cookie|navigator\.serviceWorker|console\.|import\s*\(/);
      assert.doesNotMatch(text, /https?:\/\/|history\.|location\.|clipboard\.(?:read|readText)|execCommand/);
    }
    if (relative.endsWith('.html')) {
      const en = relative.startsWith('en/');
      assert.match(text, /name="robots" content="noindex, nofollow"/);
      assert.match(text, /<fieldset id="editor" disabled>/);
      assert.match(text, /id="calculate" type="submit" class="primary" disabled/);
      assert.match(text, new RegExp(`lang="${en ? 'en' : 'zh-Hant'}"`));
      assert.match(text, new RegExp(`href="https://glossquote\\.com/${en ? 'en/' : ''}index\\.html"`));
      assert.match(text, new RegExp(`id="language-link" href="${en ? '/index.html' : '/en/index.html'}"`));
      assert.doesNotMatch(text, /<(?:input|textarea|select)[^>]+name=|canonical|sitemap|<script[^>]*>\s*[^<\s]/);
      assert.doesNotMatch(text, /(?:src|action)="https?:|\son[a-z]+=/);
      assert.equal((text.match(/<script\b/g) || []).length, 1);
      assert.match(text, /<script type="module" src="\/js\/app\.mjs"><\/script>/);
    }
    if (relative.endsWith('.css')) assert.doesNotMatch(text, /@import|url\s*\(/i);
  }
  assert.equal(snapshot.get('robots.txt').toString(), 'User-agent: *\nDisallow: /\n');
  const expectedHeaders = '/*\n' + Object.entries(HEADERS).map(([key, value]) => `  ${key}: ${value}`).join('\n') + '\n';
  assert.equal(snapshot.get('_headers').toString(), expectedHeaders);
}
export async function check(root = new URL('../', import.meta.url)) {
  assert.ok(Number(process.versions.node.split('.')[0]) >= 24, 'Node 24+ is required');
  const snapshot = await snapshotTree(new URL('public/', root));
  checkSnapshot(snapshot);
  await validateTree(new URL('dist/', root), { allowMissing: true });
  const config = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  assert.equal(config.dependencies, undefined); assert.equal(config.devDependencies, undefined);
  return snapshot;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 2) throw new Error('Preview-only check; unsupported arguments.');
  const snapshot = await check();
  console.log(`Static source check passed: ${snapshot.size} public files. Preview only.`);
}
