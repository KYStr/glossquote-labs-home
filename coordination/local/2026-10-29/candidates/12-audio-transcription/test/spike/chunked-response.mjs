// Diagnostic H1 only. Each consumer owns bounded chunks; verified bytes never alias reads.
export const RESPONSE_CHUNK_BYTES = 1024 * 1024;
export function chunkedResponse(entry) {
  const bytes = entry.buffer;
  let offset = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (offset === bytes.byteLength) { controller.close(); return; }
      const end = Math.min(offset + RESPONSE_CHUNK_BYTES, bytes.byteLength);
      controller.enqueue(bytes.slice(offset, end));
      offset = end;
    },
  }, { highWaterMark: 0 });
  return new Response(body, { status: 200, headers: { 'Content-Type': entry.mime, 'Content-Length': String(bytes.byteLength) } });
}
