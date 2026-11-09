import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from './worker.mjs';
const handler=createHandler({'a.glossquote.com':{slug:'alpha',paths:['/index.html','/en/index.html','/app.js'],csp:"default-src 'self'; connect-src 'none'"},'b.glossquote.com':{slug:'beta',paths:['/index.html'],csp:"default-src 'self'"}});
test('serves only mapped host/path and strips query/cookies/auth',async()=>{
 let seen;const env={ASSETS:{fetch:async r=>{seen=r;return new Response('alpha',{headers:{'Content-Type':'text/html','Set-Cookie':'bad=1','NEL':'{}'}})}}};
 const response=await handler(new Request('https://a.glossquote.com/index.html?input=private',{headers:{Cookie:'a=private',Authorization:'private'}}),env);
 assert.equal(await response.text(),'alpha');assert.equal(seen.url,'https://static.invalid/__sites/alpha/index.html');assert.equal(seen.headers.has('cookie'),false);assert.equal(seen.headers.has('authorization'),false);assert.equal(response.headers.has('set-cookie'),false);assert.equal(response.headers.has('nel'),false);assert.equal(response.headers.get('X-Robots-Tag'),'noindex, follow');
});
test('unknown hosts, cross-tool paths, writes and malformed escapes never fetch assets',async()=>{
 const env={ASSETS:{fetch:()=>{throw Error('must not fetch')}}};
 for(const [url,method,status]of[['https://unknown.glossquote.com/index.html','GET',404],['https://a.glossquote.com/__sites/beta/index.html','GET',404],['https://a.glossquote.com/index.html','POST',405],['https://a.glossquote.com/%ZZ','GET',400],['https://a.glossquote.com/%5csecret','GET',400]])assert.equal((await handler(new Request(url,{method}),env)).status,status);
});
test('canonical redirects discard query and preserve language',async()=>{
 for(const [p,target]of[['/','/index.html'],['/en','/en/index.html'],['/en/','/en/index.html']]){const r=await handler(new Request('https://a.glossquote.com'+p+'?x=1'),{});assert.equal(r.status,301);assert.equal(r.headers.get('location'),'https://a.glossquote.com'+target);}
});
test('HEAD and range headers preserved; original request headers isolated',async()=>{
 let seen;const r=await handler(new Request('https://b.glossquote.com/index.html',{method:'HEAD',headers:{Range:'bytes=0-1',Cookie:'secret'}}),{ASSETS:{fetch:async r=>{seen=r;return new Response(null,{status:206})}}});
 assert.equal(r.status,206);assert.equal(seen.method,'HEAD');assert.equal(seen.headers.get('Range'),'bytes=0-1');assert.equal(seen.headers.has('Cookie'),false);assert.equal(seen.url,'https://static.invalid/__sites/beta/index.html');
});
test('original per-path security policies are preserved without widening',async()=>{
 const h=createHandler({'a.glossquote.com':{slug:'alpha',paths:['/index.html','/app.js'],csp:"default-src 'self'",headerRules:[{pattern:'/*',headers:{'Cache-Control':'no-store','Cross-Origin-Opener-Policy':'same-origin','Permissions-Policy':'clipboard-read=(), clipboard-write=()','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; worker-src 'none'"}},{pattern:'/*.js',headers:{'Cross-Origin-Resource-Policy':'same-origin'}}]}});
 const env={ASSETS:{fetch:async()=>new Response('body')}};const r=await h(new Request('https://a.glossquote.com/app.js'),env);
 assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('Cross-Origin-Opener-Policy'),'same-origin');assert.equal(r.headers.get('Cross-Origin-Resource-Policy'),'same-origin');assert(r.headers.get('Content-Security-Policy').includes("style-src-attr 'none'"));assert(!r.headers.get('Content-Security-Policy').includes('unsafe-inline'));assert.equal(r.headers.get('Permissions-Policy'),'clipboard-read=(), clipboard-write=()');
});
