import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {fileURLToPath} from 'node:url';import path from 'node:path';
const b=path.dirname(fileURLToPath(import.meta.url));
for(const slug of ['word-frequency','text-to-speech-reader','fluid-typography','svg-to-png-converter'])for(const en of [false,true])test(slug+' '+(en?'en':'zh')+' actual static release contract',()=>{
 const dir=path.join(b,'release/assets/__sites',slug),html=fs.readFileSync(path.join(dir,en?'en/index.html':'index.html'),'utf8'),css=fs.readFileSync(path.join(dir,'inspection-notice.css'),'utf8');
 assert.match(html,new RegExp('<html[^>]*lang="'+(en?'en':'zh-Hant')+'"'));assert(html.includes('href="https://'+slug+'.glossquote.com'+(en?'/en/index.html':'/index.html')+'"'));assert(html.includes('content="noindex, follow"'));assert(html.includes('hreflang="x-default"'));
 const asides=[...html.matchAll(/<aside class="gq-inspection-notice" lang="([^"]+)"[^>]*>([\s\S]*?)<\/aside>/g)];assert.equal(asides.length,2);
 for(const a of asides){const e=a[1]==='en';assert(a[2].includes('href="https://glossquote.com'+(e?'/en/index.html':'/index.html')+'"'));assert(a[2].includes('href="https://review.glossquote.com'+(e?'/en/index.html':'/index.html')+'"'));assert(a[2].includes('href="'+(e?'/index.html':'/en/index.html')+'"'));}
 assert.match(css,/\.gq-inspection-notice\{display:none;/);assert(css.includes(':root:lang(en) .gq-inspection-notice[lang="en"]'));assert(css.includes(':root:lang(zh) .gq-inspection-notice[lang="zh-Hant"]'));
 if(slug==='fluid-typography'){assert.match(html,new RegExp('id="labs-home"[^>]*href="https://glossquote.com'+(en?'/en/index.html':'/index.html')+'"'));assert(fs.readFileSync(path.join(dir,'src/app.mjs'),'utf8').includes('document.documentElement.lang=state.lang'));}
});
