// 來源、建置與預覽共用精確樹白名單；拒絕 links/未知檔，不碰未知使用者檔案。
import { lstat, readdir, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
export const PUBLIC_FILES = Object.freeze(['en/index.html','index.html','js/app.mjs','js/core/dates.mjs','js/core/plan.mjs','js/i18n.mjs','robots.txt','styles.css']);
const DIRECTORIES = new Set(['en','js','js/core']);
export async function validateTree(root, { allowMissing = false } = {}) {
  let rootInfo;
  try { rootInfo = await lstat(fileURLToPath(root).replace(/\/$/, '')); } catch (error) { if(allowMissing&&error.code==='ENOENT')return false;throw error; }
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error('Expected an ordinary directory.');
  const found=[];
  const visit=async(directory,prefix='')=>{
    for(const name of await readdir(directory)){
      const relative=prefix+name;
      const path=new URL(name,directory);
      const info=await lstat(path);
      if(info.isSymbolicLink())throw new Error(`Symbolic link refused: ${relative}`);
      if(info.isDirectory()){
        if(!DIRECTORIES.has(relative))throw new Error(`Unknown directory refused: ${relative}`);
        await visit(new URL(`${name}/`,directory),`${relative}/`);
      }else{
        if(!info.isFile()||info.nlink!==1)throw new Error(`Non-regular or hard-linked file refused: ${relative}`);
        if(!PUBLIC_FILES.includes(relative))throw new Error(`Unknown file refused: ${relative}`);
        found.push(relative);
      }
    }
  };
  await visit(root);
  if(found.sort().join('\n')!==PUBLIC_FILES.join('\n'))throw new Error('Required static file missing.');
  return true;
}
export async function readRegular(path) {
  // O_NOFOLLOW 關閉檢查與開啟之間末端換成 symlink 的窗口。
  const handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
    const info=await handle.stat();
    if(!info.isFile()||info.nlink!==1||info.size>2_000_000)throw new Error('Unsafe static file.');
    return await handle.readFile();
  }finally{await handle.close();}
}
export async function snapshotTree(root) {
  await validateTree(root);
  const files=new Map();
  for(const relative of PUBLIC_FILES)files.set(relative,await readRegular(new URL(relative,root)));
  await validateTree(root); // 複製前後核對樹形，建立不可變記憶體快照供 preview/build 使用。
  return files;
}
