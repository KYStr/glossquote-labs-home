// 唯一 loopback 預覽根，不提供任意 workspace 檔案；無外部綁定。
import http from 'node:http';
// 匯入此模組明列的內建或同源依賴，不載入遠端程式。
import fs from 'node:fs/promises';
// 匯入此模組明列的內建或同源依賴，不載入遠端程式。
import {root,files,headers} from './build.mjs';
// 依此檔案的固定契約處理下列明列資料，不擴大輸入或檔案範圍。
const port=4188,allowed=new Set(files),mime={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',mjs:'text/javascript; charset=utf-8',txt:'text/plain; charset=utf-8'};
// 依此檔案的固定契約處理下列明列資料，不擴大輸入或檔案範圍。
const security=Object.fromEntries(headers.trim().split('\n').slice(1).map(x=>{const at=x.indexOf(':');return[x.slice(0,at).trim(),x.slice(at+1).trim()];}));
// 依此檔案的固定契約處理下列明列資料，不擴大輸入或檔案範圍。
http.createServer(async(req,res)=>{for(const[k,v]of Object.entries(security))res.setHeader(k,v);res.setHeader('Cache-Control','no-store');if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}if(req.headers.host!==`127.0.0.1:${port}`){res.writeHead(400);return res.end();}const p=req.url==='/'?'index.html':req.url.slice(1);if(!allowed.has(p)){res.writeHead(404);return res.end();}try{const data=await fs.readFile(root+'dist/'+p);res.setHeader('Content-Type',mime[p.split('.').at(-1)]);res.writeHead(200);res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404);res.end();}}).listen(port,'127.0.0.1',()=>console.log(`http://127.0.0.1:${port}`));
