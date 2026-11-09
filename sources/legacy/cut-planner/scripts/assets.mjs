import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const ROOT = path.resolve(fileURLToPath(new URL('..',import.meta.url)));
export const PUBLIC = path.join(ROOT,'public');
export const DIST = path.join(ROOT,'dist');
export const ASSETS = Object.freeze(['index.html','en/index.html','404.html','css/app.css','js/boot.mjs','js/app.mjs','js/i18n.mjs','js/render.mjs','js/session.mjs','js/core/cut-planner.mjs','robots.txt','sitemap.xml']);
export const OUTPUT = Object.freeze([...ASSETS,'_headers','asset-manifest.json']);
export const MIME = Object.freeze({'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.txt':'text/plain;charset=utf-8','.xml':'application/xml;charset=utf-8','.json':'application/json;charset=utf-8'});
export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; worker-src 'none'; manifest-src 'none'",
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=()',
  'X-Frame-Options':'DENY','X-Robots-Tag':'noindex,nofollow','Cache-Control':'no-store'
});
export const HEADERS_TEXT=`/*\n${Object.entries(SECURITY_HEADERS).map(([k,v])=>`  ${k}: ${v}`).join('\n')}\n`;
export const sha256 = data=>createHash('sha256').update(data).digest('hex');
export function assertNode(){if(Number(process.versions.node.split('.')[0])<24)throw Error('Node.js >=24 is required');}
export function contained(root,relative){const absolute=path.resolve(root,relative);if(relative.includes('\\')||path.isAbsolute(relative)||!absolute.startsWith(`${path.resolve(root)}${path.sep}`))throw Error('unsafe asset path');return absolute;}
export async function inspectTree(root,allowed,requireAll=true){
  const rootStat=await lstat(root);if(!rootStat.isDirectory()||rootStat.isSymbolicLink())throw Error('unsafe asset root');
  const resolved=await realpath(root);if(path.resolve(resolved).toLowerCase()!==path.resolve(root).toLowerCase())throw Error('redirected asset root');
  const allow=new Set(allowed),dirs=new Set(allowed.flatMap(file=>{const parts=file.split('/');return parts.slice(0,-1).map((_,i)=>parts.slice(0,i+1).join('/'));}));
  const files=new Map();let total=0;
  async function walk(relative=''){
    for(const entry of await readdir(relative?contained(root,relative):root,{withFileTypes:true})){
      const name=relative?`${relative}/${entry.name}`:entry.name, absolute=contained(root,name),stat=await lstat(absolute);
      if(stat.isSymbolicLink())throw Error('linked asset rejected');
      if(stat.isDirectory()){if(!dirs.has(name))throw Error('unknown asset directory');await walk(name);}
      else {
        if(!stat.isFile()||!allow.has(name))throw Error('unknown asset file');
        if(stat.nlink!==1)throw Error('hardlinked asset rejected');
        if(stat.size>1048576)throw Error('asset exceeds size cap');
        total+=stat.size;if(total>2097152)throw Error('asset tree exceeds size cap');
        files.set(name,await readFile(absolute));
      }
    }
  }
  await walk();if(requireAll&&allowed.some(name=>!files.has(name)))throw Error('missing required asset');return files;
}
export function manifest(files){return {schemaVersion:1,mode:'preview',files:[...files].sort(([a],[b])=>a.localeCompare(b,'en')).map(([name,bytes])=>({path:name,bytes:bytes.length,sha256:sha256(bytes)}))};}
export async function sourceAssets(){assertNode();return inspectTree(PUBLIC,ASSETS);}
export async function builtAssets(){
  const source=await sourceAssets(),built=await inspectTree(DIST,OUTPUT);
  for(const name of ASSETS)if(!built.get(name).equals(source.get(name)))throw Error('stale build; run npm run build');
  if(built.get('_headers').toString()!==HEADERS_TEXT)throw Error('stale headers');
  const withoutManifest=new Map([...built].filter(([name])=>name!=='asset-manifest.json'));
  if(built.get('asset-manifest.json').toString()!==JSON.stringify(manifest(withoutManifest),null,2)+'\n')throw Error('invalid build manifest');
  return built;
}
