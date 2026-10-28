# 附件大小分包 M1B 離線發布準備

2026-10-23（Asia/Taipei）｜B20-RP-47｜**M1B_OFFLINE_PREP_AWAITING_PRIMARY_REVIEW**。

這是下一階段驗收用的靜態 release candidate，未上線、未公開 GitHub、未納入正式首頁。預定 origin 是 `https://file-bundles.glossquote.com`，toolSlug 是 `file-bundler`；它們是程式固定常數，不代表 DNS／hosting 已建立。requested gpt-6.1-sol/max；未獨立核實 backend。

## 重現方式

在本工具根目錄，使用 Node 24 與既有 npm：

```text
npm test
npm run check
npm run build:release
npm run check:release
```

不需 npm install、環境 origin 或憑證。`build:release` 精確對應 `node scripts/release.mjs build`；`check:release` 對應 `node scripts/release.mjs check`。缺 mode、未知 mode、額外參數與 origin override 都 exit 1，不會自動部署。原 dev/test/check/build scripts 保留；本輪沒有執行 preview build 或啟動 serve。

新的正式候選 root 是 [release-artifacts/site](release-artifacts/site/index.html)，英文入口是 [en/index.html](release-artifacts/site/en/index.html)。**未來已獲准的隔離 browser 驗收者應以 `release-artifacts/site/` 作為靜態 HTTP 根目錄**，同時驗 `/index.html` 與 `/en/index.html`，並另驗 hosting headers。不要把 file URL、Node tokenizer、mock 或原 `public`／`dist` preview 當成正式候選的 browser gate。此說明沒有授權本輪啟動 browser 或 server。

[manifest.json](release-artifacts/manifest.json) 是 site 的 sibling，不在 site 內。site 只含原 11 個 public allowlist 資產加 `_headers`、`robots.txt`、`sitemap.xml`，共 14 檔；manifest＋site 共 15 檔。

## 發布工具鏈行為

`release-policy.mjs` 固定 origin／slug、11 個 M1 public 檔案的 bytes/SHA-256、原 CSP 與 `scripts/serve.mjs` hash。每次 build/check 都先驗 pinned input，再由來源重建全部 expected bytes；不採信單獨或連同產物修改的 manifest。來源更動需另外核准產品修正與更新 anchor，本輪不自動接納新 public bytes。

HTML 只修改 head 中的 robots 並新增唯一 canonical 和 zh-Hant／en／x-default 三個 alternate。canonical 分別為 `/index.html` 與 `/en/index.html`，x-default 指中文。兩頁 meta robots 為 `index,follow`；完整 title、description、H1、lang、五份 FAQ 會經 tokenizer／語義驗證。DOCTYPE／html lang／body 及候選未部署文案不變。其餘 JS、CSS 與所有非 SEO 資產逐 byte 等於 M1，原 public／dist 仍為 noindex，未加入 sitemap/canonical。

原 public 無 `_headers`／robots。release `_headers` 依據原 `scripts/assets.mjs` 的 CSP，以及 pinned `scripts/serve.mjs` handler 的六個 header 值生成：Content-Security-Policy、X-Content-Type-Options、Referrer-Policy、Cache-Control、X-Robots-Tag、Cross-Origin-Resource-Policy。只有 X-Robots-Tag 改成 `index, follow`；connect-src／script-src／data/blob 規則沒有放寬。serve 檔僅讀取並比對 SHA，沒有 import 或啟動。**`_headers` 是待部署配置，並非真實 hosting header 證據。**

來源和輸出用固定 allowlist，拒絕 symlink／junction、未知檔案／目錄、缺檔、來源漂移及被改的輸出。建立前完整 preflight；只以 exclusive create 寫入不存在的輸出樹。同樣合法輸入重建時只驗證、不寫既有檔；任何污染或未管理的樹都拒絕，不清除、不修復、不覆寫。若新目錄首次建立途中發生 I/O 錯誤，可能留下不完整的新產物；後續命令會拒絕它，應由主代理審查後給有界處理指令。

manifest exact schema 是 schemaVersion=1、mode=release-candidate、origin、toolSlug、files、sourceFiles。files 為 site 相對路徑；sourceFiles 為 `public/` 開頭的來源路徑。兩組均按 path 排序且無重複，每項只有 path/bytes/sha256。沒有時間、隨機值或本機絕對路徑。

## 實際驗證

| 命令 | exit | 數量／結果 |
| --- | --- | --- |
| `node --test test/release.test.mjs` | 0 | 39/39 針對性 release tests，0 fail/skip |
| `node --version` | 0 | v24.14.0 |
| `npm test` | 0 | **81/81**，既有 42＋新增 39，0 fail/skip/todo |
| `npm run check` | 0 | 原 11 個 preview 資產與語法／規則 |
| `npm run build:release` | 0 | 14 site files；首次建立 |
| `npm run check:release` | 0 | 重建 expected bytes，驗證完整候選且無寫入 |
| `node scripts/capture-m1b.mjs` | 0 | 49 source/spec、15 artifacts、48 protected files |

