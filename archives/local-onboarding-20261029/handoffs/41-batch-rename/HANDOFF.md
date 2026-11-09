# 批次檔名整理 · NEW22-41-M1 交接

2026-10-22（Asia/Taipei），本地候選 `0.1.0`。T00–T05 可執行 CLI gate PASS，交主代理讀實際來源並獨立驗收。**尚未通過完整產品驗收，不是已部署網站。** 六份規格、AGENTS 與 docs 未修改；未更動父專案、兄弟工具、首頁、看板、Git/auth 設定或既有程序。

| 範圍 | 實際狀態 |
| --- | --- |
| T00 靜態骨架／工具鏈 | PASS：loopback/public-only、MIME/method/Host/path、copy isolation |
| T01 檔名 planner | PASS：schema、上限、Unicode、取代、名稱與整批碰撞 |
| T02 ZIP writer | PASS：header/CRC、Python zipfile payload 交叉驗證 |
| T03 雙語 app | 已實作，N/S PASS；真 UI 未驗 |
| T04 邊界與競態 | N/S PASS；B 全部 NOT_RUN_USER_FOCUS_INCIDENT |
| T05 固定本地候選 | N/P/S PASS，8 個 public 檔案與 dist bytes 相同 |
| M2 GitHub source | NOT_PUBLISHED；未建立 repo、未 commit/push，須另行放行 |
| M3 hosting／雙語首頁 | NOT_PUBLISHED；由主代理擁有，未部署 |
| 外部覆核 | NOT_RUN；不宣稱 complete 或 awaiting external review |

## 來源與實際差異

- [package.json](package.json)、[.gitignore](.gitignore)：Node24 ESM、零 runtime/dev dependencies、無 install／lockfile。
- [繁中頁](public/index.html)、[英文頁](public/en/index.html)：完整工作流、首屏原檔/ZIP 揭露、兩語 SEO/FAQ、metadata/privacy。preview noindex；無正式 canonical/hreflang/sitemap、無遠端資產。
- [planner](public/js/core/filename-planner.mjs)：100 檔／16 MiB／64 MiB、來源 1,024 UTF-16 units、scalar 先於 NFC/encode、嚴格 mode schema、末筆序號、literal non-overlap、180 UTF-8 bytes、Windows device 及 `NFC(name).toUpperCase()` 整批碰撞。
- [ZIP STORE](public/js/core/zip-store.mjs)：逐檔 reader，source 碎片合併至最多 256 KiB payload parts；先 uint32 layout 預檢，再固定 local/central/EOCD；CRC-32、UTF8、1980-01-01、無 extras/comment/encryption/descriptor/ZIP64。不攤平完整 archive。
- [controller](public/js/app.mjs)、[文案](public/js/i18n.mjs)：來源/規則/模式/順序/移除/取消/清除同步增加 generation、abort reader、撤銷 URL、清舊 preview/results；晚到結果不復活。取消保留 File references 與規則供重試；清除/pagehide/persisted pageshow 重設工作區。名稱用 text APIs。
- [CSS](public/styles/app.css)、[tokens](public/styles/tokens.css)：Product App 工作清單，48rem/75rem、長名換行、44px targets、focus/reduced motion。排序邊界使用 `aria-disabled` 與 no-op handler，使移到邊界仍能保留同一操作焦點。這些是實作／靜態證據，不是視覺／鍵盤實測。
- [scripts](scripts/)：封閉 public allowlist；build 僅 public→dist（測試限 task-owned synthetic tree）；拒絕未知檔／空目錄／symlink/junction／stale，不刪未知產物湊成功。dev 僅 `127.0.0.1:4221`，精確 routes、GET/HEAD、404/405、Host/path/security headers。
- [test](test/)：pure、結構、上限、controller race 及 static contracts。Python expected names/bytes 獨立手寫；合成 ZIP 在 task-owned temp，finally 清理。

固定來源逐檔 bytes/SHA-256、source/dist set digest 見 [source-manifest.json](evidence/m1/source-manifest.json)。source 部分排除 evidence/dist，另列 dist 八檔核對 public bytes。未另建交付 ZIP，交主代理併入單一外層驗收包。

