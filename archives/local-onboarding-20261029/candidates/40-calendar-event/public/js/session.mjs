import { validateEvent } from './core/event.mjs';
import { serializeIcs, utcStamp } from './core/ics.mjs';

// Memory-only lifecycle; dependencies are supplied by the page (or offline tests).
export function createSession({ randomUUID, now, createFileUrl, revokeFileUrl }) {
  let revision = 0;
  let ready = null;
  function invalidate() {
    if (ready?.url) { try { revokeFileUrl(ready.url); } catch { /* Link is removed by the page even if revocation is unavailable. */ } }
    ready = null; revision++;
  }
  return {
    invalidate,
    reset: invalidate,
    get revision() { return revision; },
    preview(draft) {
      const result = validateEvent(draft);
      if (!result.ok) { invalidate(); return { ...result, status: result.errors.some(e => e.code === 'UNSUPPORTED_ZONE') ? 'unsupported' : 'invalid' }; }
      // Validation rejects unknown keys/types before taking this private in-memory signature.
      const signature = JSON.stringify(draft);
      if (ready && ready.signature === signature && ready.revision === revision) return ready;
      if (ready) invalidate();
      try {
        const uid = `${randomUUID()}@glossquote.com`;
        const dtstamp = utcStamp(now());
        const ics = serializeIcs(result.event, { uid, dtstamp });
        let url = null;
        try { url = createFileUrl?.(ics) ?? null; } catch { /* Keep the successful preview when downloads are unavailable. */ }
        if (typeof url !== 'string' || !url.startsWith('blob:')) { if (url) { try { revokeFileUrl(url); } catch { /* No retained URL. */ } } url = null; }
        ready = { ...result, status: 'ready', ics, uid, dtstamp, url, signature, revision };
        return ready;
      } catch (error) {
        invalidate();
        return { ok: false, status: 'unsupported', event: result.event, ambiguities: result.ambiguities,
          errors: [{ code: error?.code === 'FILE_TOO_LARGE' ? 'FILE_TOO_LARGE' : 'GENERATION_UNAVAILABLE', field: 'form' }] };
      }
    },
  };
}
