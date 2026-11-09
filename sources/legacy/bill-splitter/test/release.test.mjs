import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { build } from '../scripts/build.mjs';
import { root, check, checkDist } from '../scripts/check.mjs';
import { htmlTags } from '../scripts/validate.mjs';
import { startServer } from '../scripts/serve.mjs';

test('S26 preview/production exact static SEO, headers, manifest, strict fixed origin and reproducibility', async () => {
  const preview = await build();
  assert.equal(preview.mode, 'preview'); assert.equal(preview.origin, null);
  const previewHtml = await readFile(path.join(root,'dist/index.html'),'utf8');
  assert.ok(previewHtml.includes('noindex,nofollow')); assert.ok(!previewHtml.includes('rel="canonical"')); assert.ok(!previewHtml.includes('application/ld+json'));
  assert.equal(await readFile(path.join(root,'dist/robots.txt'),'utf8'), 'User-agent: *\nDisallow: /\n');
  assert.ok(!(await readFile(path.join(root,'dist/sitemap.xml'),'utf8')).includes('<loc>'));
  assert.ok((await readFile(path.join(root,'dist/_headers'),'utf8')).includes('X-Robots-Tag: noindex, nofollow'));
  const production = await build({ production: true }); await check({ production: true });
  for (const [file, lang, name, title] of [['index.html','zh-Hant','算出誰付給誰','分帳結算｜填已付金額，算出誰付給誰 — GlossQuote'],['en/index.html','en','See who pays whom','Quick Bill Settlement &amp; Advanced Split — GlossQuote']]) {
    const html = await readFile(path.join(root,'dist',file),'utf8'), tags = htmlTags(html);
    const canonical = tags.filter(t => t.tag==='link' && t.attrs.get('rel')==='canonical');
    assert.equal(canonical.length, 1); assert.equal(canonical[0].attrs.get('href'),`https://split.glossquote.com/${file}`);
    assert.ok(html.includes(`<html lang="${lang}">`)); assert.ok(html.includes(`<h1>${name}</h1>`)); assert.ok(html.includes(`<title>${title}</title>`));
    const alternates = tags.filter(t=>t.tag==='link' && t.attrs.get('rel')==='alternate').map(t=>[t.attrs.get('hreflang'),t.attrs.get('href')]);
    assert.deepEqual(alternates,[['zh-Hant','https://split.glossquote.com/index.html'],['en','https://split.glossquote.com/en/index.html'],['x-default','https://split.glossquote.com/index.html']]);
    assert.ok(!html.includes('data-preview')); assert.ok(html.includes('content="index,follow"'));
    const json=JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
    assert.equal(json['@type'],'WebApplication'); assert.equal(json.name,name); assert.equal(json.url,canonical[0].attrs.get('href')); assert.equal(json.inLanguage,lang); assert.ok(!json.aggregateRating);
    const description=tags.find(t=>t.tag==='meta'&&t.attrs.get('name')==='description').attrs.get('content'); assert.equal(json.description,description);
    assert.equal(tags.find(t=>t.tag==='meta'&&t.attrs.get('property')==='og:url').attrs.get('content'),json.url);
  }
  const sitemap=await readFile(path.join(root,'dist/sitemap.xml'),'utf8'); assert.equal((sitemap.match(/<loc>/g)??[]).length,2); assert.ok(sitemap.includes('https://split.glossquote.com/en/index.html'));
  assert.equal(await readFile(path.join(root,'dist/robots.txt'),'utf8'),'User-agent: *\nAllow: /\nSitemap: https://split.glossquote.com/sitemap.xml\n');
  assert.ok(!(await readFile(path.join(root,'dist/_headers'),'utf8')).includes('X-Robots-Tag: noindex'));
  assert.deepEqual(await build({production:true}),production);
  for(const origin of ['https://other.invalid','https://user@split.glossquote.com','https://split.glossquote.com?x=1','https://split.glossquote.com/#x','http://split.glossquote.com']) await assert.rejects(build({production:true,origin}),/UNAPPROVED_ORIGIN/);
  assert.deepEqual(await checkDist(true),production);
  await writeFile(path.join(root,'dist/rogue.txt'),'FAKE_ROGUE'); await assert.rejects(checkDist(true),/DIST_ALLOWLIST/); await build({production:true});
});
test('S26 config is static dist only, no SPA, no Worker code/bindings/telemetry; local dist methods and MIME',async()=>{
  const config=JSON.parse(await readFile(path.join(root,'wrangler.jsonc'),'utf8'));
  assert.deepEqual(config.assets,{directory:'./dist',html_handling:'none',not_found_handling:'404-page'}); assert.equal(config.main,undefined); assert.equal(config.bindings,undefined); assert.equal(config.observability.enabled,false); assert.equal(config.workers_dev,false); assert.equal(config.preview_urls,false);
  const server=await startServer({root:path.join(root,'dist'),port:0});
  try {
    const base=`http://127.0.0.1:${server.address().port}`;
    for(const [file,type] of [['index.html','text/html'],['en/index.html','text/html'],['js/app.mjs','text/javascript'],['styles/app.css','text/css'],['robots.txt','text/plain'],['sitemap.xml','application/xml']]) { const response=await fetch(`${base}/${file}`); assert.equal(response.status,200); assert.ok(response.headers.get('Content-Type').startsWith(type)); }
    for(const file of ['missing','en/missing','deep/missing','en/deep/missing','docs/RELEASE.md','package.json','_headers']) assert.equal((await fetch(`${base}/${file}`)).status,404);
    assert.equal((await fetch(base+'/index.html',{method:'POST'})).status,405);
  } finally { await new Promise(resolve=>server.close(resolve)); }
  const bad=spawnSync(process.execPath,['scripts/build.mjs','--production','--origin=https://unknown.invalid'],{cwd:root,encoding:'utf8'}); assert.notEqual(bad.status,0);
});
