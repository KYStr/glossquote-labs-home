import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { ROOT,ASSETS,sourceAssets } from './assets.mjs';
export async function check(){
  const pkg=JSON.parse(await readFile(path.join(ROOT,'package.json'),'utf8'));
  if(pkg.type!=='module'||pkg.engines?.node!=='>=24'||Object.keys(pkg.dependencies??{}).length||Object.keys(pkg.devDependencies??{}).length)throw Error('dependency/engine contract failed');
  const assets=await sourceAssets();
  const forbidden=/\b(?:innerHTML|outerHTML|insertAdjacentHTML|eval|localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|EventSource|sendBeacon|serviceWorker)\b|\bfetch\s*\(|\bnew\s+Function\s*\(|\bdocument\s*\.\s*cookie\b|\bconsole\s*\.|\bstyle\s*=|\.style\b/;
  for(const [name,buffer] of assets){
    const text=buffer.toString('utf8');
    if(buffer.includes(0)||text.startsWith('\ufeff')||text.includes('\r'))throw Error('noncanonical source encoding');
    if(name.endsWith('.mjs')){
      if(forbidden.test(text))throw Error('forbidden public capability');
      const parsed=spawnSync(process.execPath,['--check',path.join(ROOT,'public',name)],{encoding:'utf8',windowsHide:true});if(parsed.status!==0)throw Error('invalid public module syntax');
      for(const match of text.matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g)){
        const spec=match[1],resolved=path.posix.normalize(path.posix.join(path.posix.dirname(name),spec));
        if(!spec.startsWith('.')||!ASSETS.includes(resolved))throw Error('module import outside allowlist');
      }
    }
    if(name.endsWith('.html')){
      if(!text.includes('name="robots" content="noindex,nofollow"')||/<(?:style|iframe)\b|\son[a-z]+\s*=|\sstyle\s*=/.test(text))throw Error('unsafe preview HTML');
      if(/<(?:input|textarea|select)\b[^>]*\bname\s*=/i.test(text))throw Error('named input forbidden');
      if(/<input[^>]*(?:type="(?:file|number)"|maxlength=)/i.test(text))throw Error('unsupported input control');
      for(const match of text.matchAll(/\b(?:src|href)="([^"]+)"/g)){
        if(match[1].startsWith('https://')){if(!/^https:\/\/(?:cuts\.)?glossquote\.com\/(?:en\/)?index\.html$/.test(match[1]))throw Error('unapproved link');}
        else if(!match[1].startsWith('#')&&!ASSETS.includes(match[1].replace(/^\//,'')))throw Error('unknown linked asset');
      }
      if(name!=='404.html'&&(!text.includes('<fieldset id="work-fields" disabled>')||!text.includes('id="calculate" class="primary" disabled')))throw Error('initial form must be disabled');
    }
    if(name.endsWith('.css')&&(/@import|url\s*\(/i.test(text)))throw Error('remote style asset forbidden');
  }
  const boot=assets.get('js/boot.mjs').toString();if(boot.indexOf("event.preventDefault()")<0||boot.indexOf('event.preventDefault()')>boot.indexOf('await import'))throw Error('early submit guard missing');
  if(assets.get('robots.txt').toString()!=='User-agent: *\nDisallow: /\n')throw Error('preview robots contract failed');
  return assets;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){await check();console.log('PASS preview source/schema/syntax/safety checks');}