## 最終實際命令

工作目錄為本工具根。npm scripts 實際以 `C:/Program Files/nodejs/node.exe C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js` 執行，無 install。Node `v24.14.0`、Python `3.12.5`。

| 命令（上述 npm entrypoint） | exit／實際結果 | 原始證據 |
| --- | --- | --- |
| `test` → `node --test test/*.test.mjs` | 0，47/47 PASS、0 skipped | [test](evidence/m1/t05-test-r2.log) |
| `run check` → `node scripts/check.mjs` | 0，8 public files／syntax／preview PASS | [check](evidence/m1/t05-check-r2.log) |
| `run build` → `node scripts/build.mjs` | 0，8 dist files／byte equality／noindex PASS | [build](evidence/m1/t05-build-r2.log) |
| `C:/Program Files/nodejs/node.exe scripts/verify-zip.mjs` | 0，Python 3 entries payload/testzip/CRC PASS | [zipfile](evidence/m1/t05-python-r2.log) |
| `C:/Program Files/nodejs/node.exe scripts/manifest.mjs` | 實際摘要與 status 見 log | [manifest](evidence/m1/manifest.log) |

四個 gate exits 記在 [t05-exits-r2.json](evidence/m1/t05-exits-r2.json)。歷史 logs 保留；[TASK-ENTRY](TASK-ENTRY.md) 記錄兩個已修正的測試 fixture/斷言失敗，未刪除或覆寫舊 FAIL。所有 child_process 明確 windowsHide=true、shell=false，syntax timeout 10s、Python 30s；主代理中途指出的缺口已在後續 CLI 前修正。

## 環境與操作隔離

[before](evidence/m1/environment-before.json)、[after](evidence/m1/environment-after.json)、[comparison](evidence/m1/environment-comparison.json) 完整快照相同，PASS。HKCU PATH ExpandString／834 chars、HKLM String／1227 chars，ephemeral entries 皆 0；TEMP/TMP type/length/hash 相同，既有 duplicate entries 未改。

- User PATH SHA-256：`3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`
- Machine PATH：`52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`
- User full Environment fingerprint：`3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a`
- Machine full Environment fingerprint：`a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82`

未使用 browser/CUA/hidden tab/native UI、焦點/IME/鍵盤/clipboard/dialogs/screenshots。未讀憑證、token 或真實使用者文件。test.after 已關閉自建 4221 server，未留下 dev server，也未停止既有程序。

## 未驗與交接界線

逐 ID 狀態見 [驗收矩陣](evidence/m1/acceptance-results.md)。**全部 B 項為 NOT_RUN_USER_FOCUS_INCIDENT**：真 FileList/下載、完整功能、焦點/鍵盤、320px/200% zoom、pagehide/bfcache、完整 Network/Storage/console 觀察與 Chrome/Edge/真機容量。Node reader/URL fixtures、靜態掃描不代表這些 PASS。

無未修正的 N/P/S FAIL。64 MiB 不是裝置記憶體／速度保證，Blob 可能複製 bytes。內嵌 EXIF/GPS/metadata 原樣保留，副本仍可能含私人資訊。下載位置／同名行為由瀏覽器/OS 決定。本頁只放棄引用與 revoke URL，不承諾安全抹除。

主代理先固定 manifest、讀來源重驗，再以核准的真正隔離機制補必要 B gate。M2 未另行放行前，本對話不 GitHub、不部署、不自行跳 milestone。requested gpt-6.1-sol/max 依派送記錄，實際 backend 未獨立確認。

格式參考：[PKWARE APPNOTE v6.3.10](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)、[File API](https://www.w3.org/TR/FileAPI/)、[Python zipfile](https://docs.python.org/3/library/zipfile.html)、[Node24 test](https://nodejs.org/docs/latest-v24.x/api/test.html)、[ECMAScript normalize](https://tc39.es/ecma262/2022/multipage/text-processing.html#sec-string.prototype.normalize)。相容性／容量僅依實測範圍報告。
