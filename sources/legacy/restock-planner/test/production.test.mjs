import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, unlink, link, rename, symlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from '../scripts/build.mjs';
import { buildProduction, checkProduction, headersFor, parseHeaders, robotsAllows } from '../scripts/lib/production.mjs';
import { inventory } from '../scripts/lib/files.mjs';
import { runProductionHttp } from '../scripts/lib/production-http.mjs';
import { fixture, cleanupFixture, ownedPath } from '../scripts/test-support/fixture.mjs';

async function withFixture(action){const root=await fixture();try{await build(root);await buildProduction(root);await action(root);}finally{await cleanupFixture(root);}}
test('M2 reproducible independent build preserves M1 and has exact SEO and inert payload hashes',()=>withFixture(async root=>{
  const before=await inventory(ownedPath(root,'dist'));const first=await checkProduction(root),second=await buildProduction(root);assert.deepEqual(first.files,second.files);assert.equal(first.files.length,15);assert.deepEqual(await inventory(ownedPath(root,'dist')),before);
  for(const [file,lang,name] of [['index.html','zh-Hant','補貨數量試算'],['en/index.html','en','Restock Quantity Planner']]){
    const html=await readFile(ownedPath(root,`dist-production/${file}`),'utf8'),payload=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1],data=JSON.parse(payload);
    assert.equal(data['@graph'][0]['@type'],'WebApplication');assert.equal(data['@graph'][0].name,name);assert.equal(data['@graph'][0].url,`https://restock.glossquote.com/${file}`);assert.equal(data['@graph'][0].inLanguage,lang);assert.equal(data['@graph'][1].mainEntity.length,3);assert.ok(first.csp.includes(`'sha256-${createHash('sha256').update(payload).digest('base64')}'`));
    assert.equal(data['@graph'][1].mainEntity[0].name,lang==='en'?'How does the planner estimate the number of packs?':'這個工具怎麼算出建議補幾包？');
    assert.ok(html.includes('<link rel="icon" type="image/svg+xml" href="/favicon.svg">'));
  }
  const icon=await readFile(ownedPath(root,'dist-production/favicon.svg'),'utf8');assert.equal(/<(?:script|foreignObject|image|use|style)\b|\s(?:on[a-z]+|href|xlink:href)\s*=/i.test(icon),false);assert.ok(first.csp.includes("img-src 'self'"));
}));
test('header merging/removal and robots longest-prefix decisions are real evaluations',()=>{
  const rules=parseHeaders('/*\n  X-Robots-Tag: noindex\n  Test: first\n/index.html\n  ! X-Robots-Tag\n  Test: second\n');
  assert.deepEqual(headersFor(rules,'/index.html'),{test:'first, second'});assert.equal(headersFor(rules,'/other')['x-robots-tag'],'noindex');
  assert.equal(robotsAllows('User-agent: *\nAllow: /\nDisallow: /js/\n','/js/app.js'),false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /\nAllow: /js/\nDisallow: /js/private/\n','/js/app.js'),true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /\nAllow: /js/\nDisallow: /js/private/\n','/js/private/x.js'),false);
});
test('production checker rejects SEO, payload, header, robots and sitemap tampering',async()=>{
  const mutations=[['index.html',text=>text.replace('rel="canonical"','rel="wrong"')],['en/index.html',text=>text.replace('hreflang="x-default"','hreflang="wrong"')],['index.html',text=>text.replace('"isAccessibleForFree":true','"isAccessibleForFree":false')],['index.html',text=>text.replace('<title>補貨數量試算','<title>Changed')],['_headers',text=>text.replace("script-src 'self'","script-src 'self' 'unsafe-inline'")],['_headers',text=>text.replace('  ! X-Robots-Tag','  X-Robots-Tag: index, follow')],['robots.txt',text=>text+'Disallow: /js/core/\n'],['sitemap.xml',text=>text.replace('/en/index.html','/third.html')],['sitemap.xml',text=>text+'<extra/>'],['404.html',text=>text.replace('noindex,nofollow','index,follow')],['js/app.js',text=>text+'\n// changed runtime\n']];
  for(const [file,mutate] of mutations)await withFixture(async root=>{const target=ownedPath(root,`dist-production/${file}`);await writeFile(target,mutate(await readFile(target,'utf8')));await assert.rejects(()=>checkProduction(root),file);});
});
test('production build rejects stale files and linked output without changing M1',async()=>{
  for(const kind of ['stale','hardlink','junction'])await withFixture(async root=>{
    const before=await inventory(ownedPath(root,'dist'));
    if(kind==='stale')await writeFile(ownedPath(root,'dist-production/manifest.json'),'{}');
    if(kind==='hardlink'){await unlink(ownedPath(root,'dist-production/en/index.html'));await link(ownedPath(root,'dist-production/index.html'),ownedPath(root,'dist-production/en/index.html'));}
    if(kind==='junction'){await rename(ownedPath(root,'dist-production/en'),ownedPath(root,'held-en'));await symlink(ownedPath(root,'held-en'),ownedPath(root,'dist-production/en'),process.platform==='win32'?'junction':'dir');}
    await assert.rejects(()=>buildProduction(root));assert.deepEqual(await inventory(ownedPath(root,'dist')),before);
  });
});
test('actual M2 loopback process checks full production route/header/Host/HEAD oracle',()=>withFixture(async root=>{
  const checked=await runProductionHttp(root);assert.equal(checked.assetRoutes,14);assert.equal(checked.requests,97);
}));
