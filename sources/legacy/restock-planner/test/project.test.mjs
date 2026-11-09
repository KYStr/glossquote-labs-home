import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { ROOT } from '../scripts/lib/files.mjs';
import { validatePublic, validateText } from '../scripts/lib/validate.mjs';

test('preview assets are closed and bilingual', async () => {
  assert.ok((await validatePublic(path.join(ROOT, 'public'))).length >= 5);
});
test('static checker rejects unsafe HTML and APIs', () => {
  const prefix = '<meta name="robots" content="noindex,nofollow">';
  for (const bad of ['<script>alert(1)</script>', '<input>', '<button disabled>Run</button>', '<img src="https://example.invalid/a">', '<style>x{}</style>', '<form></form>']) assert.throws(() => validateText('index.html', prefix + bad));
  for (const bad of ['fetch("/")', 'node.innerHTML = value', 'localStorage.x = 1', 'console.log(value)', 'window.confirm("x")', 'confirm("x")', 'window.prompt("x")']) assert.throws(() => validateText('js/app.js', bad));
  assert.doesNotThrow(() => validateText('js/app.js', 'model.confirm();'));
  assert.throws(() => validateText('styles/app.css', '@import "x.css";'));
  assert.throws(() => validateText('js/app.js', 'import x from "https://example.invalid/x.js";'));
});
