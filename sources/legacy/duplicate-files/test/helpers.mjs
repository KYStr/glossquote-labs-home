import { File } from 'node:buffer';
import { describeFiles } from '../public/js/core/limits.js';
export const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
export const EMPTY = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
export const file = (name, content = '') => new File([content], name);
export const fixtureFiles = () => [file('a', 'abc'), file('b', 'abc'), file('c', 'abd'), file('d'), file('e')];
export const fixture = () => describeFiles(fixtureFiles());
export function descriptor(sizeBytes, sourceIndex = 0, reads = { count: 0 }) {
  const name = `synthetic-${sourceIndex}`;
  return { sourceIndex, name, sizeBytes, file: { name, size: sizeBytes,
    arrayBuffer() { reads.count++; throw new Error('Must not read metadata-only fixture'); },
    slice() { reads.count++; throw new Error('Must not slice metadata-only fixture'); } } };
}
export class FakeWorker {
  constructor() { this.terminated = 0; this.sent = []; }
  postMessage(message) { this.sent.push(message); this.lastHandler = this.onmessage; }
  terminate() { this.terminated++; }
  deliver(message) { this.onmessage?.({ data: message }); }
}
