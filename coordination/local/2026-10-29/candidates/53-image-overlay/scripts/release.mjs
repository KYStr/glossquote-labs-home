import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, PUBLIC_FILES } from './files.mjs';
import { M1_PUBLIC_FILES } from './release-source.mjs';
import { deploymentConfig } from './release-config.mjs';

export const ORIGIN = 'https://image-proof.glossquote.com';
export const TOOL_SLUG = 'image-overlay';
export const REDIRECTS = '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';
export const SITE_FILES = Object.freeze([...new Set([...PUBLIC_FILES,'robots.txt','_headers','sitemap.xml','_redirects'])].sort());
const CONTAINER_FILES = Object.freeze(['manifest.json',...SITE_FILES.map(path=>`site/${path}`)].sort());
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const reject = code => { throw new Error(code); };
const utf8 = bytes => new TextDecoder('utf-8',{fatal:true}).decode(bytes);

// Inspect every entry, including empty unknown directories. Never follow links,
// and never derive a filesystem path from an artifact manifest's untrusted fields.
async function closedFiles(root,allowed) {
  const directories=new Set(allowed.flatMap(path=>{
    const parts=path.split('/');
    return parts.slice(0,-1).map((_,index)=>parts.slice(0,index+1).join('/'));
  }));
  const expected=new Set(allowed), found=[];
  async function walk(path,prefix='') {
    const stat=await lstat(path);
    if(stat.isSymbolicLink() || !stat.isDirectory()) reject('RELEASE_UNSAFE_DIRECTORY');
    for(const name of (await readdir(path)).sort()) {
      const relative=prefix?`${prefix}/${name}`:name, target=join(path,name), item=await lstat(target);
      if(item.isSymbolicLink()) reject('RELEASE_LINK');
      if(item.isDirectory()) {
        if(!directories.has(relative)) reject('RELEASE_EXTRA_DIRECTORY');
        await walk(target,relative);
      } else if(item.isFile() && expected.has(relative)) found.push(relative);
      else reject('RELEASE_EXTRA_FILE');
    }
  }
  await walk(root);
  found.sort();
  if(found.length!==allowed.length || found.some((path,index)=>path!==[...allowed].sort()[index])) reject('RELEASE_MISSING_FILE');
  return found;
}
function describe(files) {
  return [...files.keys()].sort().map(path=>({path,bytes:files.get(path).length,sha256:sha256(files.get(path))}));
}
async function publicSource(root) {
  const stat=await lstat(root);
  if(stat.isSymbolicLink() || !stat.isDirectory()) reject('RELEASE_UNSAFE_ROOT');
  const paths=await closedFiles(join(root,'public'),[...PUBLIC_FILES].sort());
  if(paths.join('\n')!==M1_PUBLIC_FILES.map(entry=>entry.path).join('\n')) reject('RELEASE_SOURCE_LIST');
  const source=new Map();
  for(const entry of M1_PUBLIC_FILES) {
    const bytes=await readFile(join(root,'public',entry.path));
    if(bytes.length!==entry.bytes || sha256(bytes)!==entry.sha256) reject('RELEASE_SOURCE_CHANGED');
    source.set(entry.path,bytes);
  }
  return source;
}
function headParts(html) {
  if(html.split('<head>').length!==2 || html.split('</head>').length!==2) reject('RELEASE_HEAD_INVALID');
  const start=html.indexOf('<head>')+6, end=html.indexOf('</head>');
  if(end<start) reject('RELEASE_HEAD_INVALID');
  return {prefix:html.slice(0,start),head:html.slice(start,end),suffix:html.slice(end)};
}
function pageBytes(source,path) {
  const html=utf8(source), {prefix,head,suffix}=headParts(html);
  const robots='<meta name="robots" content="noindex,nofollow">';
  if(head.split(robots).length!==2 || /rel="(?:canonical|alternate)"/.test(head)) reject('RELEASE_PREVIEW_SEO_INVALID');
  const links=[
    `<link rel="canonical" href="${ORIGIN}/${path}">`,
    `<link rel="alternate" hreflang="zh-Hant" href="${ORIGIN}/index.html">`,
    `<link rel="alternate" hreflang="en" href="${ORIGIN}/en/index.html">`,
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/index.html">`
  ].map(tag=>`  ${tag}\n`).join('');
  return Buffer.from(prefix+head.replace(robots,'<meta name="robots" content="index,follow">')+links+suffix,'utf8');
}
// Semantic checks are additional to exact byte reconstruction. Source is pinned;
// this deliberately small quoted-attribute reader only parses the fixed head tags.
function headTags(html) {
  const tags=[];
  for(const match of headParts(html).head.matchAll(/<(meta|link)\b([^<>]*)>/g)) {
    const attributes=Object.create(null);
    let remainder=match[2];
    for(const attribute of match[2].matchAll(/\b([a-z-]+)="([^"<>]*)"/g)) {
      if(Object.hasOwn(attributes,attribute[1])) reject('RELEASE_DUPLICATE_ATTRIBUTE');
      attributes[attribute[1]]=attribute[2]; remainder=remainder.replace(attribute[0],'');
    }
    if(remainder.trim()) reject('RELEASE_HEAD_ATTRIBUTE');
    tags.push({tag:match[1],attributes});
  }
  return tags;
}
function validatePage(bytes,path,lang) {
  const html=utf8(bytes), tags=headTags(html);
  if(!html.includes(`<html lang="${lang}">`)) reject('RELEASE_LANGUAGE');
  const robots=tags.filter(tag=>tag.tag==='meta'&&tag.attributes.name==='robots');
  if(robots.length!==1 || robots[0].attributes.content!=='index,follow') reject('RELEASE_ROBOTS');
  const canonical=tags.filter(tag=>tag.tag==='link'&&tag.attributes.rel==='canonical');
  if(canonical.length!==1 || canonical[0].attributes.href!==`${ORIGIN}/${path}`) reject('RELEASE_CANONICAL');
  const alternate=tags.filter(tag=>tag.tag==='link'&&tag.attributes.rel==='alternate');
  const expected=new Map([['zh-Hant',`${ORIGIN}/index.html`],['en',`${ORIGIN}/en/index.html`],['x-default',`${ORIGIN}/index.html`]]);
  if(alternate.length!==3) reject('RELEASE_ALTERNATES');
  for(const tag of alternate) {
    if(!expected.has(tag.attributes.hreflang) || expected.get(tag.attributes.hreflang)!==tag.attributes.href) reject('RELEASE_ALTERNATES');
    expected.delete(tag.attributes.hreflang);
  }
  if(expected.size) reject('RELEASE_ALTERNATES');
}
export async function expectedRelease(root=ROOT) {
  if(Number(process.versions.node.split('.')[0])<24) reject('NODE_24_REQUIRED');
  const origin=new URL(ORIGIN);
  if(origin.protocol!=='https:' || origin.origin!==ORIGIN || origin.pathname!=='/' || origin.port || origin.username || origin.password || origin.search || origin.hash || origin.hostname!=='image-proof.glossquote.com') reject('RELEASE_ORIGIN');
  root=resolve(root);
  const source=await publicSource(root), config=await deploymentConfig(root), files=new Map(source);
  for(const [path,lang] of [['index.html','zh-Hant'],['en/index.html','en']]) {
    const bytes=pageBytes(source.get(path),path); validatePage(bytes,path,lang); files.set(path,bytes);
  }
  const headers=utf8(source.get('_headers')), robotsHeader=/^([ \t]*X-Robots-Tag: )noindex, nofollow(?=\r?$)/gm;
  if([...headers.matchAll(robotsHeader)].length!==1) reject('RELEASE_HEADERS');
  files.set('_headers',Buffer.from(headers.replace(robotsHeader,'$1index, follow'),'utf8'));
  files.set('robots.txt',Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`,'utf8'));
  files.set('sitemap.xml',Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${ORIGIN}/index.html</loc></url>\n  <url><loc>${ORIGIN}/en/index.html</loc></url>\n</urlset>\n`,'utf8'));
  files.set('_redirects',Buffer.from(REDIRECTS,'utf8'));
  const manifest={schemaVersion:2,mode:'release-candidate',origin:ORIGIN,toolSlug:TOOL_SLUG,deploymentConfig:{path:'wrangler.jsonc',bytes:config.length,sha256:sha256(config)},files:describe(files),sourceFiles:describe(source)};
  return {files,manifest,manifestBytes:Buffer.from(`${JSON.stringify(manifest,null,2)}\n`,'utf8')};
}
async function verifyArtifacts(root,expected) {
  const container=join(root,'release-artifacts');
  await closedFiles(container,CONTAINER_FILES);
  for(const path of SITE_FILES) {
    const actual=await readFile(join(container,'site',path));
    if(!actual.equals(expected.files.get(path))) reject('RELEASE_ASSET_CHANGED');
  }
  const manifest=await readFile(join(container,'manifest.json'));
  // Exact canonical JSON also rejects wrong schema, origins, paths, duplicate
  // entries/keys, unknown fields, and forged hashes, without trusting the record.
  if(!manifest.equals(expected.manifestBytes)) reject('RELEASE_MANIFEST_CHANGED');
  return {status:'PASS',mode:'release-candidate',origin:ORIGIN,toolSlug:TOOL_SLUG,files:SITE_FILES.length,bytes:expected.manifest.files.reduce((sum,file)=>sum+file.bytes,0),manifestSha256:sha256(manifest),scope:'offline bytes/SEO/configuration only; not browser, hosting or release approval'};
}
export async function checkRelease(root=ROOT) {
  root=resolve(root); const expected=await expectedRelease(root);
  return verifyArtifacts(root,expected);
}
export async function buildRelease(root=ROOT) {
  root=resolve(root); const expected=await expectedRelease(root), container=join(root,'release-artifacts');
  let exists;
  try { await lstat(container); exists=true; }
  catch(error) { if(error.code==='ENOENT') exists=false; else throw error; }
  if(exists) {
    // Rebuild is a verified no-op. Unknown, modified, partial or unowned outputs
    // are refused before any write. No overwrite, recursive delete or repair.
    return verifyArtifacts(root,expected);
  }
  await mkdir(container);
  const directories=[...new Set(CONTAINER_FILES.flatMap(path=>{
    const parts=path.split('/'); return parts.slice(0,-1).map((_,index)=>parts.slice(0,index+1).join('/'));
  }))].sort((a,b)=>a.split('/').length-b.split('/').length || (a<b?-1:a>b?1:0));
  for(const path of directories) await mkdir(join(container,path));
  for(const path of SITE_FILES) await writeFile(join(container,'site',path),expected.files.get(path),{flag:'wx'});
  await writeFile(join(container,'manifest.json'),expected.manifestBytes,{flag:'wx'});
  return verifyArtifacts(root,expected);
}
export function parseReleaseArgs(args) {
  if(args.length!==1 || !['build','check'].includes(args[0])) reject('RELEASE_USAGE');
  return args[0];
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const mode=parseReleaseArgs(process.argv.slice(2));
    const result=await (mode==='build'?buildRelease():checkRelease());
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch(error) {
    const code=/^(?:RELEASE_[A-Z_]+|NODE_24_REQUIRED)$/.test(error.message)?error.message:'RELEASE_IO';
    process.stderr.write(code==='RELEASE_USAGE'?'Usage: node scripts/release.mjs <build|check>\n':`Release preparation failed: ${code}\n`);
    process.exitCode=1;
  }
}
