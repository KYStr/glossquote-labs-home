import { readFile, mkdir, writeFile, lstat, realpath } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { sha256 } from './files.mjs';

const crcTable = Array.from({length:256},(_,i)=>{let n=i;for(let bit=0;bit<8;bit++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
const unsafeSegment=part=>!part||part==='.'||part==='..'||part.startsWith('.')||/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part)||/[<>:"|?*\u0000-\u001f]/u.test(part)||/[. ]$/.test(part);
export function parseSourceZip(bytes) {
  if(bytes.length>5242880||bytes.length<22)throw new Error('ZIP size');
  let end=-1;for(let pos=bytes.length-22;pos>=Math.max(0,bytes.length-65557);pos--)if(bytes.readUInt32LE(pos)===0x06054b50){end=pos;break;}
  if(end<0||bytes.readUInt16LE(end+4)||bytes.readUInt16LE(end+6))throw new Error('ZIP structure');
  const count=bytes.readUInt16LE(end+10),size=bytes.readUInt32LE(end+12),offset=bytes.readUInt32LE(end+16),comment=bytes.readUInt16LE(end+20);
  if(count>100||bytes.readUInt16LE(end+8)!==count||offset+size!==end||end+22+comment!==bytes.length)throw new Error('ZIP bounds');
  const names=new Set(),files=new Map();let position=offset,total=0;
  for(let entry=0;entry<count;entry++){
    if(position+46>end||bytes.readUInt32LE(position)!==0x02014b50)throw new Error('ZIP central entry');
    const flags=bytes.readUInt16LE(position+8),method=bytes.readUInt16LE(position+10),crc=bytes.readUInt32LE(position+16),compressed=bytes.readUInt32LE(position+20),expanded=bytes.readUInt32LE(position+24),nameLength=bytes.readUInt16LE(position+28),extra=bytes.readUInt16LE(position+30),note=bytes.readUInt16LE(position+32),mode=bytes.readUInt32LE(position+38)>>>16,local=bytes.readUInt32LE(position+42);
    const filename=bytes.subarray(position+46,position+46+nameLength).toString('utf8');position+=46+nameLength+extra+note;
    if(position>end||(flags&1)||![0,8].includes(method)||filename.includes('\\')||filename.startsWith('/')||filename.includes('\ufffd')||(mode&0xf000)===0xa000)throw new Error('Unsafe ZIP entry');
    const folder=filename.endsWith('/'),parts=filename.replace(/\/$/,'').split('/');if(parts.some(unsafeSegment)&&filename!=='.gitignore')throw new Error('Unsafe ZIP path');
    if(names.has(filename.toLowerCase()))throw new Error('ZIP duplicate');names.add(filename.toLowerCase());
    if(local+30>offset||bytes.readUInt32LE(local)!==0x04034b50)throw new Error('ZIP local entry');
    const localNameLength=bytes.readUInt16LE(local+26),localExtra=bytes.readUInt16LE(local+28),dataStart=local+30+localNameLength+localExtra;
    assert.equal(bytes.subarray(local+30,local+30+localNameLength).toString('utf8'),filename);assert.equal(bytes.readUInt16LE(local+8),method);assert.equal(bytes.readUInt16LE(local+6),flags);
    if(dataStart+compressed>offset||expanded>512000||(total+=expanded)>5242880)throw new Error('ZIP output bound');
    const packed=bytes.subarray(dataStart,dataStart+compressed),plain=method===0?Buffer.from(packed):inflateRawSync(packed,{maxOutputLength:512000});
    if(plain.length!==expanded||crc32(plain)!==crc)throw new Error('ZIP integrity');
    if(folder){if(plain.length)throw new Error('ZIP directory data');continue;}
    if(mode&&(mode&0xf000)!==0x8000)throw new Error('ZIP file type');files.set(filename,plain);
  }
  if(position!==end)throw new Error('ZIP central length');return files;
}
export async function extractAndCompare({repo,commit,zip,output,git='C:/Program Files/Git/cmd/git.exe'}) {
  if(!/^[0-9a-f]{40}$/.test(commit)||![repo,zip,output,git].every(path.isAbsolute)||!path.resolve(output).replaceAll('\\','/').includes('/.runs/github-publish/glossquote-labs-list-compare/'))throw new Error('Archive arguments/scope');
  const run=args=>{const r=spawnSync(git,['-C',repo,...args],{maxBuffer:5242880,windowsHide:true});if(r.status!==0)throw new Error('Git blob audit failed');return r.stdout;};
  const expected=run(['ls-tree','-r','--full-tree','-z',commit]).toString('utf8').split('\0').filter(Boolean).map(item=>{const [head,file]=item.split('\t');if(!head.startsWith('100644 blob '))throw new Error('Non-regular Git source');return file;});
  const bytes=await readFile(zip),files=parseSourceZip(bytes);assert.deepEqual([...files.keys()].sort(),expected.sort());
  const parent=path.dirname(path.resolve(output)),info=await lstat(parent);if(!info.isDirectory()||info.isSymbolicLink()||path.resolve(await realpath(parent)).toLowerCase()!==parent.toLowerCase())throw new Error('Unsafe extraction parent');await mkdir(output);
  const records=[];
  for(const file of expected){const data=files.get(file),blob=run(['show',`${commit}:${file}`]);assert.deepEqual(data,blob,`Git ZIP blob bytes ${file}`);const destination=path.resolve(output,file);if(!destination.toLowerCase().startsWith(path.resolve(output).toLowerCase()+path.sep))throw new Error('Extraction escape');await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,data,{flag:'wx'});records.push({path:file,bytes:data.length,sha256:sha256(data)});}
  return {status:'PASS',commit,zip,zipBytes:bytes.length,zipSha256:sha256(bytes),output,records,sourceDigest:sha256(Buffer.from(JSON.stringify(records)))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const [repo,commit,zip,output]=process.argv.slice(2);console.log(JSON.stringify(await extractAndCompare({repo,commit,zip,output}),null,2));}
