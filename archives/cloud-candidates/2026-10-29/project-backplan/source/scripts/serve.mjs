// 僅監聽雲端 loopback，不公開、不處理表單、不記錄使用者輸入。
import { createServer } from 'node:http';
import { snapshotTree } from './files.mjs';
import { extname } from 'node:path';
import { HEADERS } from './policy.mjs';
export async function serve(port = 4187) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid loopback port.');
  const root = new URL('../public/', import.meta.url);
  const files = await snapshotTree(root); // 啟動時驗證並讀記憶體；請求時不再追隨檔案系統 links。
  const server = createServer(async (request, response) => {
    for (const [key, value] of Object.entries(HEADERS)) response.setHeader(key, value);
    if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); response.writeHead(405); response.end(); return; }
    // 精確路徑白名單及副檔名；拒絕 query、目錄 alias、編碼與 traversal。
    const path = request.url;
    if (!/^\/(?:index\.html|en\/index\.html|styles\.css|robots\.txt|js\/(?:app|i18n)\.mjs|js\/core\/(?:dates|plan)\.mjs)$/.test(path)) { response.writeHead(404); response.end('Not found'); return; }
    try {
      const bytes = files.get(path.slice(1));
      if (!bytes) throw new Error('Not found');
      const types = { '.html': 'text/html;charset=utf-8', '.css': 'text/css;charset=utf-8', '.mjs': 'text/javascript;charset=utf-8', '.txt': 'text/plain;charset=utf-8' };
      response.setHeader('Content-Type', types[extname(path)]);
      response.writeHead(200);
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => resolve(server)); });
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  // managed sites-preview 會傳 --host/--port/--strictPort，只接受 loopback。
  const args = process.argv.slice(2);
  let suppliedPort;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--host' && args[index + 1] === '127.0.0.1') { index += 1; continue; }
    if (args[index] === '--port' && /^[0-9]+$/.test(args[index + 1] ?? '')) { suppliedPort = args[++index]; continue; }
    if (args[index] === '--strictPort') continue;
    throw new Error('Unsupported preview argument.');
  }
  const server = await serve(Number(suppliedPort ?? process.env.PORT ?? 4187));
  console.log(`Preview only: http://127.0.0.1:${server.address().port}/index.html`);
}
