import { ROOT, PUBLIC_ASSETS, walkFiles, fileRecords } from './files.mjs';
import path from 'node:path';
import { mkdir, readFile, writeFile, lstat, realpath } from 'node:fs/promises';

export const DOCUMENTS = Object.freeze(['AGENTS.md','ACCEPTANCE.md','PRODUCT.md','TECHNICAL.md','TASKS.md','TASK-ENTRY.md','START-HERE.md','UX-SEO.md','README.md','HANDOFF.md','project.json','package.json','.gitignore','wrangler.jsonc']);
export async function sourceFiles() {
  const files = [...DOCUMENTS, ...PUBLIC_ASSETS.map(f=>`public/${f}`)];
  for(const directory of ['scripts','test','docs']){
    const found=await walkFiles(path.join(ROOT,directory));
    for(const file of found){if(!/^[A-Za-z0-9_./-]+\.(?:mjs|md|json)$/.test(file)||file.split('/').some(p=>p==='..'||p.startsWith('.')))throw new Error('Unknown source path');files.push(`${directory}/${file}`);}
  }
  const allowed=new Set([...files,'DISPATCH.json']);
  for(const item of await (await import('node:fs/promises')).readdir(ROOT,{withFileTypes:true})){
    if(item.name==='.git'){if(!item.isDirectory())throw new Error('Unsafe Git state');continue;}
    if(['dist','dist-production'].includes(item.name)||['public','scripts','test','docs'].includes(item.name))continue;
    if(!allowed.has(item.name)||!item.isFile())throw new Error('Unknown root source entry');
  }
  return [...new Set(files)].sort();
}
export async function scanSource() {
  const files=await sourceFiles();const records=await fileRecords(ROOT,files);
  const forbidden=/(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{30,}|(?:api[_-]?key|authorization|password|secret|token)\s*[=:]\s*["'][A-Za-z0-9_+-]{20,}["'])/iu;
  for(const file of files){const bytes=await readFile(path.join(ROOT,file));if(bytes.length>512000||bytes.includes(0)||forbidden.test(bytes.toString('utf8')))throw new Error('Unsafe publication bytes');}
  return {status:'PASS',files,records,excluded:['DISPATCH.json','dist','dist-production','.runs','node_modules','.git','credentials','other products','user inputs']};
}
export async function reviewedCopy(destination) {
  if(!path.isAbsolute(destination)||!path.resolve(destination).replaceAll('\\','/').includes('/.runs/github-publish/glossquote-labs-list-compare/'))throw new Error('Publication copy scope');
  const parent=path.dirname(path.resolve(destination));const info=await lstat(parent);if(!info.isDirectory()||info.isSymbolicLink()||path.resolve(await realpath(parent)).toLowerCase()!==parent.toLowerCase())throw new Error('Unsafe copy parent');
  const scan=await scanSource();await mkdir(destination);
  for(const file of scan.files){const output=path.join(destination,file);await mkdir(path.dirname(output),{recursive:true});await writeFile(output,await readFile(path.join(ROOT,file)),{flag:'wx'});}
  const copied=await fileRecords(destination,scan.files);if(JSON.stringify(copied)!==JSON.stringify(scan.records))throw new Error('Source copy mismatch');
  return {status:'PASS',destination,records:copied,excluded:scan.excluded};
}
