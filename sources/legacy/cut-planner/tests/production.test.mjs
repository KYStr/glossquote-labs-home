import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { ASSETS,ROOT,sha256,builtAssets } from '../scripts/assets.mjs';
import { build } from '../scripts/build.mjs';
import { buildProduction,checkProduction,PRODUCTION,PAGES,ORIGIN,FAVICON_PATH,headerModel,headersFile,ROBOTS,robotsAllows,scriptHash,applicationData,validateProduction } from '../scripts/production.mjs';
import { startProductionServer } from '../scripts/production-server.mjs';
import { checkConfig } from '../scripts/release-check.mjs';
test('M2 build is separate, public runtime and both page bodies retain M1 bytes',async()=>{
  await build();const before=await builtAssets();
  const entries=await Promise.all(ASSETS.map(async name=>[name,await readFile(path.join(ROOT,'public',name))]));const source=new Map(entries);
  const production=await buildProduction();assert.equal(production.size,16);const after=await builtAssets();
  for(const [name,bytes]of before)assert.ok(after.get(name).equals(bytes));assert.equal(sha256(after.get('asset-manifest.json')),'1c394e577de50be9721249d6c066d3815e2307f8c1b7aa51dfa6f39c77e67b8d');
  validateProduction(production,source);assert.equal((await checkProduction()).size,16);
});
test('M2 longest-match robots permits every runtime asset and exactly indexed HTML paths',()=>{
  for(const file of ASSETS.filter(name=>/\.(mjs|css)$/.test(name)))assert.equal(robotsAllows(ROBOTS,'/'+file),true);
  for(const pathname of ['/index.html','/en/index.html','/robots.txt','/sitemap.xml','/favicon.svg'])assert.equal(robotsAllows(ROBOTS,pathname),true);
  for(const pathname of ['/','/en/','/404.html','/missing','/index.html/','/en/index.html.more','/package.json','/asset-manifest.json','/favicon.svg/more','/favicon.ico'])assert.equal(robotsAllows(ROBOTS,pathname),false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /\nAllow: /js/\nDisallow: /js/private/\n','/js/app.mjs'),true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /\nAllow: /js/\nDisallow: /js/private/\n','/js/private/a.mjs'),false);
});
test('R1 fixed local SVG favicon is safe, discoverable in both heads and allowed only by self img-src',async()=>{
  const files=await checkProduction();
  const expected='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#111410"/><path d="M8 7h17v5H13v10h7v-3h-4v-4h9v12H8z" fill="#c8f56a"/></svg>\n';
  assert.equal(files.get('favicon.svg').toString(),expected);assert.ok(Buffer.byteLength(expected)<256);assert.doesNotMatch(expected,/<(?:script|style|image|use|foreignObject|animate)\b|\bon[a-z]+\s*=|\bhref\s*=|url\s*\(|<!DOCTYPE|<!ENTITY/i);
  for(const page of PAGES){const html=files.get(page.path).toString();assert.match(html,/<link rel="icon" type="image\/svg\+xml" sizes="any" href="\/favicon\.svg">/);assert.doesNotMatch(html,/(?:href|src)="data:/);}
  for(const route of ['/index.html','/en/index.html','/favicon.svg'])assert.deepEqual(headerModel(headersFile(),route)['content-security-policy'].split(';').map(x=>x.trim()).filter(x=>x.startsWith('img-src ')),["img-src 'self'"]);
});
test('M2 header model merges rules and detaches inherited noindex/CSP before canonical replacement',()=>{
  const rules=headersFile();
  for(const p of PAGES){const h=headerModel(rules,'/'+p.path);assert.equal(h['x-robots-tag'],'index,follow');assert.ok(!h['x-robots-tag'].includes('noindex'));assert.ok(h['content-security-policy'].includes(scriptHash(applicationData(p))));assert.ok(!h['content-security-policy'].includes('unsafe-inline'));}
  for(const route of ['/404.html','/missing','/js/app.mjs','/css/app.css'])assert.equal(headerModel(rules,route)['x-robots-tag'],'noindex,nofollow');
  const bad=rules.replaceAll('  ! X-Robots-Tag\n','');assert.equal(headerModel(bad,'/index.html')['x-robots-tag'],'noindex,nofollow, index,follow');
});
test('M2 stale production artifacts and tampered SEO are rejected',async()=>{
  const file=path.join(PRODUCTION,'robots.txt'),original=await readFile(file);try{await writeFile(file,'User-agent: *\nDisallow: /\n');await assert.rejects(checkProduction(),/Stale production/);}finally{await writeFile(file,original);}
  const production=await checkProduction();const entries=await Promise.all(ASSETS.map(async name=>[name,await readFile(path.join(ROOT,'public',name))]));const source=new Map(entries);
  const tampered=new Map(production);tampered.set('index.html',Buffer.from(production.get('index.html').toString().replace('content="index,follow"','content="noindex,nofollow"')));assert.throws(()=>validateProduction(tampered,source));
});
function request(port,route,method='GET'){return new Promise((resolve,reject)=>{const q=http.request({hostname:'127.0.0.1',port,path:route,method},res=>{const data=[];res.on('data',d=>data.push(d));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,bytes:Buffer.concat(data)}));});q.on('error',reject);q.end();});}
test('M2 production HTTP model applies canonical headers, aliases, MIME, HEAD, strict 404/405',async()=>{
  const server=await startProductionServer(0),port=server.address().port,files=await checkProduction();assert.equal(server.address().address,'127.0.0.1');
  try{
    for(const file of [...ASSETS,FAVICON_PATH]){const response=await request(port,'/'+file),head=await request(port,'/'+file,'HEAD');assert.equal(response.status,200);assert.ok(response.bytes.equals(files.get(file)));assert.equal(head.status,200);assert.equal(head.bytes.length,0);assert.equal(Number(head.headers['content-length']),response.bytes.length);assert.equal(response.headers['x-robots-tag'],PAGES.some(p=>p.path===file)?'index,follow':'noindex,nofollow');assert.equal(response.headers['x-content-type-options'],'nosniff');if(file===FAVICON_PATH)assert.equal(response.headers['content-type'],'image/svg+xml;charset=utf-8');}
    for(const [route,target]of [['/','/index.html'],['/en/','/en/index.html']]){const r=await request(port,route);assert.equal(r.status,301);assert.equal(r.headers.location,target);assert.equal(r.bytes.length,0);}
    for(const route of ['/not-found','/en/not-found','/_headers','/_redirects','/package.json','/../package.json','/%2e%2e/package.json','/js/%61pp.mjs','/index.html?x=FAKE','//index.html']){const r=await request(port,route);assert.equal(r.status,404);assert.equal(r.headers['x-robots-tag'],'noindex,nofollow');assert.doesNotMatch(r.bytes.toString(),/cut-form/);}
    const post=await request(port,'/index.html','POST');assert.equal(post.status,405);assert.equal(post.headers.allow,'GET, HEAD');assert.equal(post.headers['x-robots-tag'],'noindex,nofollow');
  }finally{await new Promise(resolve=>server.close(resolve));}
});
test('M2 static-assets-only deployment config contains no code/binding/telemetry',async()=>{const config=await checkConfig();assert.equal(config.routes[0].pattern,new URL(ORIGIN).hostname);assert.equal(Object.hasOwn(config,'main'),false);assert.equal(Object.hasOwn(config,'vars'),false);});
