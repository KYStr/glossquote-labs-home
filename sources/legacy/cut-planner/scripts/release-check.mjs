import { readFile,lstat,readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { ROOT,ASSETS,sha256,builtAssets } from './assets.mjs';
import { checkProduction,ORIGIN } from './production.mjs';
export const SOURCE_FILES=Object.freeze([
  '.gitignore','package.json','project.json','wrangler.jsonc','AGENTS.md','PRODUCT.md','TECHNICAL.md','UX-SEO.md','ACCEPTANCE.md','TASKS.md','README.md','START-HERE.md','TASK-ENTRY.md','HANDOFF.md',
  'docs/BRAND.md','docs/DESIGN-SYSTEM.md','docs/ENGINEERING.md','docs/GIT-PUBLICATION-SAFETY.md','docs/PRIVACY-SECURITY.md','docs/RELEASE.md','docs/RELEASE-CANDIDATE.md','docs/M1-DESIGN.md','docs/M2-DESIGN.md','docs/PUBLIC-RELEASE.md',
  ...ASSETS.map(name=>'public/'+name),
  'scripts/assets.mjs','scripts/build.mjs','scripts/check.mjs','scripts/server.mjs','scripts/production.mjs','scripts/production-server.mjs','scripts/release-check.mjs','scripts/m1-asset-lock.json',
  'tests/core.test.mjs','tests/session.test.mjs','tests/toolchain.test.mjs','tests/production.test.mjs'
]);
export async function sourceInventory(root=ROOT){
  const allowed=new Set(SOURCE_FILES),directories=new Set(SOURCE_FILES.flatMap(name=>{const parts=name.split('/');return parts.slice(0,-1).map((_,i)=>parts.slice(0,i+1).join('/'));})),files=[];
  async function walk(relative=''){
    for(const entry of await readdir(path.join(root,relative),{withFileTypes:true})){
      const name=relative?relative+'/'+entry.name:entry.name;if(!relative&&['.git','dist','dist-production'].includes(name))continue;
      const absolute=path.join(root,name),stat=await lstat(absolute);assert.ok(!stat.isSymbolicLink(),'Linked source rejected');
      if(stat.isDirectory()){assert.ok(directories.has(name),`Unknown source directory: ${name}`);await walk(name);}
      else{assert.ok(stat.isFile()&&stat.nlink===1,'Linked/non-file source rejected');assert.ok(allowed.has(name),`Unknown source file: ${name}`);assert.ok(stat.size<=1048576);const bytes=await readFile(absolute);files.push({path:name,bytes:bytes.length,sha256:sha256(bytes)});}
    }
  }
  await walk();assert.deepEqual(files.map(f=>f.path).sort(),[...SOURCE_FILES].sort());return files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
}
export async function checkConfig(){
  const config=JSON.parse(await readFile(path.join(ROOT,'wrangler.jsonc'),'utf8'));
  assert.deepEqual(config,{name:'glossquote-cut-planner',compatibility_date:'2026-10-19',assets:{directory:'./dist-production',html_handling:'none',not_found_handling:'404-page'},routes:[{pattern:'cuts.glossquote.com',custom_domain:true}],workers_dev:false,preview_urls:false,send_metrics:false,observability:{enabled:false,logs:{enabled:false},traces:{enabled:false}}});return config;
}
export async function releaseCheck(){
  const preview=await builtAssets(),production=await checkProduction();await checkConfig();
  const source=await sourceInventory();
  for(const file of SOURCE_FILES.filter(name=>name.endsWith('.md'))){
    const text=await readFile(path.join(ROOT,file),'utf8');
    for(const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)){
      const target=match[1];if(/^(?:https?:|mailto:|#)/.test(target))continue;
      assert.ok(!path.isAbsolute(target)&&!target.includes('\\'),'Document links must be portable');
      const relative=path.posix.normalize(path.posix.join(path.posix.dirname(file),target.split('#')[0]));assert.ok(SOURCE_FILES.includes(relative),`Unknown document link in ${file}`);
    }
  }
  return {schemaVersion:1,status:'PASS',scope:'Offline source + preview + local production model; not a live/CDN/browser acceptance',origin:ORIGIN,sourceFiles:source.length,previewFiles:preview.size,productionFiles:production.size,sourceManifestSha256:sha256(JSON.stringify(source)),previewManifestSha256:sha256(preview.get('asset-manifest.json')),productionManifestSha256:sha256(production.get('asset-manifest.json')),manualScope:{pass:69,fail:0,partial:3,notRun:7,zhBfcache:'PARTIAL',enBfcache:'PASS'}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await releaseCheck(),null,2));
