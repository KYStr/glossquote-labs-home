// 靜態語意與對比數學檢查不能替代真瀏覽器版面或輔助技術。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root=new URL('../public/',import.meta.url);
for(const [path,language,home,other]of [['index.html','zh-Hant','https://glossquote.com/index.html','/en/index.html'],['en/index.html','en','https://glossquote.com/en/index.html','/index.html']])test(`${language}: unique IDs, visible labels, ARIA targets, safe startup and no fabricated production metadata`,async()=>{
  const html=await readFile(new URL(path,root),'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const match of html.matchAll(/\b(?:for|aria-labelledby|aria-describedby)="([^"]+)"/g))for(const id of match[1].split(' '))assert.ok(ids.includes(id),`missing ${id}`);
  for(const id of ['roster','mode','report'])assert.match(html,new RegExp(`<label for="${id}">[^<]+</label>`));
  assert.match(html,new RegExp(`<html lang="${language}">`));assert.ok(html.includes(`href="${home}"`));assert.ok(html.includes(`href="${other}"`));assert.ok(html.includes('name="robots" content="noindex, nofollow"'));
  assert.match(html,/<fieldset id="editor" disabled>/);assert.match(html,/<button id="calculate"[^>]* disabled>/);assert.doesNotMatch(html,/<(?:input|textarea|select)[^>]*\bname=/);assert.doesNotMatch(html,/<link[^>]*canonical|sitemap\.xml/);
  assert.match(html,/<dialog[^>]*aria-labelledby="clear-title"[^>]*aria-describedby="clear-description"/);assert.match(html,/<button id="cancel-clear"[^>]*autofocus/);
  assert.match(html,/<p id="status" role="status" aria-live="polite" aria-atomic="true">/);
});
test('preview raw headers have required restrictions and no permissive or indexing override',async()=>{
  const headers=await readFile(new URL('_headers',root),'utf8');
  for(const expected of ["default-src 'none'","script-src 'self'","style-src 'self'","connect-src 'none'","object-src 'none'","base-uri 'none'","frame-ancestors 'none'","form-action 'none'",'X-Content-Type-Options: nosniff','Referrer-Policy: no-referrer','X-Robots-Tag: noindex, nofollow','Cache-Control: no-store'])assert.ok(headers.includes(expected));
  assert.doesNotMatch(headers,/unsafe-inline|unsafe-eval|X-Robots-Tag: index|\n[^\s/]/);
});
function luminance(hex){const values=hex.match(/\w\w/g).map(pair=>parseInt(pair,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;}
function contrast(a,b){const v=[luminance(a),luminance(b)].sort((a,b)=>b-a);return(v[0]+.05)/(v[1]+.05);}
test('family token text contrast exceeds 4.5 and control borders exceed 3',()=>{
  for(const [fg,bg]of [['111410','f3f0e8'],['111410','ffffff'],['111410','c8f56a'],['55594f','ffffff'],['55594f','f3f0e8'],['8e2222','ffffff']])assert.ok(contrast(fg,bg)>=4.5,`${fg}/${bg}`);
  for(const bg of ['ffffff','f3f0e8'])assert.ok(contrast('60645c',bg)>=3);
});
