// This listener is registered before any module/schema initialization can fail.
const form = document.getElementById('cut-form');
form?.addEventListener('submit', event => event.preventDefault());
try {
  const { initialize } = await import('./app.mjs');
  initialize();
} catch {
  document.getElementById('init-error').hidden = false;
}
