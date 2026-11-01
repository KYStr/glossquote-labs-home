import test from 'node:test'; // 交付契約使用 Node 內建測試。
import assert from 'node:assert/strict'; // 所有安全回應都有固定期望。
import fs from 'node:fs/promises'; // 僅讀目前產品檔案。
import path from 'node:path'; // 相對路徑固定在產品根。
import http from 'node:http'; // 以 loopback 檢查自有預覽伺服器。
import {build, root} from '../scripts/build.mjs'; // 兩次乾淨建置使用正式產品命令核心。
import {createPreview, CSP} from '../scripts/preview.mjs'; // 伺服器不接外部站點。
import {messages} from '../src/messages.mjs'; // 核雙語動態訊息鍵完整。
function request(port,url='/',method='GET',host=`127.0.0.1:${port}`) { // 原始 HTTP 路徑保留 traversal 測試字串。
  return new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port,path:url,method,headers:{Host:host}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));});r.on('error',reject);r.end();}); // 不追隨重新導向也不發送敏感資料。
} // 結束 loopback 請求。
test('T10 deterministic clean build and restricted preview',async()=>{ // 一個批次內完成兩次乾淨建置與伺服器邊界。
  const a=await build(),first=await fs.readFile(path.join(root,'dist/build-manifest.json'));const b=await build(),second=await fs.readFile(path.join(root,'dist/build-manifest.json'));assert.deepEqual(a,b);assert.deepEqual(first,second);assert.equal(a.files.length,8); // 無時間戳與隱藏產物差異。
  const server=createPreview(0);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port; // 測試只綁 loopback 隨機埠。
  try { // 無論斷言結果都清理伺服器。
    for(const name of ['/','/en/','/index.html','/en/index.html','/style.css','/src/core.mjs']){const r=await request(port,name);assert.equal(r.status,200);assert.equal(r.headers['content-security-policy'],CSP);assert.equal(r.headers['x-content-type-options'],'nosniff');assert.ok(r.body.length>0);} // 固定靜態入口可讀。
    const head=await request(port,'/','HEAD');assert.equal(head.status,200);assert.equal(head.body.length,0);assert.ok(Number(head.headers['content-length'])>0); // HEAD 只回標頭。
    for(const p of ['/../package.json','/%2e%2e/package.json','/%00','/a\\b','/%ZZ'])assert.equal((await request(port,p)).status,400,p); // 解碼後遍歷與非法路徑拒絕。
    for(const p of ['/package.json','/scripts/build.mjs','/src/','/https://example.com','//index.html'])assert.equal((await request(port,p)).status,404,p); // 無目錄列表或任意代理。
    assert.equal((await request(port,'/','POST')).status,405);assert.equal((await request(port,'/','GET','evil.example')).status,403); // 方法與 Host 白名單。
  } finally {await new Promise(resolve=>server.close(resolve));} // 測試退出不留下後台服務。
}); // 結束交付與伺服器測試。
test('T10 bilingual text structure and dynamic parity',async()=>{ // 不把字串檢查冒實際視覺驗收。
  assert.deepEqual(Object.keys(messages.zh),Object.keys(messages.en));assert.deepEqual(Object.keys(messages.zh.errors),Object.keys(messages.en.errors));assert.deepEqual(Object.keys(messages.zh.copy),Object.keys(messages.en.copy)); // 狀態錯誤複製詞典完整。
  for(const [name,lang,home]of[['index.html','zh-Hant','https://glossquote.com/index.html'],['en/index.html','en','https://glossquote.com/en/index.html']]){const text=await fs.readFile(path.join(root,name),'utf8');assert.ok(text.includes(`<html lang="${lang}">`));assert.ok(text.includes(home));assert.equal((text.match(/type="radio"/g)||[]).length,9);assert.equal((text.match(/type="text"/g)||[]).length,4);assert.match(text,/readonly/);assert.equal((text.match(/<th scope="col">/g)||[]).length,3);assert.match(text,/aria-describedby/);assert.match(text,/noindex, nofollow/);} // 預覽 SEO 與原生控制契約。
}); // 結束雙語靜態檢查。
