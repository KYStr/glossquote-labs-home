import { mkdir,lstat,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { check } from './check.mjs';
import { ROOT,ASSETS,OUTPUT,SECURITY_HEADERS,inspectTree,contained,manifest,sha256 } from './assets.mjs';
export const ORIGIN='https://cuts.glossquote.com';
export const PRODUCTION=path.join(ROOT,'dist-production');
export const FAVICON_PATH='favicon.svg';
export const FAVICON_SVG='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#111410"/><path d="M8 7h17v5H13v10h7v-3h-4v-4h9v12H8z" fill="#c8f56a"/></svg>\n';
export const PRODUCTION_OUTPUT=Object.freeze([...OUTPUT,'_redirects',FAVICON_PATH]);
export const PAGES=Object.freeze([
  {path:'index.html',language:'zh-Hant',locale:'zh_TW',alternateLocale:'en_US',name:'長料裁切規劃',title:'長料裁切規劃｜Cut Planner by GlossQuote',description:'依固定長度長料、兩端修邊與鋸縫，使用可重現的 FFD 啟發式產生逐支裁切清單。這不是最少用料保證。'},
  {path:'en/index.html',language:'en',locale:'en_US',alternateLocale:'zh_TW',name:'Cut Planner',title:'Cut Planner — Plan cuts from fixed-length stock',description:'Plan a cut list from fixed-length stock, end trim and kerf with a repeatable FFD heuristic. The result is not a minimum-stock guarantee.'}
]);
export const REDIRECTS='/ /index.html 301\n/en/ /en/index.html 301\n';
export const ROBOTS=`User-agent: *\nAllow: /index.html$\nAllow: /en/index.html$\nAllow: /css/\nAllow: /js/\nAllow: /favicon.svg$\nAllow: /robots.txt$\nAllow: /sitemap.xml$\nDisallow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`;
export const SITEMAP=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map(p=>`  <url><loc>${ORIGIN}/${p.path}</loc></url>`).join('\n')}\n</urlset>\n`;
const htmlEscape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
export function applicationData(page){return JSON.stringify({'@context':'https://schema.org','@type':'WebApplication',name:page.name,url:`${ORIGIN}/${page.path}`,inLanguage:page.language,applicationCategory:'UtilitiesApplication',operatingSystem:'Any',browserRequirements:'Requires JavaScript',isAccessibleForFree:true,description:page.description});}
export const scriptHash=text=>`'sha256-${createHash('sha256').update(text).digest('base64')}'`;
export const cspFor=page=>SECURITY_HEADERS['Content-Security-Policy'].replace("script-src 'self'",`script-src 'self' ${scriptHash(applicationData(page))}`);
export function headersFile(){
  return `/*\n${Object.entries(SECURITY_HEADERS).map(([name,value])=>`  ${name}: ${value}`).join('\n')}\n`+
    PAGES.map(page=>`\n/${page.path}\n  ! X-Robots-Tag\n  X-Robots-Tag: index,follow\n  ! Content-Security-Policy\n  Content-Security-Policy: ${cspFor(page)}\n`).join('');
}
export function parseHeaders(text){
  const rules=[];let current=null;
  for(const line of text.split('\n')){
    if(!line.trim()||line.trimStart().startsWith('#'))continue;
    if(!/^\s/.test(line)){if(!/^\/(?:[^\s]*)$/.test(line))throw Error('Invalid header rule');current={path:line,operations:[]};rules.push(current);}
    else{
      if(!current)throw Error('Header without path');const value=line.trim();
      if(value.startsWith('! ')){const name=value.slice(2).toLowerCase();if(!/^[a-z0-9-]+$/.test(name))throw Error('Invalid header detachment');current.operations.push({name,remove:true});}
      else{const match=/^([A-Za-z0-9-]+): (.+)$/.exec(value);if(!match)throw Error('Invalid header');current.operations.push({name:match[1].toLowerCase(),value:match[2]});}
    }
    if(line.length>2000)throw Error('Header line too long');
  }
  return rules;
}
function pathMatches(rule,pathname){return rule==='/*'||rule===pathname;}
export function headerModel(text,pathname){
  const headers={};
  for(const rule of parseHeaders(text))if(pathMatches(rule.path,pathname))for(const op of rule.operations){
    if(op.remove)delete headers[op.name];else headers[op.name]=headers[op.name]===undefined?op.value:headers[op.name]+', '+op.value;
  }
  return headers;
}
export function robotsAllows(text,pathname){
  let active=false,best=-1,allowed=true;
  for(const line of text.split('\n')){
    const match=/^([^:#]+):\s*(.*)$/.exec(line);if(!match)continue;const name=match[1].trim().toLowerCase(),value=match[2].trim();
    if(name==='user-agent'){active=value==='*';continue;}if(!active||!['allow','disallow'].includes(name)||!value)continue;
    const end=value.endsWith('$'),pattern=end?value.slice(0,-1):value;
    const expression='^'+pattern.split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+(end?'$':'');
    if(new RegExp(expression).test(pathname)){const specificity=pattern.replaceAll('*','').length;if(specificity>best||(specificity===best&&name==='allow')){best=specificity;allowed=name==='allow';}}
  }
  return allowed;
}
export async function assertM1Unchanged(source){
  const lock=JSON.parse(await readFile(path.join(ROOT,'scripts/m1-asset-lock.json'),'utf8'));
  assert.deepEqual(lock.files.map(x=>x.path).sort(),[...ASSETS].sort());
  for(const entry of lock.files){assert.equal(source.get(entry.path).length,entry.bytes,`M1 byte count changed: ${entry.path}`);assert.equal(sha256(source.get(entry.path)),entry.sha256,`M1 source changed: ${entry.path}`);}
  return lock;
}
export function expectedProduction(source){
  const files=new Map(source);
  for(const page of PAGES){
    const html=source.get(page.path).toString(),headEnd=html.indexOf('</head>');assert.ok(headEnd>=0);assert.equal(html.indexOf('</head>',headEnd+1),-1);
    const head=html.slice(0,headEnd);assert.equal((head.match(/name="robots" content="noindex,nofollow"/g)??[]).length,1);
    const additions=[`<link rel="icon" type="image/svg+xml" sizes="any" href="/${FAVICON_PATH}">`,`<meta property="og:type" content="website">`,`<meta property="og:title" content="${htmlEscape(page.title)}">`,`<meta property="og:description" content="${htmlEscape(page.description)}">`,`<meta property="og:url" content="${ORIGIN}/${page.path}">`,`<meta property="og:locale" content="${page.locale}">`,`<meta property="og:locale:alternate" content="${page.alternateLocale}">`,`<meta property="og:site_name" content="Gloss Tools by GlossQuote">`,`<script type="application/ld+json">${applicationData(page)}</script>`].join('\n');
    files.set(page.path,Buffer.from(head.replace('name="robots" content="noindex,nofollow"','name="robots" content="index,follow"')+additions+'\n'+html.slice(headEnd)));
  }
  files.set('robots.txt',Buffer.from(ROBOTS));files.set('sitemap.xml',Buffer.from(SITEMAP));files.set('_headers',Buffer.from(headersFile()));files.set('_redirects',Buffer.from(REDIRECTS));files.set(FAVICON_PATH,Buffer.from(FAVICON_SVG));
  const m={...manifest(files),mode:'production'};files.set('asset-manifest.json',Buffer.from(JSON.stringify(m,null,2)+'\n'));return files;
}
export function validateProduction(files,source){
  assert.deepEqual([...files.keys()].sort(),[...PRODUCTION_OUTPUT].sort());const rules=files.get('_headers').toString();
  for(const page of PAGES){
    const html=files.get(page.path).toString(),preview=source.get(page.path).toString(),canonical=`${ORIGIN}/${page.path}`;
    assert.equal(html.slice(html.indexOf('</head>')),preview.slice(preview.indexOf('</head>')),'M1 body/UI bytes changed');
    assert.ok(html.includes(`<html lang="${page.language}">`)&&html.includes(`<title>${page.title}</title>`));
    assert.ok(html.includes(`name="description" content="${htmlEscape(page.description)}"`));assert.ok(html.includes('name="robots" content="index,follow"'));assert.ok(!html.includes('name="robots" content="noindex'));
    assert.ok(html.includes(`rel="canonical" href="${canonical}"`));for(const alt of PAGES)assert.ok(html.includes(`rel="alternate" hreflang="${alt.language}" href="${ORIGIN}/${alt.path}"`));assert.ok(html.includes(`hreflang="x-default" href="${ORIGIN}/index.html"`));
    assert.ok(html.includes(`property="og:url" content="${canonical}"`));
    assert.equal((html.match(/rel="icon"/g)??[]).length,1);assert.ok(html.includes(`<link rel="icon" type="image/svg+xml" sizes="any" href="/${FAVICON_PATH}">`));
    const scripts=[...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)];assert.equal(scripts.length,1);assert.equal(scripts[0][1],applicationData(page));assert.equal(JSON.parse(scripts[0][1]).inLanguage,page.language);
    const headers=headerModel(rules,'/'+page.path);assert.equal(headers['x-robots-tag'],'index,follow');assert.equal(headers['content-security-policy'],cspFor(page));assert.ok(!headers['content-security-policy'].includes('unsafe-'));
    assert.ok(headers['content-security-policy'].includes(scriptHash(scripts[0][1])));assert.deepEqual(headers['content-security-policy'].split(';').map(s=>s.trim()).filter(s=>s.startsWith('img-src ')),["img-src 'self'"]);assert.equal(robotsAllows(files.get('robots.txt').toString(),'/'+page.path),true);
  }
  for(const file of ASSETS.filter(name=>name.endsWith('.mjs')||name.endsWith('.css'))){assert.ok(files.get(file).equals(source.get(file)));assert.equal(robotsAllows(files.get('robots.txt').toString(),'/'+file),true);}
  assert.ok(files.get('404.html').equals(source.get('404.html')));assert.ok(!files.get('404.html').toString().includes('cut-form'));assert.ok(files.get('404.html').toString().includes('noindex,nofollow'));
  assert.ok(files.get(FAVICON_PATH).equals(Buffer.from(FAVICON_SVG)));assert.ok(!/<(?:script|style|image|use|foreignObject|animate)\b|\bon[a-z]+\s*=|\bhref\s*=|url\s*\(|<!DOCTYPE|<!ENTITY/i.test(FAVICON_SVG));assert.equal(robotsAllows(files.get('robots.txt').toString(),'/'+FAVICON_PATH),true);
  for(const pathname of ['/','/en/','/404.html','/missing','/index.html/','/js/app.mjs/']){assert.equal(headerModel(rules,pathname)['x-robots-tag'],'noindex,nofollow');assert.equal(robotsAllows(files.get('robots.txt').toString(),pathname),pathname==='/js/app.mjs/');}
  assert.equal(files.get('sitemap.xml').toString(),SITEMAP);assert.equal(files.get('_redirects').toString(),REDIRECTS);
}
export async function buildProduction(){
  const source=await check();await assertM1Unchanged(source);const files=expectedProduction(source);validateProduction(files,source);
  assert.equal(path.resolve(PRODUCTION),path.join(ROOT,'dist-production'));
  try{await inspectTree(PRODUCTION,PRODUCTION_OUTPUT,false);}catch(error){if(error.code!=='ENOENT')throw error;try{await lstat(PRODUCTION);throw Error('Unsafe incomplete production output');}catch(missing){if(missing.code!=='ENOENT')throw missing;}}
  await mkdir(PRODUCTION,{recursive:true});for(const [name,bytes]of files){const destination=contained(PRODUCTION,name);await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,bytes);}return files;
}
export async function checkProduction(){
  const source=await check();await assertM1Unchanged(source);const files=await inspectTree(PRODUCTION,PRODUCTION_OUTPUT),expected=expectedProduction(source);
  for(const [name,bytes]of expected)assert.ok(files.get(name).equals(bytes),`Stale production output: ${name}`);validateProduction(files,source);return files;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv.length!==3||!['build','check'].includes(process.argv[2]))throw Error('Usage: production.mjs build|check');
  const files=await (process.argv[2]==='build'?buildProduction():checkProduction());console.log(`PASS production ${process.argv[2]}: ${files.size} files; exact M1 public bytes; canonical SEO/header model`);
}
