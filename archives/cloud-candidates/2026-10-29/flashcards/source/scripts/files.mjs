// 精確來源/靜態樹白名單；使用實際path，不把檔名當URL解析。
import { lstat, readdir, open, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, join, dirname, relative } from 'node:path';
export const PUBLIC_FILES = Object.freeze(['_headers','en/index.html','index.html','js/app.mjs','js/core/flashcards.mjs','js/i18n.mjs','robots.txt','styles.css']);
export const SOURCE_FILES = Object.freeze([
  '.gitignore','AGENTS.md','CHECKPOINT-MANIFEST.json','README.md','docs/BROWSER-QA.md','docs/CHECKPOINT.md','docs/SPEC.md','docs/VERIFICATION.md','package.json',
  ...PUBLIC_FILES.map(path=>`public/${path}`),
  'scripts/build.mjs','scripts/check.mjs','scripts/files.mjs','scripts/policy.mjs','test/app.test.mjs','test/core.test.mjs','test/dom-harness.mjs','test/r2-regressions.test.mjs','test/toolchain.test.mjs'
].sort());
const OPTIONAL_FILES = ['SOURCE-MANIFEST.json'];
function directoryNames(paths) {
  const dirs=new Set();
  for(const path of paths) { let parent=dirname(path);while(parent!=='.'){dirs.add(parent);parent=dirname(parent);} }
  return dirs;
}
async function ordinaryRoot(root) {
  const info=await lstat(root);
  if(!info.isDirectory()||info.isSymbolicLink()||await realpath(root)!==resolve(root))throw new Error('Ordinary real directory required.');
}
export async function readRegular(path) {
  const before=await lstat(path);
  if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1||before.size>2_000_000)throw new Error('Unsafe file refused.');
  const handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try {
    const opened=await handle.stat();
    if(!opened.isFile()||opened.nlink!==1||opened.dev!==before.dev||opened.ino!==before.ino||opened.size>2_000_000)throw new Error('File changed while opening.');
    const bytes=await handle.readFile();
    const after=await handle.stat();
    if(after.size!==opened.size||after.mtimeMs!==opened.mtimeMs||after.nlink!==1||bytes.length!==opened.size)throw new Error('File changed while reading.');
    return bytes;
  } finally { await handle.close(); }
}
export async function validateTree(root, required, optional=[]) {
  await ordinaryRoot(root);
  const allowed=new Set([...required,...optional]);
  const dirs=directoryNames(allowed);
  const found=new Set();
  async function visit(directory) {
    for(const name of await readdir(directory)) {
      const path=join(directory,name);
      const key=relative(root,path).split('\\').join('/');
      const info=await lstat(path);
      if(info.isSymbolicLink())throw new Error(`Symbolic link refused: ${key}`);
      if(info.isDirectory()) {
        if(!dirs.has(key))throw new Error(`Unknown directory refused: ${key}`);
        await visit(path);
      } else {
        if(!info.isFile()||info.nlink!==1)throw new Error(`Non-regular or hard-linked file refused: ${key}`);
        if(!allowed.has(key))throw new Error(`Unknown file refused: ${key}`);
        found.add(key);
      }
    }
  }
  await visit(root);
  for(const key of required)if(!found.has(key))throw new Error(`Required file missing: ${key}`);
  return [...found].sort();
}
export async function snapshot(root, required=PUBLIC_FILES, optional=[]) {
  const paths=await validateTree(root,required,optional);
  const files=new Map();
  for(const path of paths)files.set(path,await readRegular(join(root,path)));
  await validateTree(root,required,optional);
  return files;
}
export async function snapshotOptional(root) {
  try { await lstat(root); } catch(error) { if(error.code==='ENOENT')return null;throw error; }
  return snapshot(root);
}
export async function sourceSnapshot(root) {
  // dist 是唯一允許的產物樹；一旦存在，也必須完整且通過同一白名單。
  const output=await snapshotOptional(join(root,'dist'));
  const optional=[...OPTIONAL_FILES,...(output?PUBLIC_FILES.map(path=>`dist/${path}`):[])];
  return snapshot(root,SOURCE_FILES,optional);
}
export function equalSnapshots(left,right) {
  if(left===null||right===null)return left===right;
  return left.size===right.size&&[...left].every(([path,bytes])=>right.has(path)&&bytes.equals(right.get(path)));
}
