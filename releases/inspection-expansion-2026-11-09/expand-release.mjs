import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {prepare} from './prepare-release.mjs';
const base=path.dirname(fileURLToPath(import.meta.url));
const oldBase=path.resolve(base,'../seo-deploy-2026-11-09');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const sha=b=>createHash('sha256').update(b).digest('hex');
function files(dir){const out=[];function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name),s=fs.lstatSync(f);assert(!s.isSymbolicLink());if(e.isDirectory())walk(f);else{assert(s.isFile()&&s.nlink===1);out.push({path:path.relative(dir,f).replaceAll('\\','/'),bytes:s.size,sha256:sha(fs.readFileSync(f))});}}}walk(dir);return out.sort((a,b)=>a.path.localeCompare(b.path));}
const oldPlan=read(path.join(oldBase,'batch-plan.json'));
assert.deepEqual(files(path.join(oldBase,'release')),oldPlan.files,'Prior fixed release drift');
const oldPrepared=read(path.join(oldBase,'prepared.json'));
const oldSites=read(path.join(oldBase,'release/sites.json'));
assert.equal(oldPrepared.rows.length,67);
const inputs=read(path.join(base,'inputs-new.json'));
assert(inputs.length>0&&inputs.length<=30);
for(const c of inputs)assert(!Object.hasOwn(oldSites,c.host||c.slug+'.glossquote.com'),'New candidate collides with prior inspection host');
prepare(inputs);
const release=path.join(base,'release'),fresh=read(path.join(base,'prepared.json')),sites=read(path.join(release,'sites.json'));
const retained=[];
for(const [host,site]of Object.entries(oldSites)){
 if(host==='review.glossquote.com')continue;
 assert(!Object.hasOwn(sites,host));sites[host]=site;
 const src=path.join(oldBase,'release/assets/__sites',site.slug),dest=path.join(release,'assets/__sites',site.slug);
 fs.cpSync(src,dest,{recursive:true,errorOnExist:true,force:false});
 assert.deepEqual(files(dest),files(src),'Prior asset bytes drift');
 retained.push({host,slug:site.slug,files:files(dest)});
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=[...oldPrepared.rows,...fresh.rows];
for(const en of [false,true]){
 const f=path.join(release,'assets/__sites/review',en?'en/index.html':'index.html');let html=fs.readFileSync(f,'utf8');
 const tbody=rows.map(r=>`<tr><td><a href="${r.origin}${en?'/en/index.html':'/index.html'}">${esc(en?r.titleEn:r.titleZh)}</a></td><td>${en?'Public inspection; function review pending':'公開檢查版；功能待驗'}</td><td>noindex</td><td><a href="https://github.com/${r.repository}/tree/${r.commit}/${r.sourceRoot==='.'?'':r.sourceRoot}">${r.commit.slice(0,8)}</a></td></tr>`).join('\n');
 html=html.replace(/<tbody>[\s\S]*?<\/tbody>/,'<tbody>'+tbody+'</tbody>');
 html=html.replace(en?`${fresh.count} newly hosted tools. Deployment is separate from functional acceptance.`:`本批 ${fresh.count} 款工具。上線供檢查與功能驗收分開記錄。`,en?`${rows.length} tools available for public inspection (${fresh.count} added in this release). Functional acceptance remains separate.`:`共 ${rows.length} 款工具可公開檢查（本輪新增 ${fresh.count} 款）。功能驗收另行記錄。`);
 fs.writeFileSync(f,html);
}
fs.writeFileSync(path.join(release,'sites.json'),JSON.stringify(sites,null,2)+'\n');
const config=read(path.join(release,'wrangler.jsonc'));config.routes=Object.keys(sites).map(host=>({pattern:host+'/*',zone_name:'glossquote.com'}));fs.writeFileSync(path.join(release,'wrangler.jsonc'),JSON.stringify(config,null,2)+'\n');
const result={preparedAt:new Date().toISOString(),count:rows.length,addedCount:fresh.count,retainedCount:retained.length,previousReleaseCommit:oldPlan.commit,rows,files:files(release)};
assert.equal(Object.keys(sites).length,rows.length+1);
fs.writeFileSync(path.join(base,'prepared.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(base,'retained-assets.json'),JSON.stringify({status:'PASS_BYTE_IDENTICAL',sites:retained},null,2)+'\n');
console.log(JSON.stringify({total:rows.length,added:fresh.count,retained:retained.length,files:result.files.length,bytes:result.files.reduce((s,f)=>s+f.bytes,0)}));
