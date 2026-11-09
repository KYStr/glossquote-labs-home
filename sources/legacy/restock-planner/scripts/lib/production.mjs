import path from 'node:path';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { ROOT, ASSETS, CSP, inventory, exists } from './files.mjs';
import { validatePublic, validateText } from './validate.mjs';

export const ORIGIN = 'https://restock.glossquote.com';
export const PRODUCTION_ASSETS = Object.freeze([...ASSETS, '404.html', 'robots.txt', 'sitemap.xml', '_headers', 'favicon.svg']);
export const JSONLD_PATTERN = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
const languages = [['index.html','zh-Hant'],['en/index.html','en']];
const checksum = bytes => createHash('sha256').update(bytes).digest('base64');
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function faqFromHtml(html) {
  const section = html.split('<section class="reading faq"')[1]?.split('</section>')[0];
  if (!section) throw new Error('Visible FAQ absent');
  const rows = [...section.matchAll(/<details><summary>([^<]+)<\/summary><p>([^<]+)<\/p><\/details>/g)].map(match => ({ '@type':'Question', name:match[1], acceptedAnswer:{'@type':'Answer',text:match[2]} }));
  if (rows.length !== 3) throw new Error('Expected three complete visible FAQ entries');
  return rows;
}
function jsonLd(html, language, file) {
  const description = html.match(/<meta name="description" content="([^"]+)">/)[1];
  return { '@context':'https://schema.org', '@graph':[
    { '@type':'WebApplication', name:language==='en'?'Restock Quantity Planner':'補貨數量試算', url:`${ORIGIN}/${file}`, description, inLanguage:language, applicationCategory:'UtilitiesApplication', operatingSystem:'Any', browserRequirements:'Requires JavaScript', isAccessibleForFree:true },
    { '@type':'FAQPage', inLanguage:language, mainEntity:faqFromHtml(html) },
  ] };
}
export function policyFor(payloads) {
  return CSP.replace("script-src 'self'", `script-src 'self' ${payloads.map(payload=>`'sha256-${checksum(payload)}'`).join(' ')}`);
}
export function parseHeaders(text) {
  const rules=[];let current;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (line.length>2000) throw new Error('Header line exceeds platform bound');
    if (!/^\s/.test(line)) {
      if (!line.startsWith('/') || (line.match(/\*/g)||[]).length>1 || line.includes('?') || line.includes('#')) throw new Error('Unsupported header pattern');
      current={pattern:line,operations:[]};rules.push(current);if(rules.length>100)throw new Error('Header rule limit');
    } else {
      if(!current)throw new Error('Header without path');
      const remove=line.trim().match(/^! ([A-Za-z-]+)$/);
      const attach=line.trim().match(/^([A-Za-z-]+): (.+)$/);
      if(remove)current.operations.push({name:remove[1].toLowerCase(),remove:true});
      else if(attach)current.operations.push({name:attach[1].toLowerCase(),value:attach[2]});
      else throw new Error('Invalid header operation');
    }
  }
  return rules;
}
export function headersFor(rules,target) {
  const pathname=target.split('?')[0];const headers={};
  for(const rule of rules)if(new RegExp('^'+rule.pattern.split('*').map(escape).join('.*')+'$').test(pathname))for(const operation of rule.operations) {
    if(operation.remove)delete headers[operation.name];
    else headers[operation.name]=headers[operation.name]?`${headers[operation.name]}, ${operation.value}`:operation.value;
  }
  return headers;
}
export function robotsAllows(text,target) {
  let applies=false;const matches=[];
  for(const raw of text.split('\n')) {
    const line=raw.split('#')[0].trim();if(!line)continue;
    const separator=line.indexOf(':');if(separator<0)throw new Error('Invalid robots directive');
    const name=line.slice(0,separator).toLowerCase(),value=line.slice(separator+1).trim();
    if(name==='user-agent'){applies=value==='*';continue;}
    if(!applies||!['allow','disallow'].includes(name)||!value)continue;
    const anchored=value.endsWith('$'),pattern=anchored?value.slice(0,-1):value;
    if(new RegExp('^'+pattern.split('*').map(escape).join('.*')+(anchored?'$':'')).test(target))matches.push({allow:name==='allow',length:pattern.replaceAll('*','').length});
  }
  if(!matches.length)return true;
  const longest=Math.max(...matches.map(row=>row.length));return matches.filter(row=>row.length===longest).some(row=>row.allow);
}
export async function productionContents(root=ROOT) {
  await validatePublic(path.join(root,'public'));
  const output=new Map();const payloads=[];
  for(const file of ASSETS)output.set(file,await readFile(path.join(root,'public',file)));
  for(const [file,language] of languages) {
    let html=output.get(file).toString('utf8');
    const payload=JSON.stringify(jsonLd(html,language,file));payloads.push(payload);
    const seo=[`  <link rel="icon" type="image/svg+xml" href="/favicon.svg">`,`  <link rel="canonical" href="${ORIGIN}/${file}">`,`  <link rel="alternate" hreflang="zh-Hant" href="${ORIGIN}/index.html">`,`  <link rel="alternate" hreflang="en" href="${ORIGIN}/en/index.html">`,`  <link rel="alternate" hreflang="x-default" href="${ORIGIN}/index.html">`,`  <script type="application/ld+json">${payload}</script>`].join('\n');
    html=html.replace('<meta name="robots" content="noindex,nofollow">','<meta name="robots" content="index,follow">').replace('</head>',`${seo}\n</head>`).replace(' · 本機候選，尚未發布。','').replace(' · Local candidate, not published.','');
    output.set(file,Buffer.from(html));
  }
  output.set('404.html',Buffer.from('<!doctype html>\n<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>找不到頁面 / Page not found | Gloss Tools</title><link rel="stylesheet" href="/styles/tokens.css"><link rel="stylesheet" href="/styles/app.css"></head><body><main><h1>找不到頁面</h1><p lang="en">This page could not be found.</p><p><a href="/index.html">補貨數量試算</a></p><p><a href="/en/index.html" lang="en">Restock Quantity Planner</a></p></main></body></html>\n'));
  output.set('favicon.svg',await readFile(path.join(root,'scripts/assets/favicon.svg')));
  output.set('robots.txt',Buffer.from(`User-agent: *\nDisallow: /\nAllow: /index.html$\nAllow: /en/index.html$\nAllow: /js/\nAllow: /styles/\nAllow: /favicon.svg$\nAllow: /robots.txt$\nAllow: /sitemap.xml$\nSitemap: ${ORIGIN}/sitemap.xml\n`));
  output.set('sitemap.xml',Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${ORIGIN}/index.html</loc></url>\n  <url><loc>${ORIGIN}/en/index.html</loc></url>\n</urlset>\n`));
  // One global CSP containing only the two exact inert JSON-LD payload hashes.
  // Detach default noindex for the two pages; their HTML supplies index,follow.
  output.set('_headers',Buffer.from(`/*\n  Content-Security-Policy: ${policyFor(payloads)}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Cache-Control: no-store\n  X-Robots-Tag: noindex, nofollow\n\n/index.html\n  ! X-Robots-Tag\n\n/en/index.html\n  ! X-Robots-Tag\n`));
  return output;
}
export async function buildProduction(root=ROOT) {
  const before=await inventory(path.join(root,'public'));const preview=await exists(path.join(root,'dist'))?await inventory(path.join(root,'dist')):null;
  if(preview)assert.deepEqual(preview,before,'Existing M1 dist must match public');
  const output=await productionContents(root),destination=path.join(root,'dist-production');
  if(await exists(destination))await inventory(destination,PRODUCTION_ASSETS,{allowMissing:true});
  for(const [file,bytes] of output){await mkdir(path.dirname(path.join(destination,file)),{recursive:true});await writeFile(path.join(destination,file),bytes);}
  assert.deepEqual(await inventory(path.join(root,'public')),before);
  if(preview)assert.deepEqual(await inventory(path.join(root,'dist')),preview);
  return checkProduction(root);
}
export async function checkProduction(root=ROOT) {
  const directory=path.join(root,'dist-production'),files=await inventory(directory,PRODUCTION_ASSETS),payloads=[];
  for(const [file,language] of languages) {
    const html=await readFile(path.join(directory,file),'utf8');
    assert.equal((html.match(/<meta name="robots" content="index,follow">/g)||[]).length,1);
    assert.equal(html.includes('noindex'),false);assert.ok(html.includes(`<html lang="${language}">`));
    assert.equal((html.match(/<link rel="icon" type="image\/svg\+xml" href="\/favicon.svg">/g)||[]).length,1);
    const canonical=[...html.matchAll(/<link rel="canonical" href="([^"]+)">/g)];assert.equal(canonical.length,1);assert.equal(canonical[0][1],`${ORIGIN}/${file}`);
    const alternates=[...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(row=>[row[1],row[2]]);
    assert.deepEqual(alternates,[['zh-Hant',`${ORIGIN}/index.html`],['en',`${ORIGIN}/en/index.html`],['x-default',`${ORIGIN}/index.html`]]);
    const scripts=[...html.matchAll(JSONLD_PATTERN)];assert.equal(scripts.length,1);const payload=scripts[0][1];payloads.push(payload);
    assert.deepEqual(JSON.parse(payload),jsonLd(html,language,file));
    const reduced=html.replace(/<link rel="(?:canonical|alternate|icon)"[^>]*>\n?/g,'').replace(JSONLD_PATTERN,'').replace('<meta name="robots" content="index,follow">','<meta name="robots" content="noindex,nofollow">');
    validateText(file,reduced);
  }
  for(const file of ASSETS.filter(file=>!file.endsWith('.html')))assert.deepEqual(await readFile(path.join(directory,file)),await readFile(path.join(root,'public',file)),`Runtime differs: ${file}`);
  const notFound=await readFile(path.join(directory,'404.html'),'utf8');assert.ok(notFound.includes('<meta name="robots" content="noindex,nofollow">'));validateText('404.html',notFound);
  const icon=await readFile(path.join(directory,'favicon.svg'),'utf8');assert.ok(icon.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));assert.equal(/<(?:script|foreignObject|image|use|style)\b|\s(?:on[a-z]+|href|xlink:href)\s*=/i.test(icon),false);
  const headersText=await readFile(path.join(directory,'_headers'),'utf8'),rules=parseHeaders(headersText),expectedPolicy=policyFor(payloads);
  for(const target of ['/index.html','/en/index.html','/404.html','/unknown',...ASSETS.filter(file=>!file.endsWith('.html')).map(file=>'/'+file)]) {
    const headers=headersFor(rules,target);assert.equal(headers['content-security-policy'],expectedPolicy);assert.equal(headers['x-content-type-options'],'nosniff');assert.equal(headers['referrer-policy'],'no-referrer');assert.equal(headers['cache-control'],'no-store');
    if(['/index.html','/en/index.html'].includes(target))assert.equal(headers['x-robots-tag'],undefined);else assert.equal(headers['x-robots-tag'],'noindex, nofollow');
    assert.equal(/unsafe-inline|unsafe-eval/.test(headers['content-security-policy']),false);
  }
  const robots=await readFile(path.join(directory,'robots.txt'),'utf8');assert.deepEqual([...robots.matchAll(/^Sitemap: (.+)$/gm)].map(row=>row[1]),[`${ORIGIN}/sitemap.xml`]);
  for(const file of [...ASSETS,'robots.txt','sitemap.xml','favicon.svg'])assert.equal(robotsAllows(robots,'/'+file),true,`Robots blocks ${file}`);
  for(const target of ['/','/unknown','/404.html','/index.html-extra','/en/index.htmlx'])assert.equal(robotsAllows(robots,target),false,`Robots unexpectedly allows ${target}`);
  const sitemap=await readFile(path.join(directory,'sitemap.xml'),'utf8');assert.ok(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(row=>row[1]),[`${ORIGIN}/index.html`,`${ORIGIN}/en/index.html`]);
  const expectedContents=await productionContents(root);
  for(const [file,expected] of expectedContents)assert.deepEqual(await readFile(path.join(directory,file)),expected,`Production byte drift: ${file}`);
  return {files,headerRules:rules,payloadHashes:payloads.map(checksum),csp:expectedPolicy};
}
