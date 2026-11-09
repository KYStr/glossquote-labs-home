import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expectedProduction, auditProduction, applyHeaderRules, robotsAllows, verifyConfig } from '../scripts/production.mjs';
import { root, sourceContents } from '../scripts/assets.mjs';
import { createProductionModel } from '../scripts/serve-production.mjs';
import { auditSourceList } from '../scripts/release-check.mjs';

test('M2 static-assets-only config has explicit privacy settings and no runtime/bindings',async()=>{
  const config=await verifyConfig();
  assert.equal(config.name,'glossquote-grade-target');assert.equal(config.compatibility_date,'2026-10-17');
  for(const key of ['workers_dev','preview_urls','send_metrics'])assert.equal(config[key],false);
  assert.equal(config.dependencies_instrumentation.enabled,false);
  assert.equal(config.observability.enabled,false);assert.equal(config.observability.logs.enabled,false);assert.equal(config.observability.logs.invocation_logs,false);assert.equal(config.observability.traces.enabled,false);
  assert.deepEqual(config.assets,{directory:'./dist-production',html_handling:'none',not_found_handling:'404-page'});
  assert.deepEqual(config.routes,[{pattern:'grades.glossquote.com',custom_domain:true}]);
  for(const key of ['main','vars','secrets','bindings','kv_namespaces','d1_databases','services'])assert.equal(Object.hasOwn(config,key),false);
  assert.equal((await auditSourceList()).includes('wrangler.jsonc'),true);
});
test('M2 generated HTML keeps frozen body and app assets; preview stays noindex',async()=>{
  const preview=await sourceContents(), production=await expectedProduction();
  assert.equal(production.size,12);
  for(const [path,bytes]of preview){
    if(path.endsWith('.html')){
      const original=bytes.toString(),final=production.get(path).toString();
      assert.equal(original.slice(original.indexOf('<body>')),final.slice(final.indexOf('<body>')));
      assert.match(original,/name="robots" content="noindex,nofollow"/u);
      assert.doesNotMatch(original,/canonical|application\/ld\+json/u);
    }else assert.ok(bytes.equals(production.get(path)),path);
  }
});
test('M2 bilingual SEO, exact JSON-LD CSP hash and visible FAQ only',async()=>{
  const files=await expectedProduction();auditProduction(files);
  for(const [language,path,title]of [['zh-Hant','/index.html','成績目標試算'],['en','/en/index.html','Grade Target Calculator']]){
    const html=files.get(path.slice(1)).toString();
    assert.ok(html.includes(`<html lang="${language}">`));assert.ok(html.includes(`<h1>${title}</h1>`));
    assert.ok(html.includes(`<meta property="og:url" content="https://grades.glossquote.com${path}">`));
    const script=/<script type="application\/ld\+json">([\s\S]*?)<\/script>/u.exec(html)[1];
    const hash=createHash('sha256').update(script,'utf8').digest('base64');
    const csp=applyHeaderRules(files.get('_headers').toString(),path)['content-security-policy'];
    assert.ok(csp.includes(`'sha256-${hash}'`));assert.equal((csp.match(/sha256-/gu)??[]).length,1);assert.doesNotMatch(csp,/unsafe-inline|unsafe-eval/u);
    const graph=JSON.parse(script)['@graph'];assert.equal(graph[0]['@type'],'WebApplication');assert.equal(graph[0].name,title);assert.equal(graph[0].inLanguage,language);
    assert.equal(graph[1].mainEntity.length,5);
    for(const q of graph[1].mainEntity){assert.ok(html.includes(`<summary>${q.name}</summary>`));assert.ok(html.includes(`<p>${q.acceptedAnswer.text}</p>`));}
    assert.doesNotMatch(script,/aggregateRating|reviewCount|offers|price|ratingValue/u);
  }
});
test('M2 headers inherit and join, explicit detach removes inherited noindex',async()=>{
  const files=await expectedProduction(),text=files.get('_headers').toString();
  for(const path of ['/index.html','/en/index.html']){
    const applied=applyHeaderRules(text,path);assert.equal(applied['x-robots-tag'],'index, follow');assert.doesNotMatch(applied['x-robots-tag'],/noindex/u);
  }
  assert.equal(applyHeaderRules('/*\n  X-Robots-Tag: noindex\n/index.html\n  X-Robots-Tag: index\n','/index.html')['x-robots-tag'],'noindex, index');
  const bad=new Map(files);bad.set('_headers',Buffer.from(text.replace('  ! X-Robots-Tag\n','')));assert.throws(()=>auditProduction(bad));
  for(const path of ['/','/en/','/unknown','/404.html','/robots.txt','/sitemap.xml'])assert.equal(applyHeaderRules(text,path)['x-robots-tag'],'noindex, nofollow');
});
test('M2 robots matching allows every public JS/CSS; longer disallow regression fails',async()=>{
  const files=await expectedProduction(),robots=files.get('robots.txt').toString();
  for(const path of ['/index.html','/en/index.html',...Array.from(files.keys()).filter(p=>/\.(?:js|css)$/u.test(p)).map(p=>'/'+p)])assert.ok(robotsAllows(robots,path),path);
  const rules='User-agent: *\nAllow: /\nDisallow: /js/\nAllow: /js/core/\nDisallow: /js/core/private.js$\n';
  assert.equal(robotsAllows(rules,'/js/app.js'),false);assert.equal(robotsAllows(rules,'/js/core/exact.js'),true);assert.equal(robotsAllows(rules,'/js/core/private.js'),false);assert.equal(robotsAllows(rules,'/js/core/private.js2'),true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /js/\nAllow: /js/\n','/js/app.js'),true);
  const bad=new Map(files);bad.set('robots.txt',Buffer.from(robots+'Disallow: /js/\n'));assert.throws(()=>auditProduction(bad));
});
function http(port,path,method='GET'){return new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port,path,method},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));});req.on('error',reject);req.end();});}
test('M2 real loopback HTTP model: canonicals, exact bytes, MIME, headers, HEAD, 404 and 405',async()=>{
  const files=await expectedProduction(),server=createProductionModel(files);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    assert.equal(server.address().address,'127.0.0.1');const port=server.address().port;
    for(const [path,type]of [['/index.html','text/html'],['/en/index.html','text/html'],['/styles/app.css','text/css'],['/js/app.js','text/javascript'],['/js/core/exact.js','text/javascript'],['/robots.txt','text/plain'],['/sitemap.xml','application/xml']]){
      const actual=await http(port,path);assert.equal(actual.status,200,path);assert.ok(actual.body.equals(files.get(path.slice(1))));assert.ok(actual.headers['content-type'].startsWith(type));
      assert.match(actual.headers['content-security-policy'],/form-action 'none'/u);assert.match(actual.headers['content-security-policy'],/connect-src 'none'/u);assert.equal(actual.headers['x-content-type-options'],'nosniff');assert.equal(actual.headers['referrer-policy'],'no-referrer');
      assert.equal(actual.headers['x-robots-tag'],path.endsWith('index.html')?'index, follow':'noindex, nofollow');
      const head=await http(port,path,'HEAD');assert.equal(head.status,200);assert.equal(head.body.length,0);assert.equal(head.headers['content-length'],String(actual.body.length));
    }
    for(const path of ['/','/en/','/index','/missing','/package.json','/_headers','/manifest.json','/%2e%2e/index.html','/en/../index.html','//index.html','/index.html?scoreRaw=CANARY']){
      const actual=await http(port,path);assert.equal(actual.status,404,path);assert.ok(actual.body.equals(files.get('404.html')));assert.equal(actual.headers['x-robots-tag'],'noindex, nofollow');assert.doesNotMatch(actual.body.toString(),/CANARY|<form/u);
    }
    const notFound=await http(port,'/missing','HEAD');assert.equal(notFound.status,404);assert.equal(notFound.body.length,0);
    for(const method of ['POST','PUT','DELETE','OPTIONS']){const actual=await http(port,'/index.html',method);assert.equal(actual.status,405);assert.equal(actual.headers.allow,'GET, HEAD');assert.equal(actual.headers['x-robots-tag'],'noindex, nofollow');}
  }finally{await new Promise(resolve=>server.close(resolve));}
});
