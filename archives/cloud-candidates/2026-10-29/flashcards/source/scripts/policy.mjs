// check/build共用同一不可變snapshot語意gate；驗證失敗不建立stage或改dist。
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
export function checkSnapshot(files) {
const pkg=JSON.parse(files.get('package.json'));
assert.equal(pkg.private,true);assert.equal(pkg.type,'module');
for(const key of ['dependencies','devDependencies','optionalDependencies'])assert.equal(Object.keys(pkg[key]||{}).length,0);
for(const [path,bytes]of files) {
  if(!path.startsWith('public/'))continue;
  const text=bytes.toString('utf8');
  assert(!/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|innerHTML|outerHTML|insertAdjacentHTML|eval|execCommand)\b/.test(text),`Forbidden runtime API: ${path}`);
  assert(!/\bnew\s+Function\b|\bMath\.random\b|https?:\/\/(?!glossquote\.com\/(?:en\/)?index\.html)/.test(text),`Unexpected runtime reference: ${path}`);
}
for(const [path,lang,home,languageLink]of [['public/index.html','zh-Hant','https://glossquote.com/index.html','./en/index.html'],['public/en/index.html','en','https://glossquote.com/en/index.html','../index.html']]) {
  const html=files.get(path).toString();
  assert(html.includes(`<html lang="${lang}">`));assert(html.includes('name="robots" content="noindex,nofollow"'));
  assert(html.includes(`href="${home}"`));assert(html.includes(`href="${languageLink}"`));
  assert(html.includes('<fieldset id="editor" disabled>'));assert(/id="start"[^>]*disabled/.test(html));
  assert(!/maxlength=|<input[^>]*name=|<textarea[^>]*name=|rel="canonical"|application\/ld\+json|sitemap/.test(html));
  assert.equal((html.match(/<h1>/g)||[]).length,1);
  assert.equal((html.match(/<details>/g)||[]).length,6);
  assert(html.includes('form-action &#39;none&#39;')||html.includes("form-action 'none'"));
}
assert.equal(files.get('public/robots.txt').toString(),'User-agent: *\nDisallow: /\n');
const headers=files.get('public/_headers').toString();
for(const text of ['X-Robots-Tag: noindex, nofollow','X-Content-Type-Options: nosniff',"connect-src 'none'","frame-ancestors 'none'","form-action 'none'",'Referrer-Policy: no-referrer'])assert(headers.includes(text));
assert(!headers.includes('unsafe-inline')&&!headers.includes('unsafe-eval'));
assert(!files.get('public/js/app.mjs').toString().includes('shuffleForTest'));

  // 以snapshot bytes送入Node語法檢查，不再重新讀可能已改變的檔案。
  for (const [path,bytes] of files) if(path.startsWith('public/') && path.endsWith('.mjs')) {
    const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:bytes,encoding:'utf8'});
    assert.equal(result.status,0,`Runtime syntax failed: ${path}`);
  }
}
