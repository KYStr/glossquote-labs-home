import { inflateRawSync } from 'node:zlib';
import { readFile, writeFile, mkdir, readdir, lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { verifyRoot, verifyPath, inside, sha256 } from './validation.mjs';

const MAX_ENTRY = 1048576, MAX_ARCHIVE = 16777216;
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function safeName(name) {
  if (!/^[A-Za-z0-9_./-]+$/.test(name) || name.startsWith('/') || name.includes('//')) throw new Error('ZIP_UNSAFE_PATH');
  const parts = name.replace(/\/$/, '').split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part) || part.endsWith('.'))) throw new Error('ZIP_UNSAFE_PATH');
}
export function inspectZip(bytes, expectedFiles, expectedCommit = null) {
  if (!Buffer.isBuffer(bytes) || bytes.length > MAX_ARCHIVE || bytes.length < 22) throw new Error('ZIP_SIZE');
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50 && offset + 22 + bytes.readUInt16LE(offset + 20) === bytes.length) { end = offset; break; }
  }
  if (end < 0 || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6)) throw new Error('ZIP_DIRECTORY');
  const count = bytes.readUInt16LE(end + 10), centralSize = bytes.readUInt32LE(end + 12), centralStart = bytes.readUInt32LE(end + 16);
  if (count !== bytes.readUInt16LE(end + 8) || count > 256 || centralStart + centralSize !== end) throw new Error('ZIP_DIRECTORY');
  const comment = bytes.subarray(end + 22).toString('utf8');
  if (expectedCommit !== null && comment !== expectedCommit) throw new Error('ZIP_COMMIT_COMMENT');
  const expected = new Map(expectedFiles.map(file => [file.path, file]));
  if (expected.size !== expectedFiles.length) throw new Error('EXPECTED_DUPLICATE_PATH');
  const directories = new Set(expectedFiles.flatMap(file => { const parts = file.path.split('/'); return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/') + '/'); }));
  const seen = new Set(), ranges = [], files = [];
  let cursor = centralStart;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error('ZIP_ENTRY');
    const flags = bytes.readUInt16LE(cursor + 8), method = bytes.readUInt16LE(cursor + 10), crc = bytes.readUInt32LE(cursor + 16);
    const packed = bytes.readUInt32LE(cursor + 20), size = bytes.readUInt32LE(cursor + 24);
    const nameSize = bytes.readUInt16LE(cursor + 28), extra = bytes.readUInt16LE(cursor + 30), note = bytes.readUInt16LE(cursor + 32);
    const attrs = bytes.readUInt32LE(cursor + 38), local = bytes.readUInt32LE(cursor + 42);
    const next = cursor + 46 + nameSize + extra + note;
    if (next > end || flags & ~0x080e || ![0, 8].includes(method) || size > MAX_ENTRY || packed > MAX_ENTRY) throw new Error('ZIP_LIMIT_OR_METHOD');
    const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(cursor + 46, cursor + 46 + nameSize)); safeName(name);
    if (seen.has(name.toLowerCase())) throw new Error('ZIP_DUPLICATE_PATH'); seen.add(name.toLowerCase());
    const directory = name.endsWith('/'), type = (attrs >>> 16) & 0xf000;
    if ((directory && ![0, 0x4000].includes(type)) || (!directory && ![0, 0x8000].includes(type))) throw new Error('ZIP_LINK_OR_SPECIAL');
    if (directory ? !directories.has(name) : !expected.has(name)) throw new Error('ZIP_UNKNOWN_ENTRY');
    if (local + 30 > centralStart || bytes.readUInt32LE(local) !== 0x04034b50 || bytes.readUInt16LE(local + 6) !== flags || bytes.readUInt16LE(local + 8) !== method) throw new Error('ZIP_LOCAL_HEADER');
    const localName = bytes.readUInt16LE(local + 26), localExtra = bytes.readUInt16LE(local + 28);
    const payload = local + 30 + localName + localExtra;
    if (payload + packed > centralStart || !bytes.subarray(local + 30, local + 30 + localName).equals(bytes.subarray(cursor + 46, cursor + 46 + nameSize))) throw new Error('ZIP_LOCAL_NAME');
    let finish = payload + packed;
    if (flags & 8) {
      if (finish + 12 > centralStart) throw new Error('ZIP_DESCRIPTOR');
      if (bytes.readUInt32LE(finish) === 0x08074b50) finish += 4;
      if (finish + 12 > centralStart || bytes.readUInt32LE(finish) !== crc || bytes.readUInt32LE(finish + 4) !== packed || bytes.readUInt32LE(finish + 8) !== size) throw new Error('ZIP_DESCRIPTOR');
      finish += 12;
    } else if (bytes.readUInt32LE(local + 14) !== crc || bytes.readUInt32LE(local + 18) !== packed || bytes.readUInt32LE(local + 22) !== size) throw new Error('ZIP_LOCAL_SIZE');
    ranges.push([local, finish]);
    const compressed = bytes.subarray(payload, payload + packed);
    const data = method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed, { maxOutputLength: MAX_ENTRY });
    if (data.length !== size || crc32(data) !== crc) throw new Error('ZIP_CRC_OR_SIZE');
    if (directory) { if (size) throw new Error('ZIP_DIRECTORY_DATA'); }
    else {
      const wanted = expected.get(name);
      if (wanted.bytes !== size || wanted.sha256 !== sha256(data)) throw new Error('ZIP_BLOB_MISMATCH');
      files.push({ path: name, bytes: size, sha256: wanted.sha256, data });
    }
    cursor = next;
  }
  ranges.sort((a, b) => a[0] - b[0]);
  if (cursor !== end || files.length !== expected.size || ranges.some((range, index) => index > 0 && range[0] < ranges[index - 1][1])) throw new Error('ZIP_DIRECTORY_OR_OVERLAP');
  return { comment, files: files.sort((a, b) => a.path.localeCompare(b.path, 'en')) };
}
export async function extractZip(bytes, expectedFiles, destination, boundary, commit = null) {
  // Validate every entry, size, mode and blob before any filesystem mutation.
  const inspected = inspectZip(bytes, expectedFiles, commit);
  boundary = await verifyRoot(boundary); destination = resolve(destination);
  if (destination === boundary || !inside(boundary, destination)) throw new Error('ZIP_DESTINATION');
  await verifyPath(boundary, destination, { missing: true, directory: true });
  try { const stat = await lstat(destination); if (!stat.isDirectory() || (await readdir(destination)).length) throw new Error('ZIP_DESTINATION_NOT_EMPTY'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(destination, { recursive: true });
  for (const file of inspected.files) {
    const target = resolve(destination, file.path);
    if (!inside(destination, target)) throw new Error('ZIP_DESTINATION');
    await verifyPath(boundary, target, { missing: true });
    await mkdir(resolve(target, '..'), { recursive: true }); await verifyPath(boundary, target, { missing: true });
    await writeFile(target, file.data, { flag: 'wx' });
    if (sha256(await readFile(target)) !== file.sha256) throw new Error('EXTRACTED_BLOB_MISMATCH');
  }
  return { status: 'PASS_EXACT_GIT_BLOBS', files: inspected.files.map(({ data, ...file }) => file), comment: inspected.comment };
}
