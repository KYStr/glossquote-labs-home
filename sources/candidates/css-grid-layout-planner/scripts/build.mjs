import { lstat, mkdir, readFile, writeFile, copyFile, realpath } from 'node:fs/promises'; // 僅處理明確來源與新目錄。
import { resolve, dirname } from 'node:path'; // 路徑先正規化。
import { createHash } from 'node:crypto'; // 每個產物固定雜湊。
const root=resolve(new URL('..',import.meta.url).pathname),out=resolve(root,'dist'); // 固定輸出不接受任意路徑。
if(process.argv.slice(2).join(' ')!=='--mode preview')throw Error('Use --mode preview; no deployment mode'); // 未有正式origin不假發布。
try{await lstat(out);throw Error('Existing dist rejected; use a fresh source copy');}catch(e){if(e.code!=='ENOENT')throw e;} // 不刪既有產物。
const files=['index.html','en/index.html','styles.css','core.mjs','controller.mjs','app.mjs','i18n.mjs']; // 唯一 runtime allowlist。
for(const file of files){const source=resolve(root,'public',file);if((await lstat(source)).isSymbolicLink()||!(await lstat(source)).isFile())throw Error('Nonregular source');if(!(await realpath(source)).startsWith(await realpath(resolve(root,'public'))+'/'))throw Error('Source escape');} // 建目錄前核全部來源。
await mkdir(out);const manifest=[]; // 所有拒絕檢查先完成。
for(const file of files){const source=resolve(root,'public',file),target=resolve(out,file);await mkdir(dirname(target),{recursive:true});await copyFile(source,target);const bytes=await readFile(target);manifest.push({path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});} // 逐檔複製並核bytes。
await writeFile(resolve(out,'MANIFEST.json'),JSON.stringify({mode:'preview',files:manifest},null,2)+'\n');console.log('Built preview:',files.length,'files'); // manifest不帶環境路徑或輸入。
