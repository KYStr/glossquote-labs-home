import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, lstat, mkdtemp, mkdir, cp, rm, symlink } from 'node:fs/promises';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ROOT, PUBLIC_FILES } from '../scripts/files.mjs';
import { ORIGIN, TOOL_SLUG, SITE_FILES, REDIRECTS, buildRelease, checkRelease, parseReleaseArgs } from '../scripts/release.mjs';
import { DEPLOYMENT_CONFIG } from '../scripts/release-config.mjs';

const BASE=join(ROOT,'evidence','m2a');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function inside(root,path) {
  const target=resolve(root,path), part=relative(root,target);
  assert.ok(part && !part.startsWith('..') && !isAbsolute(part),'test target stays inside fixture');
  return target;
}
async function fixture(action) {
  await mkdir(BASE,{recursive:true});
  const root=await mkdtemp(join(BASE,'.test-release-'));
  try { await cp(join(ROOT,'public'),join(root,'public'),{recursive:true}); await cp(join(ROOT,'wrangler.jsonc'),join(root,'wrangler.jsonc')); return await action(root); }
  finally {
    const target=inside(BASE,relative(BASE,root));
    assert.ok(relative(BASE,target).startsWith('.test-release-'));
    assert.equal((await lstat(target)).isSymbolicLink(),false);
    await rm(target,{recursive:true});
  }
}
async function tree(root,prefix='') {
  const files=[];
  for(const name of (await readdir(join(root,prefix))).sort()) {
    const path=prefix?`${prefix}/${name}`:name, stat=await lstat(join(root,path));
    assert.equal(stat.isSymbolicLink(),false);
    if(stat.isDirectory()) files.push(...await tree(root,path));
    else { const bytes=await readFile(join(root,path)); files.push({path,bytes:bytes.length,sha256:hash(bytes),mtimeMs:stat.mtimeMs}); }
  }
  return files;
}
async function manifest(root) { return JSON.parse(await readFile(join(root,'release-artifacts','manifest.json'),'utf8')); }
async function rewriteManifest(root,value) { await writeFile(inside(root,'release-artifacts/manifest.json'),`${JSON.stringify(value,null,2)}\n`); }
function links(html) {
  const head=html.split('<head>')[1].split('</head>')[0];
  return [...head.matchAll(/<link\s+([^<>]+)>/g)].map(match=>Object.fromEntries([...match[1].matchAll(/([a-z-]+)="([^"]*)"/g)].map(attribute=>[attribute[1],attribute[2]])));
}
test('release: two-language canonical/alternates, exact origin, robots/sitemap and security headers', async () => fixture(async root=>{
  assert.equal(ORIGIN,'https://image-proof.glossquote.com'); assert.equal(TOOL_SLUG,'image-overlay');
  const result=await buildRelease(root); assert.equal(result.status,'PASS'); assert.equal(result.files,16);
  for(const path of ['index.html','en/index.html']) {
    const source=await readFile(join(root,'public',path),'utf8'), html=await readFile(join(root,'release-artifacts/site',path),'utf8');
    assert.equal(html.split('<body>')[1],source.split('<body>')[1],'visible text and product body remain exact');
    assert.equal(html.match(/<title>([^<]+)<\/title>/)[1],source.match(/<title>([^<]+)<\/title>/)[1]);
    assert.deepEqual(links(html).filter(link=>link.rel==='canonical'),[{rel:'canonical',href:`https://image-proof.glossquote.com/${path}`}]);
    assert.deepEqual(links(html).filter(link=>link.rel==='alternate'),[
      {rel:'alternate',hreflang:'zh-Hant',href:'https://image-proof.glossquote.com/index.html'},
      {rel:'alternate',hreflang:'en',href:'https://image-proof.glossquote.com/en/index.html'},
      {rel:'alternate',hreflang:'x-default',href:'https://image-proof.glossquote.com/index.html'}
    ]);
    assert.equal((html.match(/name="robots" content="index,follow"/g)??[]).length,1);
    assert.ok(source.includes('name="robots" content="noindex,nofollow"')); assert.ok(!source.includes('rel="canonical"'));
  }
  assert.equal(await readFile(join(root,'release-artifacts/site/robots.txt'),'utf8'),'User-agent: *\nAllow: /\nSitemap: https://image-proof.glossquote.com/sitemap.xml\n');
  const sitemap=await readFile(join(root,'release-artifacts/site/sitemap.xml'),'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]),['https://image-proof.glossquote.com/index.html','https://image-proof.glossquote.com/en/index.html']);
  assert.ok(!sitemap.includes('lastmod'));
  const headers=await readFile(join(root,'release-artifacts/site/_headers'),'utf8'), original=await readFile(join(root,'public/_headers'),'utf8');
  assert.equal(headers,original.replace('X-Robots-Tag: noindex, nofollow','X-Robots-Tag: index, follow'));
  assert.ok(headers.includes("connect-src 'none'")); assert.ok(headers.includes("script-src 'self'"));
}));
test('release: preview and every non-SEO runtime asset stay byte-identical; manifest has exact closed schema', async () => fixture(async root=>{
  const before=await tree(join(root,'public'));
  await mkdir(join(root,'dist')); await writeFile(join(root,'dist','preview-sentinel.txt'),'synthetic untouched preview');
  const preview=await tree(join(root,'dist')); await buildRelease(root);
  assert.deepEqual(await tree(join(root,'public')),before); assert.deepEqual(await tree(join(root,'dist')),preview);
  for(const path of PUBLIC_FILES) if(!['index.html','en/index.html','_headers'].includes(path)) assert.deepEqual(await readFile(join(root,'public',path)),await readFile(join(root,'release-artifacts/site',path)));
  const record=await manifest(root);
  assert.deepEqual(Object.keys(record),['schemaVersion','mode','origin','toolSlug','deploymentConfig','files','sourceFiles']);
  assert.equal(record.schemaVersion,2); assert.equal(record.mode,'release-candidate'); assert.equal(record.origin,'https://image-proof.glossquote.com');
  const config=await readFile(join(root,'wrangler.jsonc'));
  assert.deepEqual(record.deploymentConfig,{path:'wrangler.jsonc',bytes:config.length,sha256:hash(config)});
  assert.equal(record.toolSlug,'image-overlay'); assert.deepEqual(record.files.map(file=>file.path),[...SITE_FILES].sort());
  assert.deepEqual(record.sourceFiles.map(file=>file.path),[...PUBLIC_FILES].sort());
  for(const file of [...record.files,...record.sourceFiles]) assert.deepEqual(Object.keys(file),['path','bytes','sha256']);
  assert.ok(!record.files.some(file=>file.path==='manifest.json'));
}));
test('release: rebuilding is byte-deterministic across directories and does not rewrite managed output', async () => fixture(async a=>fixture(async b=>{
  await buildRelease(a); const before=await tree(join(a,'release-artifacts'));
  await buildRelease(a); assert.deepEqual(await tree(join(a,'release-artifacts')),before);
  await buildRelease(b); assert.deepEqual(await manifest(a),await manifest(b));
  for(const path of ['manifest.json',...SITE_FILES.map(file=>`site/${file}`)]) assert.deepEqual(await readFile(join(a,'release-artifacts',path)),await readFile(join(b,'release-artifacts',path)));
  assert.equal((await checkRelease(a)).status,'PASS');
})));
test('release: tampered SEO, runtime, robots, sitemap and CSP are rejected without overwriting evidence', async () => {
  const mutations=[
    ['index.html',text=>text.replace('rel="canonical" href="https://image-proof.glossquote.com/index.html"','rel="canonical" href="https://wrong.invalid/index.html"')],
    ['en/index.html',text=>text.replace('hreflang="x-default" href="https://image-proof.glossquote.com/index.html"','hreflang="x-default" href="https://image-proof.glossquote.com/en/index.html"')],
    ['styles/app.css',text=>text+'\n/* synthetic alteration */\n'],
    ['robots.txt',text=>text.replace('Allow: /','Disallow: /')],
    ['sitemap.xml',text=>text.replace('/en/index.html','/hidden.html')],
    ['_headers',text=>text.replace("connect-src 'none'","connect-src *")],
    ['_redirects',text=>text.replace('/en /en/index.html 301','/en /en/index.html 302')]
  ];
  for(const [path,change] of mutations) await fixture(async root=>{
    await buildRelease(root); const target=inside(root,`release-artifacts/site/${path}`), old=await readFile(target,'utf8');
    const changed=change(old); assert.notEqual(changed,old); await writeFile(target,changed);
    const dirty=await tree(join(root,'release-artifacts'));
    await assert.rejects(checkRelease(root),/RELEASE_ASSET_CHANGED/); await assert.rejects(buildRelease(root),/RELEASE_ASSET_CHANGED/);
    assert.deepEqual(await tree(join(root,'release-artifacts')),dirty);
  });
});
test('release: matching forged manifest hashes cannot authenticate a jointly altered asset', async () => fixture(async root=>{
  await buildRelease(root);
  const path='js/controller.mjs', target=inside(root,`release-artifacts/site/${path}`);
  await writeFile(target,(await readFile(target,'utf8'))+'\n// synthetic forged release\n');
  const bytes=await readFile(target), record=await manifest(root), entry=record.files.find(file=>file.path===path);
  entry.bytes=bytes.length; entry.sha256=hash(bytes); await rewriteManifest(root,record);
  const dirty=await tree(join(root,'release-artifacts'));
  await assert.rejects(checkRelease(root),/RELEASE_ASSET_CHANGED/); await assert.rejects(buildRelease(root),/RELEASE_ASSET_CHANGED/);
  assert.deepEqual(await tree(join(root,'release-artifacts')),dirty);
}));
test('release: missing/extra output files and empty unknown directories fail closed before writing', async () => {
  for(const variation of ['missing','extra','directory']) await fixture(async root=>{
    await buildRelease(root);
    if(variation==='missing') await rm(inside(root,'release-artifacts/site/js/app.mjs'));
    if(variation==='extra') await writeFile(inside(root,'release-artifacts/site/unmanaged.txt'),'synthetic preserve');
    if(variation==='directory') await mkdir(inside(root,'release-artifacts/site/unmanaged'));
    const dirty=await tree(join(root,'release-artifacts'));
    await assert.rejects(checkRelease(root),/RELEASE_(MISSING_FILE|EXTRA_FILE|EXTRA_DIRECTORY)/);
    await assert.rejects(buildRelease(root),/RELEASE_(MISSING_FILE|EXTRA_FILE|EXTRA_DIRECTORY)/);
    assert.deepEqual(await tree(join(root,'release-artifacts')),dirty);
  });
});
test('release: wrong manifest origin/schema/slug/duplicate paths/source hash are independently refused', async () => {
  for(const change of [record=>record.origin='https://wrong.invalid',record=>record.schemaVersion=3,record=>record.toolSlug='other-tool',record=>record.files.push(record.files[0]),record=>record.sourceFiles[0].sha256='0'.repeat(64),record=>record.deploymentConfig.sha256='0'.repeat(64),record=>record.extra='synthetic']) await fixture(async root=>{
    await buildRelease(root); const record=await manifest(root); change(record); await rewriteManifest(root,record);
    const dirty=await tree(join(root,'release-artifacts'));
    await assert.rejects(checkRelease(root),/RELEASE_MANIFEST_CHANGED/); await assert.rejects(buildRelease(root),/RELEASE_MANIFEST_CHANGED/);
    assert.deepEqual(await tree(join(root,'release-artifacts')),dirty);
  });
});
test('release: public source changes reject even when the manifest source hash is forged to match', async () => fixture(async root=>{
  await buildRelease(root); const source=inside(root,'public/index.html');
  await writeFile(source,(await readFile(source,'utf8')).replace('name="robots"','name="synthetic-robots"'));
  const bytes=await readFile(source), record=await manifest(root), entry=record.sourceFiles.find(file=>file.path==='index.html');
  entry.bytes=bytes.length; entry.sha256=hash(bytes); await rewriteManifest(root,record);
  const dirty=await tree(join(root,'release-artifacts'));
  await assert.rejects(checkRelease(root),/RELEASE_SOURCE_CHANGED/); await assert.rejects(buildRelease(root),/RELEASE_SOURCE_CHANGED/);
  assert.deepEqual(await tree(join(root,'release-artifacts')),dirty);
}));
test('release: preflight rejects unknown source files and unmanaged output containers without publishing partial files', async () => {
  await fixture(async root=>{
    await writeFile(inside(root,'public/unknown.txt'),'synthetic');
    await assert.rejects(buildRelease(root),/RELEASE_EXTRA_FILE/);
    await assert.rejects(lstat(join(root,'release-artifacts')),error=>error.code==='ENOENT');
  });
  await fixture(async root=>{
    await mkdir(join(root,'release-artifacts')); await writeFile(inside(root,'release-artifacts/preserve.txt'),'synthetic unmanaged');
    const dirty=await tree(join(root,'release-artifacts'));
    await assert.rejects(buildRelease(root),/RELEASE_EXTRA_FILE/);
    assert.deepEqual(await tree(join(root,'release-artifacts')),dirty);
  });
});
test('release: source/site/container junctions or symlinks are refused, never followed', async () => {
  for(const variation of ['source','site','container']) await fixture(async root=>{
    const target=inside(root,'synthetic-link-target'); await mkdir(target);
    let path;
    if(variation==='source') { path=inside(root,'public/js'); await rm(path,{recursive:true}); }
    if(variation==='site') { await buildRelease(root); path=inside(root,'release-artifacts/site/js'); await rm(path,{recursive:true}); }
    if(variation==='container') path=inside(root,'release-artifacts');
    await symlink(target,path,process.platform==='win32'?'junction':'dir');
    await assert.rejects(buildRelease(root),/RELEASE_(LINK|UNSAFE_DIRECTORY)/);
    assert.deepEqual(await readdir(target),[]);
  });
});
test('release: CLI rejects absent/unknown/extra arguments; valid fixture build/check stay offline', async () => {
  for(const args of [[],['unknown'],['build','extra'],['check','extra'],['build','--origin','https://wrong.invalid']]) {
    assert.throws(()=>parseReleaseArgs(args),/RELEASE_USAGE/);
    const result=spawnSync(process.execPath,[join(ROOT,'scripts/release.mjs'),...args],{shell:false,windowsHide:true,encoding:'utf8',timeout:5000});
    assert.equal(result.status,1); assert.match(result.stderr,/Usage:/); assert.equal(result.stdout,'');
  }
  await fixture(async root=>{
    await mkdir(join(root,'scripts'));
    for(const file of ['release.mjs','release-source.mjs','release-config.mjs','files.mjs']) await cp(join(ROOT,'scripts',file),join(root,'scripts',file));
    for(const mode of ['build','check']) {
      const result=spawnSync(process.execPath,[join(root,'scripts/release.mjs'),mode],{shell:false,windowsHide:true,encoding:'utf8',timeout:5000});
      assert.equal(result.status,0,result.stderr); assert.equal(JSON.parse(result.stdout).origin,'https://image-proof.glossquote.com');
    }
  });
});
test('release: assets-only configuration is fixed, unbound and included in the sibling manifest', async () => fixture(async root=>{
  const config=JSON.parse(await readFile(join(root,'wrangler.jsonc'),'utf8'));
  assert.deepEqual(config,{
    name:'glossquote-image-overlay',compatibility_date:'2026-10-24',workers_dev:false,preview_urls:false,send_metrics:false,
    observability:{enabled:false,logs:{enabled:false,invocation_logs:false},traces:{enabled:false}},
    build:{command:'node scripts/release.mjs build'},
    assets:{directory:'./release-artifacts/site',run_worker_first:false,html_handling:'none',not_found_handling:'none'},
    routes:[{pattern:'image-proof.glossquote.com',custom_domain:true}]
  });
  assert.deepEqual(config,DEPLOYMENT_CONFIG);
  assert.equal(Object.hasOwn(config,'main'),false);assert.equal(Object.hasOwn(config.assets,'binding'),false);assert.equal(Object.hasOwn(config,'vars'),false);
  await buildRelease(root);const record=await manifest(root),bytes=await readFile(join(root,'wrangler.jsonc'));
  assert.equal(record.deploymentConfig.sha256,hash(bytes));
  assert.ok(!record.files.some(file=>file.path.includes('wrangler')||file.path==='manifest.json'),'config and manifest must not be served');
}));
test('release: three canonical entry redirects have exact order/status/LF and canonical targets do not redirect', async () => fixture(async root=>{
  await buildRelease(root);const actual=await readFile(join(root,'release-artifacts/site/_redirects'),'utf8');
  const expected='/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';
  assert.equal(actual,expected);assert.equal(REDIRECTS,expected);
  const entries=actual.trimEnd().split('\n').map(line=>line.split(' '));
  assert.deepEqual(entries,[['/','/index.html','301'],['/en','/en/index.html','301'],['/en/','/en/index.html','301']]);
  for(const [,target] of entries)assert.equal(entries.some(([source])=>source===target),false);
}));
test('release: required build hook is exact and missing/alternate/expanded commands cannot be authenticated by a forged manifest', async () => {
  const changes=[
    config=>delete config.build,
    config=>config.build.command='node scripts/release.mjs check',
    config=>config.build.command='node scripts/release.mjs build && node synthetic.mjs',
    config=>config.build.command=['node','scripts/release.mjs','build'],
    config=>config.build.cwd='./public',
    config=>config.build.environment={SYNTHETIC:'fake'}
  ];
  for(const change of changes)await fixture(async root=>{
    await buildRelease(root);
    const path=join(root,'wrangler.jsonc'),config=JSON.parse(await readFile(path,'utf8'));change(config);
    await writeFile(path,JSON.stringify(config,null,2)+'\n');
    const bytes=await readFile(path),record=await manifest(root);record.deploymentConfig={path:'wrangler.jsonc',bytes:bytes.length,sha256:hash(bytes)};await rewriteManifest(root,record);
    const before=await tree(join(root,'release-artifacts'));
    await assert.rejects(checkRelease(root),/RELEASE_CONFIG_CHANGED/);await assert.rejects(buildRelease(root),/RELEASE_CONFIG_CHANGED/);
    assert.deepEqual(await tree(join(root,'release-artifacts')),before);
  });
});
test('release: configuration authority changes fail closed before writing a new output', async () => {
  const changes=[
    config=>config.name='other-tool',config=>config.compatibility_date='2026-10-27',config=>config.workers_dev=true,
    config=>config.preview_urls=true,config=>config.send_metrics=true,config=>config.observability.enabled=true,
    config=>config.observability.logs.enabled=true,config=>config.observability.logs.invocation_logs=true,config=>config.observability.traces.enabled=true,
    config=>config.assets.directory='./public',config=>config.assets.run_worker_first=true,config=>config.assets.html_handling='auto-trailing-slash',config=>config.assets.not_found_handling='single-page-application',
    config=>config.assets.binding='ASSETS',config=>config.main='worker.mjs',config=>config.vars={SYNTHETIC:'fake'},config=>config.kv_namespaces=[],
    config=>config.routes[0].pattern='wrong.invalid',config=>config.routes[0].custom_domain=false,config=>config.routes.push({pattern:'extra.invalid',custom_domain:true}),
    config=>config.env={production:{vars:{SYNTHETIC:'fake'}}},config=>delete config.observability
  ];
  for(const change of changes)await fixture(async root=>{
    const config=JSON.parse(await readFile(join(root,'wrangler.jsonc'),'utf8'));change(config);await writeFile(join(root,'wrangler.jsonc'),JSON.stringify(config,null,2)+'\n');
    await assert.rejects(buildRelease(root),/RELEASE_CONFIG_CHANGED/);await assert.rejects(lstat(join(root,'release-artifacts')),error=>error.code==='ENOENT');
  });
});
test('release: config missing/link/duplicate key and jointly forged config manifest are refused without repair', async () => {
  await fixture(async root=>{await rm(join(root,'wrangler.jsonc'));await assert.rejects(buildRelease(root),/RELEASE_CONFIG_MISSING/);});
  await fixture(async root=>{
    const target=inside(root,'synthetic-config-directory');await mkdir(target);await rm(join(root,'wrangler.jsonc'));
    await symlink(target,join(root,'wrangler.jsonc'),process.platform==='win32'?'junction':'dir');
    await assert.rejects(buildRelease(root),/RELEASE_CONFIG_UNSAFE/);
  });
  await fixture(async root=>{const path=join(root,'wrangler.jsonc');await writeFile(path,(await readFile(path,'utf8')).replace('"workers_dev": false','"workers_dev": true,\n  "workers_dev": false'));await assert.rejects(buildRelease(root),/RELEASE_CONFIG_CHANGED/);});
  await fixture(async root=>{
    await buildRelease(root);const path=join(root,'wrangler.jsonc');await writeFile(path,(await readFile(path,'utf8')).replace('"send_metrics": false','"send_metrics": true'));
    const bytes=await readFile(path),record=await manifest(root);record.deploymentConfig={path:'wrangler.jsonc',bytes:bytes.length,sha256:hash(bytes)};await rewriteManifest(root,record);
    const before=await tree(join(root,'release-artifacts'));await assert.rejects(checkRelease(root),/RELEASE_CONFIG_CHANGED/);await assert.rejects(buildRelease(root),/RELEASE_CONFIG_CHANGED/);assert.deepEqual(await tree(join(root,'release-artifacts')),before);
  });
});
test('release: changed redirect grammar, newline and jointly forged redirect hash cannot bypass fixed bytes', async () => {
  const variations=[REDIRECTS.replaceAll('\n','\r\n'),REDIRECTS.trimEnd(),REDIRECTS+'/* /index.html 301\n',REDIRECTS.replace('/ /index.html 301','/index.html / 301')];
  for(const changed of variations)await fixture(async root=>{
    await buildRelease(root);const target=join(root,'release-artifacts/site/_redirects');await writeFile(target,changed);
    const bytes=await readFile(target),record=await manifest(root),entry=record.files.find(file=>file.path==='_redirects');entry.bytes=bytes.length;entry.sha256=hash(bytes);await rewriteManifest(root,record);
    const before=await tree(join(root,'release-artifacts'));await assert.rejects(checkRelease(root),/RELEASE_ASSET_CHANGED/);await assert.rejects(buildRelease(root),/RELEASE_ASSET_CHANGED/);assert.deepEqual(await tree(join(root,'release-artifacts')),before);
  });
});
