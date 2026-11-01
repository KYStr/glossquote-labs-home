import http from 'node:http'; // 僅使用 Node 內建 HTTP 靜態伺服器。
import fs from 'node:fs/promises'; // 只讀固定 dist 內的白名單檔案。
import path from 'node:path'; // 使用固定產物根目錄。
import {fileURLToPath} from 'node:url'; // 判斷直接執行或測試匯入。
import {root, payload} from './build.mjs'; // 共用明確靜態白名單，不動態列目錄。
export const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"; // 不允許遠端內容或 inline 腳本樣式。
export function createPreview(port = 4173) { // 僅服務目前固定產品輸出。
  const allowed = new Set(payload.map(name => `/${name}`)); // 不開放測試、原始記錄或任意檔案。
  return http.createServer(async (req, res) => { // 每次請求先驗證方法與 Host。
    const headers = {'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'}; // 最小權限與不快取 QA raw 頁面。
    const fail = code => { res.writeHead(code, {...headers, 'Content-Type': 'text/plain; charset=utf-8'}); res.end(req.method === 'HEAD' ? undefined : String(code)); }; // 錯誤不回顯任意請求內容。
    const actualPort = req.socket.localPort; // 測試可使用系統分配的本地埠。
    if (![`127.0.0.1:${actualPort}`, `localhost:${actualPort}`].includes(req.headers.host)) return fail(403); // 抵擋不在白名單的 Host。
    if (!['GET', 'HEAD'].includes(req.method)) return fail(405); // 不接受寫入或代理方法。
    let name; try { name = decodeURIComponent((req.url || '').split('?')[0]); } catch { return fail(400); } // 非法 percent 編碼直接拒絕。
    if (!name.startsWith('/') || name.includes('\0') || name.includes('\\') || name.split('/').includes('..')) return fail(400); // 解碼後再次攔截遍歷與零字元。
    if (name === '/') name = '/index.html'; if (name === '/en/' || name === '/en') name = '/en/index.html'; // 僅兩個固定入口別名。
    if (!allowed.has(name)) return fail(404); // 不列目錄、不代取遠端 URL。
    try { // 檔案讀取錯誤不暴露主機路徑。
      const bytes = await fs.readFile(path.join(root, 'dist', name.slice(1))); // 僅讀固定白名單。
      const type = name.endsWith('.html') ? 'text/html' : name.endsWith('.css') ? 'text/css' : 'text/javascript'; // 固定三種內容型別。
      res.writeHead(200, {...headers, 'Content-Type': `${type}; charset=utf-8`, 'Content-Length': bytes.length}); res.end(req.method === 'HEAD' ? undefined : bytes); // HEAD 不傳 body。
    } catch { fail(404); } // 未建置時不自動生成或執行其他命令。
  }); // 結束 HTTP handler。
} // 結束伺服器工廠。
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const port = 4173; createPreview(port).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}`)); } // 直接啟動僅綁定 loopback，不部署。
