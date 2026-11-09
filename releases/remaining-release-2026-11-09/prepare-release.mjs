import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const base=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function list(root){const out=[];function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name),s=fs.lstatSync(f);assert(!s.isSymbolicLink(),'No symlinks');if(s.isDirectory())walk(f);else{assert(s.isFile()&&s.nlink===1);out.push({path:path.relative(root,f).replaceAll('\\','/'),bytes:s.size,sha256:sha(fs.readFileSync(f))});}}}walk(root);return out.sort((a,b)=>a.path.localeCompare(b.path));}
function write(p,data){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,data);}
export function overlay(html,{origin,en}){
 const page=en?'/en/index.html':'/index.html';
 html=html.replace(/<meta\b[^>]*(?:name=["']robots["']|property=["']og:url["'])[^>]*>/gi,'');
 html=html.replace(/<link\b[^>]*(?:rel=["']canonical["']|hreflang=["'][^"']+["'])[^>]*>/gi,'');
 html=html.replace(/<a\b([^>]*?)href=(["'])([^"']*)\2([^>]*)>([\s\S]*?)<\/a>/gi,(all,a,q,href,b,label)=>{
   if((/首頁|home|GlossQuote[-\s]*Labs/i.test(label)&&/^(\.\.\/)+(?:en\/)?(?:index\.html)?$/.test(href))||/^https:\/\/glossquote\.com\/?(?:en\/?)?(?:index\.html)?$/.test(href))return `<a${a}href="https://glossquote.com${en?'/en/index.html':'/index.html'}"${b}>${label}</a>`;
   return all;
 });
 const head=`\n<meta name="robots" content="noindex, follow">\n<link rel="canonical" href="${origin+page}">\n<link rel="alternate" hreflang="zh-Hant" href="${origin}/index.html">\n<link rel="alternate" hreflang="en" href="${origin}/en/index.html">\n<link rel="alternate" hreflang="x-default" href="${origin}/index.html">\n<meta property="og:url" content="${origin+page}">\n<link rel="stylesheet" href="/inspection-notice.css">\n`;
 assert(/<\/head>/i.test(html)&&/<body\b/i.test(html));html=html.replace(/<\/head>/i,head+'</head>');
 const nav=[false,true].map(english=>{const text=english?'Public inspection version · Functional review pending · Search indexing is temporarily disabled.':'公開檢查版本・功能驗收尚未完成・暫不開放搜尋索引。';return `<aside class="gq-inspection-notice" lang="${english?'en':'zh-Hant'}" aria-label="${english?'Release status':'發布狀態'}"><p>${text}</p><nav><a href="https://glossquote.com${english?'/en/index.html':'/index.html'}">${english?'GlossQuote home':'GlossQuote 首頁'}</a> · <a href="https://review.glossquote.com${english?'/en/index.html':'/index.html'}">${english?'All inspection tools':'全部待驗工具'}</a> · <a lang="${english?'zh-Hant':'en'}" href="${english?'/index.html':'/en/index.html'}">${english?'繁體中文':'English'}</a></nav></aside>`;}).join('');
 html=html.replace(/(<body\b[^>]*>)/i,'$1'+nav);
 return html;
}
export function prepare(candidates){
 const slugs=new Set(),hosts=new Set();
 for(const c of candidates){
  const host=c.host||c.slug+'.glossquote.com';
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.slug)&&c.slug!=='review'&&c.slug.length<=60);
  assert(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.glossquote\.com$/.test(host)&&host!=='review.glossquote.com');
  assert(!slugs.has(c.slug)&&!hosts.has(host),'Duplicate slug or host');slugs.add(c.slug);hosts.add(host);
  assert(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(c.repository),'Source repository required');
  assert(typeof c.sourceRoot==='string'&&!c.sourceRoot.includes('..')&&!c.sourceRoot.includes('\\'),'Source path required');
  for(let p=path.resolve(c.outputPath);;p=path.dirname(p)){assert(!fs.lstatSync(p).isSymbolicLink(),'Linked input ancestor');if(p===path.dirname(p))break;}
  assert(Array.isArray(c.expectedFiles)&&c.expectedFiles.length>0,'Reviewed complete output manifest required');
  const actual=list(c.outputPath);assert.deepEqual(actual,c.expectedFiles.map(({path,bytes,sha256})=>({path,bytes,sha256})).sort((a,b)=>a.path.localeCompare(b.path)),'Output differs from reviewed manifest');
  for(const f of actual)assert(!f.path.includes('%')&&!f.path.includes('\\')&&!f.path.split('/').some(s=>s==='.'||s==='..'||s===''||/^(?:credentials?|secrets?|\.env|\.dev\.vars)(?:\.|$)/i.test(s)),'Unsafe output path');
 }
 const out=path.join(base,'release');assert(!fs.existsSync(out),'Fresh output only');fs.mkdirSync(out);
 const existing=new Set(read(path.join(base,'existing-domains.json')).map(x=>x.hostname));const sites={},rows=[];
 for(const c of candidates){
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.slug));assert(/^[a-f0-9]{40}$/.test(c.commit));
  const host=c.host||c.slug+'.glossquote.com';assert(host.endsWith('.glossquote.com')&&!existing.has(host));assert(!sites[host]);
  const origin='https://'+host;const dest=path.join(out,'assets','__sites',c.slug);const originals=list(c.outputPath);assert(originals.length<2000);
  for(const f of originals){
   assert(f.bytes<=25*1024*1024);assert(!/(?:^|\/)(?:\.git|node_modules|\.env|\.dev\.vars|secrets)(?:\/|$)/i.test(f.path));
   if(f.path.split('/').some(s=>s.startsWith('_'))||f.path==='robots.txt'||f.path==='sitemap.xml')continue;
   assert(/\.(html|js|mjs|css|json|svg|png|jpe?g|webp|gif|ico|txt|xml|wasm|woff2?|ttf|map|mp3|wav|ogg|mp4|webm)$/i.test(f.path),'Unexpected static output '+f.path);
   let bytes=fs.readFileSync(path.join(c.outputPath,f.path));
   if(f.path==='index.html'||f.path==='en/index.html'){
    let html=bytes.toString('utf8');const en=f.path.startsWith('en/');
    const descriptions={
     'option-matrix':en?'Create combinations of options and conditions in your browser to organize scenarios for testing or comparison.':'列出選項與條件，在瀏覽器中產生所有組合，整理需要測試或比較的情境。',
     'elliptical-corners':en?'Adjust horizontal and vertical corner radii, preview the shape, and copy CSS border-radius values.':'調整各角的水平與垂直圓角，預覽形狀並取得 CSS border-radius。'
    };
    if(!/<meta\b[^>]*name=["']description["']/i.test(html)&&descriptions[c.slug])html=html.replace(/<\/head>/i,'<meta name="description" content="'+esc(descriptions[c.slug])+'"></head>');
    bytes=Buffer.from(overlay(html,{origin,en}));
   }
   write(path.join(dest,f.path),bytes);
  }
  for(const p of ['index.html','en/index.html'])assert(fs.existsSync(path.join(dest,p)),c.slug+' missing '+p);
  write(path.join(dest,'inspection-notice.css'),'.gq-inspection-notice{display:none;box-sizing:border-box;padding:12px 20px;border-bottom:1px solid #d6d3ca;background:#fff8df;color:#252720;font:14px/1.5 system-ui,sans-serif}:root:lang(en) .gq-inspection-notice[lang="en"],:root:lang(zh) .gq-inspection-notice[lang="zh-Hant"]{display:block}.gq-inspection-notice p{margin:0 0 4px}.gq-inspection-notice a{color:#165f62;text-decoration:underline}\n');
  write(path.join(dest,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  write(path.join(dest,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/index.html</loc></url><url><loc>${origin}/en/index.html</loc></url></urlset>\n`);
  const source={repository:c.repository,commit:c.commit,path:c.sourceRoot,pullRequest:c.pullRequest||null};
  write(path.join(dest,'release.json'),JSON.stringify({slug:c.slug,source,kind:'public-inspection',functionalAcceptance:'PENDING',indexing:'noindex, follow',builtAt:new Date().toISOString()},null,2)+'\n');
  const hashes=new Set();for(const f of list(dest).filter(f=>f.path.endsWith('.html'))){const html=fs.readFileSync(path.join(dest,f.path),'utf8');for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(!/\bsrc\s*=/.test(m[1])&&m[2].trim())hashes.add("'sha256-"+createHash('sha256').update(m[2]).digest('base64')+"'");}}
  assert(typeof c.sourceCsp==='string' && !/[\r\n]/.test(c.sourceCsp),'Actual reviewed source CSP required');
  const csp=c.sourceCsp;
  for(const directive of ["default-src 'none'","connect-src 'none'","object-src 'none'","base-uri 'none'","frame-ancestors 'none'","form-action 'none'"])assert(csp.split(';').map(s=>s.trim()).includes(directive),'Missing strict source directive: '+directive);
  assert(!/'unsafe-inline'|'unsafe-eval'|'blob:'/.test(csp),'Unsafe or invalid source CSP');
  for(const hash of hashes)assert(csp.includes(hash),'Source CSP does not permit inline script '+hash);
  const headerRules=[];const headerFile=path.join(c.outputPath,'_headers');
  if(fs.existsSync(headerFile)){
   let rule=null;
   for(const line of fs.readFileSync(headerFile,'utf8').split(/\r?\n/)){
    if(!line.trim()||line.trim().startsWith('#'))continue;
    if(!/^\s/.test(line)){assert(line.startsWith('/')&&!line.includes(':'),'Only local header paths are supported');rule={pattern:line.trim(),headers:{}};headerRules.push(rule);}
    else{assert(rule,'Header without route');const i=line.indexOf(':');assert(i>0);const name=line.slice(0,i).trim(),value=line.slice(i+1).trim();assert(!/cookie|authorization|report-to|nel/i.test(name),'Unapproved response header');rule.headers[name]=value;}
   }
  }
  const files=list(dest);sites[host]={slug:c.slug,paths:files.map(x=>'/'+x.path),csp,headerRules};
  const title=p=>fs.readFileSync(path.join(dest,p),'utf8').match(/<title>([\s\S]*?)<\/title>/i)?.[1]||c.slug;
  rows.push({...c,host,origin,source,files,sourceOutputFiles:originals,titleZh:title('index.html'),titleEn:title('en/index.html'),status:'PREPARED_NOT_DEPLOYED'});
 }
 const directory='review';const directoryHost='review.glossquote.com';assert(!existing.has(directoryHost));
 for(const en of [false,true]){
  const title=en?'GlossQuote — Tools awaiting review':'GlossQuote — 工具檢查總表';
  const items=rows.map(r=>`<tr><td><a href="${r.origin}${en?'/en/index.html':'/index.html'}">${esc(en?r.titleEn:r.titleZh)}</a></td><td>${en?'Public inspection; function review pending':'公開檢查版；功能待驗'}</td><td>noindex</td><td><a href="https://github.com/${r.repository}/tree/${r.commit}/${r.sourceRoot==='.'?'':r.sourceRoot}">${r.commit.slice(0,8)}</a></td></tr>`).join('\n');
  let html=`<!doctype html><html lang="${en?'en':'zh-Hant'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><meta name="description" content="${en?'Inspect bilingual tool pages, release versions and SEO settings.':'檢查雙語工具頁、固定發布版本與 SEO 設定。'}"><link rel="stylesheet" href="/directory.css"></head><body><main><h1>${title}</h1><p>${en?`${rows.length} newly hosted tools. Deployment is separate from functional acceptance.`:`本批 ${rows.length} 款工具。上線供檢查與功能驗收分開記錄。`}</p><table><thead><tr><th>${en?'Tool':'工具'}</th><th>${en?'Status':'狀態'}</th><th>SEO</th><th>${en?'Source':'來源'}</th></tr></thead><tbody>${items}</tbody></table></main></body></html>`;
  write(path.join(out,'assets','__sites',directory,en?'en/index.html':'index.html'),overlay(html,{origin:'https://'+directoryHost,en}));
 }
 const dir=path.join(out,'assets','__sites',directory);write(path.join(dir,'directory.css'),'body{font:16px/1.6 system-ui,sans-serif;margin:0;background:#faf9f6;color:#26332f}main{max-width:1120px;margin:30px auto;padding:0 20px}table{border-collapse:collapse;width:100%;background:white}th,td{text-align:left;border-bottom:1px solid #d8ded8;padding:12px}a{color:#126a60}td:first-child{min-width:200px}main{overflow:auto}\n');
 write(path.join(dir,'inspection-notice.css'),fs.readFileSync(path.join(out,'assets','__sites',rows[0].slug,'inspection-notice.css')));
 write(path.join(dir,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://review.glossquote.com/sitemap.xml\n');
 write(path.join(dir,'sitemap.xml'),'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://review.glossquote.com/index.html</loc></url><url><loc>https://review.glossquote.com/en/index.html</loc></url></urlset>\n');
 sites[directoryHost]={slug:directory,paths:list(dir).map(f=>'/'+f.path),csp:"default-src 'self'; script-src 'none'; style-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"};
 write(path.join(out,'sites.json'),JSON.stringify(sites,null,2)+'\n');fs.copyFileSync(path.join(base,'worker.mjs'),path.join(out,'worker.mjs'));
 write(path.join(out,'wrangler.jsonc'),JSON.stringify({name:'glossquote-inspection-tools',main:'worker.mjs',compatibility_date:'2026-11-09',workers_dev:false,preview_urls:false,send_metrics:false,observability:{enabled:false,logs:{enabled:false,invocation_logs:false},traces:{enabled:false}},assets:{directory:'./assets',binding:'ASSETS',run_worker_first:true,html_handling:'none',not_found_handling:'none'},routes:Object.keys(sites).map(host=>({pattern:host+'/*',zone_name:'glossquote.com'}))},null,2)+'\n');
 const all=list(out);assert(all.length<20000);write(path.join(base,'prepared.json'),JSON.stringify({preparedAt:new Date().toISOString(),count:rows.length,rows,files:all},null,2)+'\n');
 console.log(JSON.stringify({prepared:rows.length,files:all.length,bytes:all.reduce((n,f)=>n+f.bytes,0),hosts:Object.keys(sites)}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)&&process.argv[2])prepare(read(process.argv[2]));
