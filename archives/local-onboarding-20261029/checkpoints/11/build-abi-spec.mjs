import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(await fs.readFile(path.join(root, 'sources/sdk-reference.json'), 'utf8'));
const bytes = await fs.readFile(path.join(root, 'sources/ProcessSnapshot.h'));
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), source.sha256);
const text = bytes.toString('utf8');
const start = text.indexOf('typedef struct', text.indexOf('} PSS_THREAD_FLAGS;'));
const end = text.indexOf('} PSS_THREAD_ENTRY;', start);
assert(start >= 0 && end > start);
const declarations = [...text.slice(start, end).matchAll(/^\s*(DWORD|void\*|ULONG_PTR|int|WORD|FILETIME|PSS_THREAD_FLAGS|PCONTEXT)\s+(\w+)\s*;/gm)].map((m) => ({ sdkType: m[1], sdkName: m[2] }));
const names = ['exitStatus','teb','processId','threadId','affinity','priority','basePriority','lastArgument','lastSyscall','create','exit','kernel','user','startAddress','capture','flags','suspendCount','contextSize','context'];
const expectedNames = ['ExitStatus','TebBaseAddress','ProcessId','ThreadId','AffinityMask','Priority','BasePriority','LastSyscallFirstArgument','LastSyscallNumber','CreateTime','ExitTime','KernelTime','UserTime','Win32StartAddress','CaptureTime','Flags','SuspendCount','SizeOfContextRecord','ContextRecord'];
assert.deepEqual(declarations.map((d) => d.sdkName), expectedNames);
const types = { DWORD: [4,4,'System.UInt32'], 'void*': [8,8,'System.IntPtr'], ULONG_PTR: [8,8,'System.UIntPtr'], int: [4,4,'System.Int32'], WORD: [2,2,'System.UInt16'], FILETIME: [8,4,'GlossQuote.MU20.Native+Ft'], PSS_THREAD_FLAGS: [4,4,'System.UInt32'], PCONTEXT: [8,8,'System.IntPtr'] };
let offset = 0;
const fields = declarations.map((d,i) => { const [size,alignment,managedType] = types[d.sdkType]; offset = Math.ceil(offset / alignment) * alignment; const field = {...d, managedName:names[i], managedType, offset, size, alignment}; offset += size; return field; });
const size = Math.ceil(offset/8)*8;
assert.equal(size,120);
for(const [name,value] of [['PSS_CAPTURE_THREADS',0x80],['PSS_WALK_THREADS',3],['PSS_THREAD_FLAGS_TERMINATED',1]]) {
 const m=text.match(new RegExp(name+'\\s*=\\s*(0x[0-9a-f]+|[0-9]+)','i')); assert(m); assert.equal(Number(m[1]),value);
}
const result = { status:'PASS_HEADER_DERIVED_X64_LAYOUT', source, basis:'Pinned Microsoft WinSDK recompiled header plus documented Windows x64 natural sizes/alignment; no installed SDK, native C++ sizeof or PSS execution claimed.', pointerBytes:8, pack:8, size, filetimeSize:8, filetimePack:4, fields,
 constants:{CaptureThreads:128,WalkThreads:3,ThreadTerminated:1,ErrorNoMoreItems:259},
 semantics:{CreateTime:'SDK FILETIME for thread creation; native calibration must still establish nonzero capture value under flag0x80. Zero/mismatch rejects.',ContextRecord:'Pointer valid for walk-marker lifetime; never dereferenced or captured by this candidate.',Flags:'PSS_THREAD_FLAGS_TERMINATED bit1 is not process exit status STILL_ACTIVE259.',PssEnd:'ERROR_NO_MORE_ITEMS259 ends a walk; Wait timeout258 separately means nonsignaled.'},
 references:['https://learn.microsoft.com/en-us/cpp/build/x64-software-conventions?view=msvc-170','https://learn.microsoft.com/en-us/windows/win32/winprog/windows-data-types','https://learn.microsoft.com/en-us/windows/win32/api/minwinbase/ns-minwinbase-filetime','https://learn.microsoft.com/en-us/windows/win32/api/processsnapshot/ns-processsnapshot-pss_thread_entry','https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--0-499-'] };
await fs.writeFile(path.join(root,'abi-spec.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,fields:fields.length,size,sourceCommit:source.commit}));
