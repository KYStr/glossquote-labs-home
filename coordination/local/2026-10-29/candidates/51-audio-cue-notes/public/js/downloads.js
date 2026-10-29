import { serializeJson, checkExportBytes } from './core/serialize-json.js';
import { serializeMarkdown } from './core/serialize-markdown.js';

export class Downloads {
  constructor(io) {
    this.io = io;
    this.urls = new Map();
  }

  clear() {
    for (const [url, timer] of this.urls) {
      this.io.cancel(timer);
      this.io.revoke(url);
    }
    this.urls.clear();
  }

  export(result, format) {
    this.clear();
    const bytes = format === 'json' ? serializeJson(result) : format === 'markdown'
      ? serializeMarkdown(result) : { error: 'INVALID_RESULT' };
    if (bytes.error) return bytes;
    // Serializers and the download boundary both check complete bytes before Blob.
    if (checkExportBytes(bytes).error) return { error: 'EXPORT_TOO_LARGE' };
    let url;
    try {
      const blob = this.io.blob(bytes, format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8');
      url = this.io.create(blob);
      this.urls.set(url, null);
      this.io.activate(url, format === 'json' ? 'notes.json' : 'notes.md');
      const timer = this.io.later(() => {
        if (this.urls.delete(url)) this.io.revoke(url);
      });
      if (this.urls.has(url)) this.urls.set(url, timer);
      return { ok: true, bytes: bytes.byteLength };
    } catch {
      if (url && this.urls.delete(url)) this.io.revoke(url);
      return { error: 'DOWNLOAD_FAILED' };
    }
  }
}
