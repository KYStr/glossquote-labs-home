import { emptyProject, validateProject, parseProject } from './schema.mjs';
import { calculateShopping } from './shopping.mjs';
import { InputError } from './quantities.mjs';

export class Session {
  constructor() {
    this.project = emptyProject(); this.revision = 0; this.generation = 0;
    this.state = 'idle'; this.result = null; this.pending = null; this.checked = new Set(); this.error = null;
  }
  invalidate() {
    this.revision++; this.generation++; this.result = null; this.pending = null;
    this.checked.clear(); this.error = null; this.state = 'editing';
  }
  clear() { this.invalidate(); this.project = emptyProject(); this.state = 'idle'; }
  replace(project) { this.invalidate(); this.project = validateProject(project); }
  calculate() {
    this.invalidate();
    try { this.result = calculateShopping(this.project); this.state = 'ready'; return this.result; }
    catch (error) { this.fail(error); return null; }
  }
  fail(error) { this.result = null; this.checked.clear(); this.state = 'error'; this.error = error instanceof InputError ? error : new InputError('UNEXPECTED'); }
  beginImport() { this.invalidate(); this.state = 'running'; return this.generation; }
  preview(text, generation) {
    if (generation !== this.generation) return false;
    try {
      const project = parseProject(text);
      calculateShopping(project); // Also reject aggregate overflow before replacing any source.
      this.pending = project; this.state = 'preview'; return true;
    } catch (error) { this.fail(error); return false; }
  }
  confirmImport() {
    if (!this.pending) return false;
    const project = this.pending;
    this.replace(project); return true;
  }
  cancelImport() { this.invalidate(); }
  markPurchased(key, selected) {
    if (!this.result?.buy.some(row => row.key === key)) return false;
    if (selected) this.checked.add(key); else this.checked.delete(key);
    return true;
  }
}
