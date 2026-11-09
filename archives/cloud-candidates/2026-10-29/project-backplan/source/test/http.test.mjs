// 對實際 HTTP 回應做 literal 斷言，不只引用 policy 常數自證。
import test from 'node:test';
import assert from 'node:assert/strict';
import { serve } from '../scripts/serve.mjs';
const server=await serve(0);
const base=`http://127.0.0.1:${server.address().port}`;
test.after(()=>server.close());
test('both HTML pages carry noindex, strict security headers, correct languages and same-language home', async()=>{
  for(const [path,lang,home]of [['/index.html','zh-Hant','https://glossquote.com/index.html'],['/en/index.html','en','https://glossquote.com/en/index.html']]){
    const response=await fetch(base+path);const html=await response.text();
    assert.equal(response.status,200);assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('permissions-policy'),'camera=(), microphone=(), geolocation=(), clipboard-write=(self)');
    assert.equal(response.headers.get('content-security-policy'),"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    assert.ok(html.includes(`<html lang="${lang}">`));assert.ok(html.includes(`href="${home}"`));assert.doesNotMatch(html,/canonical|sitemap|<input[^>]*name=/);
  }
});
test('MIME, HEAD, robots, 405 and true 404',async()=>{
  const module=await fetch(base+'/js/core/plan.mjs');assert.equal(module.headers.get('content-type'),'text/javascript;charset=utf-8');
  const head=await fetch(base+'/index.html',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal(await(await fetch(base+'/robots.txt')).text(),'User-agent: *\nDisallow: /\n');
  const denied=await fetch(base+'/index.html',{method:'POST',body:'do not submit'});assert.equal(denied.status,405);assert.equal(denied.headers.get('allow'),'GET, HEAD');
  for(const path of ['/','/en/','/absent','/package.json','/js/core/../app.mjs?x=1','/index.html?secret=x','/%2e%2e/package.json','/sitemap.xml'])assert.equal((await fetch(base+path)).status,404,path);
});
