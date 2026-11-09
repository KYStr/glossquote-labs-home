// 此模組只放在 test-product，透過真實 File/Canvas/DOM 測試；不進正式產物。
const run = document.getElementById('run-browser-tests'), log = document.getElementById('browser-test-log');
const byId = id => document.getElementById(id);
const assert = (value, message) => { if (!value) throw Error(message); };
const wait = async predicate => { const start = performance.now(); while (!predicate()) { if (performance.now() - start > 10000) throw Error('Timeout'); await new Promise(resolve => setTimeout(resolve, 20)); } };
const pixels = () => [...byId('preview').getContext('2d').getImageData(0, 0, 1, 1).data];
const choose = async (id, file) => { const transfer = new DataTransfer(); transfer.items.add(file); const input = byId(id); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true })); await wait(() => !input.disabled); };
const preview = async () => { byId('generate').click(); await wait(() => !byId('cancel').disabled || !byId('canvas-wrap').hidden); await wait(() => byId('cancel').disabled); assert(!byId('canvas-wrap').hidden, byId('status').textContent); };
const image = async (color, width = 2, mime = 'image/png', name = 'synthetic.png') => {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = 1; const context = canvas.getContext('2d');
  context.fillStyle = color; context.fillRect(0, 0, width, 1);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, 1)); canvas.width = canvas.height = 1;
  assert(blob && blob.type === mime, `Cannot encode ${mime}`); return new File([blob], name, { type: mime });
};
run.addEventListener('click', async () => {
  run.disabled = true; log.textContent = '';
  let passed = 0;
  const check = async (name, fn) => { await fn(); passed++; log.textContent += `PASS ${name}\n`; };
  try {
    const a = await image('rgb(20,40,60)'), b = await image('rgb(80,100,120)');
    await check('native PNG pair and 50% overlay', async () => { byId('clear').click(); await choose('before', a); await choose('after', b); await preview(); assert(JSON.stringify(pixels()) === '[50,70,90,255]', String(pixels())); });
    await check('opacity input clears old result, 0% shows A', async () => { byId('opacity').value = '0'; byId('opacity').dispatchEvent(new Event('input')); assert(byId('canvas-wrap').hidden, 'stale result'); await preview(); assert(JSON.stringify(pixels()) === '[20,40,60,255]', String(pixels())); });
    await check('100% shows B', async () => { byId('opacity').value = '100'; byId('opacity').dispatchEvent(new Event('input')); await preview(); assert(JSON.stringify(pixels()) === '[80,100,120,255]', String(pixels())); });
    await check('absolute RGB difference, mode invalidation', async () => { const mode = document.querySelector('input[value="difference"]'); mode.checked = true; mode.dispatchEvent(new Event('change')); assert(byId('canvas-wrap').hidden, 'stale mode'); await preview(); assert(JSON.stringify(pixels()) === '[60,60,60,255]', String(pixels())); });
    await check('cancel while rendering never publishes stale result', async () => { byId('generate').click(); byId('cancel').click(); await new Promise(resolve => setTimeout(resolve, 80)); assert(byId('canvas-wrap').hidden, 'cancelled result appeared'); });
    await check('same JPEG decode compares to black', async () => { byId('clear').click(); const jpg = await image('rgb(90,60,30)', 2, 'image/jpeg', 'native.jpg'); await choose('before', jpg); await choose('after', jpg); const mode = document.querySelector('input[value="difference"]'); mode.checked = true; mode.dispatchEvent(new Event('change')); await preview(); assert(JSON.stringify(pixels()) === '[0,0,0,255]', String(pixels())); });
    await check('decoded mismatched dimensions rejected', async () => { await choose('after', await image('black', 3)); assert(byId('generate').disabled && byId('canvas-wrap').hidden, 'mismatch accepted'); });
    await check('bad PNG CRC rejected and old result absent', async () => { const bad = new Uint8Array(await a.arrayBuffer()); bad[20] ^= 1; await choose('after', new File([bad], 'damaged.png', { type: 'image/png' })); assert(byId('generate').disabled && byId('canvas-wrap').hidden, 'damaged file accepted'); });
    await check('hostile filename remains plain text', async () => { const name = '<img src=x onerror=alert(1)>.png'; await choose('before', new File([a], name, { type: 'image/png' })); assert(byId('before-meta').textContent.includes(name), 'name lost'); assert(!document.querySelector('img[src="x"]'), 'name parsed as HTML'); });
    await check('transparent source flattens onto white', async () => { byId('clear').click(); await choose('before', await image('rgba(0,0,0,0)')); await choose('after', await image('white')); await preview(); assert(JSON.stringify(pixels()) === '[255,255,255,255]', String(pixels())); });
    await check('1:1 display and clear control', async () => { byId('actual-size').click(); assert(byId('canvas-wrap').classList.contains('actual'), '1:1 not set'); byId('clear').click(); assert(byId('canvas-wrap').hidden && byId('preview').width === 1 && byId('generate').disabled, 'clear failed'); });
    log.textContent += `\n${passed}/${passed} PASS · ${document.documentElement.lang}\nNative APIs + scripted DOM interactions; not manual keyboard/file-picker/AT coverage.`;
  } catch (error) { log.textContent += `\nFAIL after ${passed} passed: ${error.message}`; }
  finally { run.disabled = false; }
});
