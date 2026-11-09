import fs from 'node:fs/promises'; // 靜態複製不用套件或生成器。
import {createHash} from 'node:crypto'; // 輸出每檔固定SHA256。
const files=['index.html','en/index.html','styles.css','core.mjs','controller.mjs','app.mjs','i18n.mjs']; // 顯式allowlist不收私人證據或協作檔。
const root=new URL('../',import.meta.url),dist=new URL('dist/',root); // 目的限定本工具產物目錄。
await fs.mkdir(dist,{recursive:true});const manifest=[]; // 不刪原保留檔。
for(const path of files){const bytes=await fs.readFile(new URL('public/'+path,root));await fs.mkdir(new URL(path.includes('/')?'en/':'./',dist),{recursive:true});await fs.writeFile(new URL(path,dist),bytes);manifest.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});} // 產物與來源逐byte相同。
await fs.writeFile(new URL('MANIFEST.json',dist),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({files:manifest.length,manifestSha256:createHash('sha256').update(JSON.stringify(manifest,null,2)+'\n').digest('hex')})); // manifest是傳輸指紋不是品質PASS。
