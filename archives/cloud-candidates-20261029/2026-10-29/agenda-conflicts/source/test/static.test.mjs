// 靜態契約和色碼數學；不是排版、螢幕閱讀器或完整 Network/Storage 驗收。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COPY } from '../public/js/i18n.mjs';
const read=path=>readFileSync(new URL(`../public/${path}`,import.meta.url),'utf8');
for(const [path,lang,home]of [['index.html','zh-Hant','https://glossquote.com/index.html'],['en/index.html','en','https://glossquote.com/en/index.html']])test(`${lang}: static no-JS disabled, labels, language, FAQ and unpublished SEO`,()=>{
  const html=read(path);assert.ok(html.includes(`<html lang="${lang}">`));assert.ok(html.includes(home));
  assert.equal((html.match(/<h1>/g)||[]).length,1);assert.equal((html.match(/<details>/g)||[]).length,6);
  assert.match(html,/<fieldset id="workspace" disabled>/);assert.match(html,/<button id="download"[^>]+disabled>/);assert.match(html,/<noscript>/);
  assert.match(html,/<dialog id="confirmation" aria-labelledby="confirm-title" aria-describedby="confirmation-text">/);
  assert.match(html,/name="robots" content="noindex,nofollow"/);assert.doesNotMatch(html,/canonical|hreflang|sitemap|application\/ld\+json/);
  for(const id of ['dateRaw','timeBasisRaw','roomBufferRaw','speakerBufferRaw','report'])assert.ok(html.includes(`for="${id}"`));
  assert.doesNotMatch(html,/<(?:input|textarea|button)[^>]*\sname=/);
  assert.doesNotMatch(html,/\son\w+=|\sstyle=|<style|<iframe|<img|<form[^>]+action=/);
  const resources=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(resources.filter(p=>p.startsWith('https:')).length,1);
  assert.ok(resources.every(p=>p.startsWith('.')||p===home));
});
test('literal preview headers deny network and framing; no accidental clipboard requirement',()=>{
  assert.equal(read('_headers'),`/*
  X-Robots-Tag: noindex, nofollow
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=(), clipboard-write=()
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'none'; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; media-src 'none'; worker-src 'none'; manifest-src 'none'
`);assert.equal(read('robots.txt'),'User-agent: *\nDisallow: /\n');assert.match(read('404.html'),/noindex,nofollow/);
});
test('all known error codes have explicit text in both locales',()=>{
  const codes=['SCHEMA','ROW_COUNT','TYPE','RAW_LENGTH','TEXT','LABEL','CLOCK','BUFFER','DATE','ID','SPEAKERS','ORDER'];
  for(const locale of ['zh-Hant','en'])assert.deepEqual(Object.keys(COPY[locale].errors).sort(),codes.sort());
});
test('runtime has no network/storage/HTML sinks or hidden submission names',()=>{
  for(const path of ['js/app.mjs','js/core.mjs','js/i18n.mjs'])assert.doesNotMatch(read(path),/innerHTML|outerHTML|insertAdjacentHTML|\beval\s*\(|\bFunction\s*\(|\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|document\.cookie|console\./);
  assert.match(read('js/app.mjs'),/textContent/);assert.match(read('js/app.mjs'),/event\.preventDefault\(\)/);
  assert.doesNotMatch(read('styles.css'),/@import|url\s*\(/);
});
test('family color token contrast clears numerical floors',()=>{
  const lum=hex=>{const c=hex.match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
  const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  for(const bg of ['f3f0e8','ffffff'])for(const fg of ['111410','55594f','9d2020'])assert.ok(ratio(fg,bg)>=4.5,`${fg}/${bg}`);
  assert.ok(ratio('111410','c8f56a')>=4.5);assert.ok(ratio('60645c','ffffff')>=3);assert.ok(ratio('1455aa','f3f0e8')>=3);
});
