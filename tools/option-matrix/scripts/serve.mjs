// 僅提供本雲端 loopback 預覽，不建立公開服務或正式部署。
import http from 'node:http';
// 讀取固定自己 build 的輸出。
import {readFile,lstat} from 'node:fs/promises';
// 相對定位固定 dist。
import {fileURLToPath} from 'node:url';
// 白名單之外一律404；不接受使用者決定的檔案路徑。
const root=fileURLToPath(new URL('../dist/',import.meta.url)),m=JSON.parse(await readFile(root+'manifest.json','utf8')),allowed=new Set(m.files.map(x=>x.path)),types={html:'text/html;charset=utf-8',mjs:'text/javascript;charset=utf-8',css:'text/css;charset=utf-8',txt:'text/plain;charset=utf-8'};
// HTTP headers 與 `_headers` 同一固定值；只能證預覽環境。
http.createServer(async(req,res)=>{res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');try{const path=new URL(req.url,'http://127.0.0.1').pathname.slice(1)||'index.html';if(!allowed.has(path)||path==='_headers')throw Error('NOT_FOUND');const st=await lstat(root+path);if(!st.isFile()||st.isSymbolicLink())throw Error('NOT_FOUND');res.setHeader('Content-Type',types[path.split('.').at(-1)]||'application/octet-stream');res.end(await readFile(root+path));}catch{res.statusCode=404;res.end('Not found');}}).listen(4187,'127.0.0.1',()=>console.log('OPTION_MATRIX_PREVIEW http://127.0.0.1:4187'));
