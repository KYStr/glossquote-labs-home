import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inventorySummary, validateRegistry} from './coordination-core.mjs';

export function readyTasks(registry, executor) {
  validateRegistry(registry);
  if (!['local-codex','cloud-dot'].includes(executor)) throw Error('executor must be local-codex or cloud-dot');
  const stock=inventorySummary(registry);
  if (stock.inventoryStatus !== 'confirmed') return [];
  return registry.tasks.filter(t=>t.workType==='production' && t.status==='ready' && t.owner===null && t.allowedExecutors.includes(executor) && registry.specs.some(s=>s.id===t.specId && s.status==='ready' && s.consumedBy===null));
}
export function summarize(registry) {
  const inventory=inventorySummary(registry);
  const byStatus={};for(const t of registry.tasks)byStatus[t.status]=(byStatus[t.status]??0)+1;
  return {revision:registry.revision,inventory,taskCounts:byStatus,notice:'Local checkout observation only. Read latest GitHub and complete CAS claim/readback before work.'};
}
export function safeFile(root, relative) {
  if(typeof relative!=='string'||!relative||relative.includes('\\')||relative.includes(':')||relative.startsWith('/')||relative.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Unsafe source path');
  const absolute=path.resolve(root,...relative.split('/'));
  let current=absolute;
  while(current!==root){const st=fs.lstatSync(current);if(st.isSymbolicLink())throw Error('Symlink not allowed');const parent=path.dirname(current);if(parent===current)throw Error('Out of root');current=parent;}
  if(!fs.statSync(absolute).isFile())throw Error('Source must be a file');return absolute;
}
export function verifySourceFiles(root, files) {
  const seen=new Set();let bytes=0;
  for(const f of files){
    if(seen.has(f.path)||!Number.isSafeInteger(f.bytes)||f.bytes<0||!/^[a-f0-9]{40}$/.test(f.gitBlob)||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error('Invalid or duplicate source manifest row');
    if(!['sources/','archives/','docs/specs/','docs/reviews/'].some(p=>f.path.startsWith(p)))throw Error('Unexpected source manifest prefix');
    const b=fs.readFileSync(safeFile(root,f.path));
    const git=createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
    if(b.length!==f.bytes||git!==f.gitBlob||createHash('sha256').update(b).digest('hex')!==f.sha256)throw Error('Source mismatch: '+f.path);
    seen.add(f.path);bytes+=b.length;
  }
  return {files:seen.size,bytes,status:'PASS_SOURCE_BYTES_ONLY'};
}
function main(){
  const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
  const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
  const registry=read('coordination/work-registry.json');validateRegistry(registry);
  const [command='list',argument,...extra]=process.argv.slice(2);if(extra.length)throw Error('Too many arguments');
  let result;
  if(command==='list'&&!argument)result=summarize(registry);
  else if(command==='ready')result={...summarize(registry),executor:argument,tasks:readyTasks(registry,argument).map(t=>({taskId:t.id,specId:t.specId,brief:t.brief,criteria:t.acceptanceCriteria}))};
  else if(command==='show'&&argument){
    const index=read('coordination/source-index.json');
    const tasks=registry.tasks.filter(t=>t.id===argument||t.id.endsWith('-'+argument)||index.taskSlugs[t.id]===argument);
    const snapshots=index.snapshots.filter(s=>s.slug===argument||tasks.some(t=>index.taskSlugs[t.id]===s.slug));
    if(!tasks.length&&!snapshots.length)throw Error('No exact task/slug match');
    result={revision:registry.revision,notice:'Preserved source is not product acceptance or deployment.',tasks,snapshots};
  }else if(command==='verify-sources'&&!argument)result=verifySourceFiles(root,read('coordination/source-files.json'));
  else throw Error('Usage: workspace.mjs list | ready local-codex|cloud-dot | show slug-or-task-id | verify-sources');
  console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
