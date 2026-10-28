const pageReadDiagnostics=undefined;let pageReadId=0;const pageReadReceipts=new Map();
async function getBytes(assetPath, cap, ordinal) {
  const receipt = pageReadDiagnostics?.createReadReceipt({ scopeCode: 2, ordinal, readId: ++pageReadId, expectedBytes: cap });
  if (receipt) pageReadReceipts.set(ordinal, receipt);
  const events = pageReadDiagnostics?.READ_EVENT, reasons = pageReadDiagnostics?.READ_REASON;
  let response, size = 0, completed = false, reasonCode = 0;
  const snapshot = () => ({ receivedBytes: size, readerLocked: Number(Boolean(response?.body?.locked)), lockObserved: 1 });
  try {
    response = await fetch(assetPath, { credentials: 'omit', redirect: 'error', cache: 'no-store' });
    if (response.status !== 200 || !response.body) { reasonCode = reasons?.RESPONSE_REJECTED ?? 0; throw new Error('FIXTURE_OR_MANIFEST_UNAVAILABLE'); }
    const reader = response.body.getReader(), buffer = new Uint8Array(cap);
    receipt?.record(events.READER_ACQUIRED, snapshot());
    for (;;) {
      const { done, value } = await reader.read();
      if (done) { receipt?.record(events.EOF, { ...snapshot(), eof: 1 }); break; }
      if (size + value.byteLength > cap) { reasonCode = reasons?.SIZE_CAP ?? 0; receipt?.record(events.CANCEL_CALLED, { ...snapshot(), reasonCode }); await reader.cancel(); throw new Error('FIXTURE_OR_MANIFEST_TOO_LARGE'); }
      buffer.set(value, size); size += value.byteLength; receipt?.update({ receivedBytes: size });
    }
    completed = true; return buffer.subarray(0, size);
  } catch (error) {
    receipt?.record(events.ERROR, { ...snapshot(), outcomeCode: 2, reasonCode: reasonCode || reasons.READ_ERROR }); throw error;
  } finally {
    // Observe the current lock without releasing or cancelling a successful read.
    receipt?.record(events.FINISH, { ...snapshot(), outcomeCode: completed ? 1 : 2, reasonCode: reasonCode || (completed ? 0 : reasons.READ_ERROR) });
  }
}
export {getBytes};
