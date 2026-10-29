// Reviewed M1 R01 inputs. Publication preparation never accepts a new source
// merely because an editable output manifest claims it is valid.
export const ORIGIN = 'https://audio-notes.glossquote.com';
export const TOOL_SLUG = 'audio-cue-notes';
export const SOURCE_FILES = Object.freeze([
  ['css/app.css', 7252, '6d1c27a2132518a1b087930a67cfbb169122cb96bc710fcdc880ecc7fb45a40c'],
  ['en/index.html', 7596, '9d03b0bc8f08445fa1f7a9874e5e0b4aefd9ffd446de8d3d800a831cf3074213'],
  ['index.html', 7413, '0feb67d0d1d1af3d032c69b2951df684598c73cd525d5b194b1454186c5a016c'],
  ['js/app.js', 1172, '80b0cc3a82a0ba45b25f0412faee77524da8bb15b7d9f9370eff1bf318de6f3c'],
  ['js/audio-controller.js', 3672, 'a8837f9e55efa6c4fb2625379ba4dcbd2c2701ba0fc7891ee85f6fcaba2d7a82'],
  ['js/core/notes.js', 4831, '134d0c0948e8d73bef6f133f47a6d161edd104bbc55f2f830bc9bbbb28af44ea'],
  ['js/core/serialize-json.js', 781, '0d595dde8351415236fd78a849d5595b74fb51ded89faa9bd027fed70be72427'],
  ['js/core/serialize-markdown.js', 928, '16230a6e21ef9c029c8cf02e37a5a988f79efb674b751d048fc6da701ab96df9'],
  ['js/core/validate-json.js', 2400, 'd21b6fbb59a822bc9956c903e39311768e4ce4a7f1e9742d9aedcc3dc5002389'],
  ['js/downloads.js', 1412, 'ddbbcb3b27e906252d9a3967de90def97d47fb1809e973633b3bb1e8561e915d'],
  ['js/i18n.js', 17700, '5ea1cc54135ac209a44e1abb7d1e561e5ea817d023cbb4e285959d73919d0764'],
  ['js/ui.js', 12095, 'ebd50489887f0a9b7f7e81804b84ac036738566f599c0a53815b2b10b7cb5b63'],
  ['js/workspace.js', 8292, '5f8056a9884ab4006f3133eab7cd83c59eebe14c86a26e6f4b7b852744e0d351']
].map(([path, bytes, sha256]) => Object.freeze({ path, bytes, sha256 })));
export const SECURITY_SOURCE = Object.freeze({
  path: 'scripts/serve.mjs', bytes: 2401,
  sha256: 'efac4d41206ea6ae3b9742dfb2f82e88c8a7c705a76142c148c71d28886c3164'
});
// Transcribed from the existing serve.mjs security header values. Content-Type
// is route-specific MIME, not a global security directive; hosting supplies it.
export const SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'index, follow',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; media-src blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Permissions-Policy': 'microphone=(), camera=(), geolocation=()'
});
export const PAGE_EXPECTATIONS = Object.freeze({
  'index.html': Object.freeze({
    lang: 'zh-Hant', title: '錄音時間戳筆記｜Gloss Tools', h1: '邊聽錄音，邊記下時間戳',
    description: '本機播放訪談或課程錄音，按一下記下目前時間與重點，點筆記回跳，下載或重新匯入筆記。',
    warning: '本地候選'
  }),
  'en/index.html': Object.freeze({
    lang: 'en', title: 'Timestamped Audio Notes | Gloss Tools', h1: 'Take notes while listening to audio',
    description: 'Play an audio file locally, capture notes at the current time, jump back to a note, and export or re-import your notes.',
    warning: 'Local candidate'
  })
});
