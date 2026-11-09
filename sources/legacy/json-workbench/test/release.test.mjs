import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {releaseOptions,releaseHTML,releaseHeaders,robots,sitemap,RELEASE_ORIGIN} from '../scripts/release.mjs';
import {createStaticServer} from '../scripts/serve.mjs';
test('T08 preview defaults fail closed and release accepts only the approved candidate origin',()=>{
  assert.deepEqual(releaseOptions([]),{release:false,origin:null});
  assert.deepEqual(releaseOptions(['--release',`--origin=${RELEASE_ORIGIN}`]),{release:true,origin:RELEASE_ORIGIN});
  for(const args of [['--release'],['--origin=https://json.glossquote.com'],['--release','--origin=https://example.com'],['--release','--origin=http://json.glossquote.com']]) assert.throws(()=>releaseOptions(args));
  assert.equal(robots(false),'User-agent: *\nDisallow: /\n');
});
test('T08 both release pages have self canonical, reciprocal hreflang and x-default',async()=>{
  for(const file of ['index.html','en/index.html']) {
    const preview=await readFile(new URL('../public/'+file,import.meta.url),'utf8');
    assert.match(preview,/noindex,nofollow/u);assert.doesNotMatch(preview,/rel="canonical"/u);
    const html=releaseHTML(preview,file,RELEASE_ORIGIN);
    assert.ok(html.includes(`rel="canonical" href="${RELEASE_ORIGIN}/${file}"`));
    assert.ok(html.includes(`hreflang="zh-Hant" href="${RELEASE_ORIGIN}/index.html"`));
    assert.ok(html.includes(`hreflang="en" href="${RELEASE_ORIGIN}/en/index.html"`));
    assert.ok(html.includes(`hreflang="x-default" href="${RELEASE_ORIGIN}/index.html"`));
    assert.doesNotMatch(html,/noindex/u);
  }
  const xml=sitemap();assert.equal((xml.match(/<loc>/gu)||[]).length,2);assert.equal((xml.match(/xhtml:link/gu)||[]).length,6);
  assert.match(robots(true),/Sitemap: https:\/\/json.glossquote.com\/sitemap.xml/u);
});
test('T08 security/MIME rules and 404 noindex stay in release',async()=>{
  const headers=await readFile(new URL('../public/_headers',import.meta.url),'utf8');
  const live=releaseHeaders(headers);assert.doesNotMatch(live.split('/404.html')[0],/X-Robots-Tag/u);
  for(const rule of ["connect-src 'none'","worker-src 'self' blob:","frame-ancestors 'none'",'nosniff','Content-Type: text/javascript']) assert.ok(live.includes(rule));
  assert.match(live,/\/404.html\n  X-Robots-Tag: noindex, nofollow/u);
  const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
  assert.equal(config.assets.directory,'./dist');assert.equal(config.assets.html_handling,'none');assert.equal(config.assets.not_found_handling,'404-page');
  assert.equal(config.workers_dev,false);assert.equal(config.routes[0].pattern,'json.glossquote.com');
});
test('T08 local 404 is actual 404 HTML and stays noindex',async t=>{
  const server=createStaticServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const response=await fetch(`http://127.0.0.1:${server.address().port}/missing/nested/page.html`);
  assert.equal(response.status,404);assert.equal(response.headers.get('content-type'),'text/html; charset=utf-8');assert.match(response.headers.get('x-robots-tag'),/noindex/u);assert.match(await response.text(),/Page not found/u);
});
