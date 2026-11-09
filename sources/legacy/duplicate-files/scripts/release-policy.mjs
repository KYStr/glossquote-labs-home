// Reviewed M1 public bytes: B20-48-M1-2026-10-23. No runtime/environment input.
export const ORIGIN = 'https://duplicates.glossquote.com';
export const TOOL_SLUG = 'duplicate-files';
export const SERVE_SHA256 = 'a810dd96c8e90f9f44518061f93dc331dacfa65aef85e53d37a15d8fe2e3ad5b';
export const APPROVED_PUBLIC = Object.freeze([
  ['css/app.css', 8584, '9dbec4aaa56d3a9dd714b091649f0e9b4f3bfaa3bbc04d39cdaaa75c8e7d55d3'],
  ['en/index.html', 6384, '036706c031d784bc6753a6ed0c467ed214c258745f1a9880c4e99ac01ee143b1'],
  ['index.html', 6201, '52cc3aa191221617a79f9b1bf1f41e50c1e9383fa7bb7d20ed5f1577490fab1b'],
  ['js/analysis-worker.js', 1012, 'b57415348bd30961c0220c73f2292bdd7a3a676c58e8cf115db0a6a15dcc6ce7'],
  ['js/app.js', 3017, '6839855b1147012ed70f1cb7d83b9404d39dc49b5dc938dc74f06924c7c2f454'],
  ['js/core/analyze.js', 4465, '305f613f64e34df6a993b0897ff9c81094e2ab153ccfc24643ef0a3d9ad17817'],
  ['js/core/compare.js', 1130, 'ce36b3364bbb835f604bf631218106be6d269f3013fbeab0ceea8c19dc605721'],
  ['js/core/limits.js', 2925, '32c575ccd6f33a6c508facb95adb8888815b4ba6c8ffae39f2f8face0739c84b'],
  ['js/core/report.js', 3091, '109b905167780c6641cdfd0bebefaefbec00005b3d8915cad9e359927c039b81'],
  ['js/core/session.js', 6588, '620fe9476a288fdd8a2b86895559161b78b021ad6d1f2efa709fbb57f2c441c8'],
  ['js/ui.js', 14684, '3d77b72320d0f8ccd63557239385af9fd3d43d576f740b4580162c4778c51b6c']
].map(([path, bytes, sha256]) => Object.freeze({ path, bytes, sha256 })));
export const PAGES = Object.freeze({
  // M2A authorizes removing exactly one banner line; all remaining body bytes
  // are anchored to the reviewed M1 content. Preview source stays unchanged.
  'index.html': Object.freeze({ lang: 'zh-Hant', title: '重複檔案找出來｜本機檔案比對', description: '在瀏覽器本機找出內容完全相同的檔案，確認要保留哪一份，再下載清單。', h1: '找出內容相同的檔案', candidate: '本機候選版；尚未部署', releaseBodySha256: '3ba319527776b2d1888fdfae57ed831c7084699e19dca4ce344735bba73eedde' }),
  'en/index.html': Object.freeze({ lang: 'en', title: 'Find Duplicate Files — Local File Comparison', description: 'Find byte-identical files in your browser, choose which copy to keep, and download a report.', h1: 'Find files with identical content', candidate: 'Local candidate; not deployed', releaseBodySha256: 'd30f6c6c06bf0fb5776484e510493b25ae19489c0d970a06a82e9758530c0340' })
});
