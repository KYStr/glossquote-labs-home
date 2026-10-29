// Preview-only、零相依；驗完整來源及輸出後才用 staged rename 安裝。
import { mkdirSync, mkdtempSync, writeFileSync, renameSync, rmSync, rmdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateProject } from './semantics.mjs';
import { ordinaryDirectory, snapshotProject, validateTree } from './files.mjs';
export function buildProject(root) {
  ordinaryDirectory(root);
  const snapshot = snapshotProject(root), files = snapshot.assets, target = join(root, 'dist');
  // 來源已快照；先驗同一份 bytes 語意再建立 stage，避免 build 繞過 check。
  validateProject(snapshot);
  const exists = validateTree(target, { allowAbsent: true });
  const stage = mkdtempSync(join(root, '.preview-stage-'));
  let backup = null, moved = false, installed = false;
  try {
    mkdirSync(join(stage, 'en')); mkdirSync(join(stage, 'js'));
    for (const [name, bytes] of files) writeFileSync(join(stage, name), bytes, { flag: 'wx', mode: 0o644 });
    validateTree(stage);
    if (validateTree(target, { allowAbsent: true }) !== exists) throw new Error('Output changed while staging.');
    if (exists) { backup = mkdtempSync(join(root, '.preview-backup-')); renameSync(target, join(backup, 'previous')); moved = true; }
    renameSync(stage, target); installed = true;
    // 刪除前重新檢查整個已知樹；未知檔案留下且拋錯，絕不盲目 rm(dist)。
    if (moved) { validateTree(join(backup, 'previous')); rmSync(join(backup, 'previous'), { recursive: true }); rmdirSync(backup); }
    return { files: files.size, output: target };
  } catch (error) {
    if (moved && !installed) { renameSync(join(backup, 'previous'), target); rmdirSync(backup); }
    throw error;
  } finally {
    // 未完整建成的 stage 不盲目刪除；安全確認完整樹後才清理。
    if (!installed) { try { validateTree(stage); rmSync(stage, { recursive: true }); } catch { /* 保留需人工核對的 stage。 */ } }
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.versions.node.split('.')[0] < 24 || process.argv.length !== 2) throw new Error('Node 24+ and no build arguments required.');
  const result = buildProject(fileURLToPath(new URL('../', import.meta.url)));
  console.log(`Noindex preview: ${result.files} files. No deployment performed.`);
}
