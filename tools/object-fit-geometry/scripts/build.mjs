import fs from 'node:fs/promises'; // 使用既有 Node 內建檔案能力，不新增依賴。
import path from 'node:path'; // 固定相對路徑用於可重現輸出。
import {fileURLToPath} from 'node:url'; // 從本腳本位置定位專案。
import {createHash} from 'node:crypto'; // 每個產物記錄 SHA-256。
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); // 不接受外部輸出路徑。
export const payload = Object.freeze(['index.html', 'en/index.html', 'style.css', 'src/core.mjs', 'src/controller.mjs', 'src/messages.mjs', 'src/app.mjs', 'src/boot.mjs']); // 只交付已宣告的八個靜態檔案。
export async function build() { // 固定清空自身 dist 後複製原始 bytes。
  const destination = path.join(root, 'dist'); await fs.rm(destination, {recursive: true, force: true}); await fs.mkdir(destination, {recursive: true}); // 僅處理本產品可再生的輸出目錄。
  const files = []; // 產物清單排序與 payload 相同。
  for (const name of payload) { // 不掃描或帶入私人記錄。
    const bytes = await fs.readFile(path.join(root, name)); await fs.mkdir(path.dirname(path.join(destination, name)), {recursive: true}); await fs.writeFile(path.join(destination, name), bytes); // 保持來源與 runtime 完全相同。
    files.push({path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')}); // 記錄真實 byte 數與 digest。
  } // 結束靜態複製。
  const manifest = {format: 1, files}; await fs.writeFile(path.join(destination, 'build-manifest.json'), JSON.stringify(manifest, null, 2) + '\n'); // 無時間戳，避免兩次建置不同。
  return manifest; // 供作者檢查精確比較。
} // 結束純靜態建置。
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await build())); // 只有直接執行才建置。