完整固定版本 suite/check/build:release/check:release 執行一次；其後沒有變更這些命令的程式或測試輸入。[targeted 記錄](evidence/m1b/targeted-commands.json)、[final 記錄](evidence/m1b/final-commands.json)。重建確定性、CLI 反例、缺/多/改輸出、manifest＋asset 一起竄改、來源改變、錯 domain/SEO、Windows junction 等負例全部在本工具任務目錄的合成 copy 內執行，沒有修改真 public/dist/舊證據做負例。

唯一既有測試的改動是把 style-contract 測試暫存位置從 `evidence/m1` 移到 `evidence/m1b`；斷言與產品行為不變，避免本輪完整 suite 寫入舊證據。新增流程自己的 child process 都明設 shell:false、windowsHide:true；沒有安裝依賴、讀取帳戶資料／secret 或修改持久環境／Git/auth。

[入場環境](evidence/m1b/entry-environment.json)、targeted/final 的 before/after guard 全 PASS，HKCU/HKLM PATH 型別／長度／SHA／ephemeral count、全 Environment-key fingerprints 與 TEMP/TMP 未變。[final invariants](evidence/m1b/final-invariants.json) 確認原 public 11、dist 11、舊 M1 evidence 26，共 **48 檔 bytes/SHA-256 與目錄成員不變**。

## 固定雜湊

下列均為 SHA-256。聚合算法是依 path 排序，串接 `path<TAB>bytes<TAB>sha256<LF>` 再 hash；source 排除可變交接和 evidence。逐檔數值在 [source/artifact manifest](evidence/m1b/source-artifact-manifest.json)。

- M1B 49 個 source/spec：`e202bda39f4618bcba3ca5fc1d7932c746daa3862101b8944380e94948173d9f`
- 原 public Runtime 11 檔：`8613481723c1fac2218165e790a6427a3d70a9d6541c3a4c37b34edb6152c510`
- Site 14 檔：`71fb0dbdf3378a3f1e422604b81d6371d69c500ea84b61d47e6bd6b2abcb472c`
- 完整 artifact 15 檔：`422ac6779ef7208e57888530b413726d987b7db3f9f5b21104d3d4afcd3182cf`
- manifest.json 本身：`3165fc51e9121414ded9d99fa97822b0ec37c6b4e354552acc282dd6f694453d`

M1 原先 43 檔整體 hash `d5c4a4a622a05040c0ec228323b4c7bb609d7c8aaf46cf61841b780a4284d79f` 是歷史基準，不宣稱目前新增發布工具鏈後整體仍相同；其舊 manifest／證據 bytes 全數保留。

## 十項契約對照與尚缺 gate

| 契約 | 本輪範圍 |
| --- | --- |
| 1 scripts/CLI | PASS_OFFLINE：固定 build/check，拒絕未知參數 |
| 2 origin | PASS_OFFLINE：固定預定 https origin，不讀 env override |
| 3 隔離輸出／確定性 | PASS_OFFLINE：site＋sibling manifest，preflight/exclusive write，污染拒絕 |
| 4 SEO／Runtime | PASS_OFFLINE：雙語互返，僅 head SEO delta，其餘 bytes 不變 |
| 5 robots／sitemap | PASS_OFFLINE：精確 allow/sitemap，只列兩 URL，無 lastmod |
| 6 headers | PASS_CONFIG_ONLY：完整原 CSP/隱私值，真 hosting 待驗 |
| 7 manifest／重建檢查 | PASS_OFFLINE：exact schema，來源 anchor，expected bytes 反竄改 |
| 8 測試 | PASS_OFFLINE：39 targeted、81 full suite，含 junction，未冒充 browser |
| 9 交接／hash／environment | 已記錄本文件、HANDOFF/TASK-ENTRY 與本輪 evidence |
| 10 回交 | READY_FOR_PRIMARY_REVIEW；不推送／不部署／不另開 chat |

真 browser、視覺、320px／200% zoom、鍵盤／螢幕閱讀器、module Worker／transfer、真下載、Network/Storage、原生／真機、正式 hosting headers 仍 **NOT_RUN_USER_FOCUS_INCIDENT**。沒有 browser/CUA/IAB/CDP/native、焦點/IME/clipboard 操作或隔離實驗。

沒有需要擴權／新增依賴的阻塞決策。後續由主代理讀 diff、獨立驗證此固定候選，處理必要 browser gates，再具體給 M2 發布放行；本輪結果不是 GitHub 或部署授權。主代理負責單一整合 ZIP，本工具不另做使用者交付 ZIP。
