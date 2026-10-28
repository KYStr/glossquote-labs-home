const module = await import('./adapter.mjs');
if (Object.keys(module).join(',') !== 'runAdapter') throw new Error('ADAPTER_EXPORT_CHANGED');
console.log(JSON.stringify({ scope: 'OFFLINE_IMPORT_ONLY', exports: Object.keys(module), nativeStarted: false }));
