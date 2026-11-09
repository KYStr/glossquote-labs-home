# 自訂文字遮蔽交接

狀態：2026-10-13，TASK-W24-M1-T00 本機候選已凍結，待主代理独立驗收。完整功能尚未完成；M2/M3/外部驗收未執行。

- 原功能 threadId：01a133ac-0e4a-7da3-a243-93f67d0c014a；host local。DISPATCH.json 已保留。
- Requested gpt-6.1-sol / max；create_thread 接受明確設定，backend identity 尚未獨立確認。
- 本機繁中 http://127.0.0.1:4204/index.html；英文 http://127.0.0.1:4204/en/index.html。Preview session 27130 保持可用，沒有停其他服務；實際使用預設 port，無 fallback。
- 完整功能 Goal 保持 active；M1 結束不標完整功能 complete。

修改與行為：新增 public/ 双語靜態 HTML、共通 CSS、ESM app/i18n/state/core；新增 Node24 built-in-only test/check/build/serve/validation/pages/manifest；package.json private 且零 runtime/dev dependency。只在本工具允許路徑與專用 evidence 內寫入，未改父級、首頁、根 Git 或其他工具。

核心先驗 exact request/array descriptors，不呼叫 getter；raw source ≤100000 UTF-16 units、最多 50 條 raw target ≤200 units。不 trim、normalize、case-fold 或掃描替代結果。code point trie 從左至右，最長優先、非重疊，固定 [REDACTED]，失敗沒有部分輸出。Textarea 沒有 maxlength；超限完整草稿仍保留並立即顯示欄位錯誤。目標 textarea 接受貼入換行供可見拒絕，不以單行 input 靜默移除。

來源／目標／規則增刪立即清除結果與計數並停用匯出。Copy single-flight busy/revision/requestId、current-state/disposed checks；拒絕時選取 output 提供手動複製，沒有成功提示。原生 copy busy 導致焦點落 body 的實測缺陷已修正：成功後只在焦點仍落 body 時還原 copy，純鍵盤重驗通过。Download 使用 output-only UTF-8 no BOM Blob、固定 filename，不加 LF；URL 延遲 60 秒撤銷，pagehide 清引用與 URL。Clear 的取消與 Escape 保留資料，確認清空並還原 focus。

驗證在 <LOCAL_WORKSPACE>/tool-projects/24-text-redactor 執行；Node v24.14.0 / npm 11.9.0。最終必要命令：

```powershell
& 'C:/Program Files/nodejs/npm.cmd' test
& 'C:/Program Files/nodejs/npm.cmd' run check
& 'C:/Program Files/nodejs/npm.cmd' run build
```

三個 exit code 均 0。npm test 44/44，覆蓋 A01–A36，無失敗或 skipped；包含零結果、surrogate/C0/C1、字面特殊字元、descriptor/getter=0、輸入完整上限、1,000,000-unit output、複製晚回應、精確失效、clear 與 unsafe build/server fixtures。A34 實測 maximum nodes=10001、最壞 fixture edge checks=19,980,100（≤20,000,000）。Loopback GET/HEAD allowlist、occupied-port fallback 保留原服務、未知 stale/hardlink/junction 拒絕及外部 fake sentinel 保持通過。check 只是有限靜態檢查，沒有冒充 Network/Storage 檢查。

真 Edge（cua_repl）實測結果：

| 案例 | 實際結果 |
|---|---|
| B01/B02 | PASS，來源 `Anna Ann\nAlice email: a@example.test`、rules Ann/Anna/a@example.test → `[REDACTED] [REDACTED]\nAlice email: [REDACTED]`，每條 1 次，兩語完整流程 |
| B03 | PASS，分別改來源及 rule；output/counts 立即清空、copy/download disabled |
| B04 | PASS，native click/keyboard copy 後實際 clipboard 讀回，內容只有 redacted output |
| B05 | NOT_RUN，native download click 已嘗試，download event 8 秒逾時，未取得落盤檔案路徑，未以 mock 宣稱檔案 bytes 通過 |
| B06 | PASS，cancel/Escape 保留所有資料；confirm 空 source/一空 rule/無結果；focus 回 clear |
| B07 | PASS，刷新後純 Tab/typing/Enter 輸入、加 rule、處理、output/copy/download；focus 可見，native keyboard copy 讀回 |
| B08 | PASS，兩語原生 viewport 測量 width 320 / height 740；clientWidth=scrollWidth=308；全部顯示 controls 高度 ≥44，無頁面水平溢出；mobile dialog 正常 |
| B09 | NOT_RUN，無實際 browser zoom API；未用 CSS zoom 代替 200% |
| B10 | NOT_RUN，無完整 DevTools Network/Storage 工具；browser CSP/靜態 scan 分開記錄 |
| B11 | PASS，真刷新清空 source/rules/output，生命週期提示正確；捕捉 console 沒有測試輸入。既有 extension warnings 保留於 evidence，無本工具內容日志 |
| B12 | PASS，browser 貼入 CRLF 成 LF 後，相對 textarea.value 保留 emoji/CJK/換行；目標 Ann+LF+Anna 拒絕且無輸出 |
| B13 | PASS，未列出的 other@example.test 原樣保留、限制警告仍可見 |
| 完整 raw draft | PASS，target 201/source 100001 完整保留、立即顯示超限及 invalid，無輸出或匯出 |

Viewport API 初始 request 320×740 實測回 256×592；使用 native override 400×925 後，page scope 實測回 320×740。精確參數与原始測量完整保留，沒有注入 CSS zoom/style。全頁截圖兩次逾時，改用正常 viewport 截圖；圖片用於外觀 QA，精確文字以 browser-cases.json 的 DOM values 為準。真設備虛擬鍵盤、原生 IME composition 與 screen reader 軟體 NOT_RUN；native AX 標籤已檢查。NOT_RUN 保留，沒有改成 PASS。

Windows 環境 guard before/after 完整 Snapshots 相同：

- HKCU PATH ExpandString、length 834、ephemeral 0、SHA256 3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb；Environment fingerprint 3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a。
- HKLM PATH String、length 1227、ephemeral 0、SHA256 52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8；Environment fingerprint a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82。
- TEMP/TMP hashes/type/length 也完全相同。未安裝依賴、未改持久環境、未讀憑證。

固定 evidence：../../.runs/text-redactor/m1-2026-10-13-01a133ac/。fixed-manifest.json 記錄每個 source/code/runtime/dist 的 bytes/SHA256，dist 每檔與 public 完全相同。code/runtime/dist 摘要：

- code b9f1a9539f8a184ec201b42d56d8cb57ff44f84e29697147e781e412c5fa1011
- runtime 169709438bbb273b1f62021014c30e8a4f69472ede4318dfeda076ae65134faa
- dist e0531338d32c6aac5efd0b8571ffcd144cd9c442ba41aa93a1a833df400d3688

初始 manifest、實際 final command logs、before/after/compare、完整 browser inputs/outputs、keyboard focus sequence、320 measurements/screenshots、scope verification 均保存。Preliminary npm-test log 曾有 PowerShell 單一參數 splat 額外字元；已用上列 literal 命令重跑最終 44/44，保留 preliminary log 但不把它當 literal 最終證據。

限制與下一步：只遮蔽明確指定的字串，不能自動找出其餘個資；敏感來源只在本分頁記憶體，瀏覽器／OS 的 clipboard 或記憶體抹除不在工具控制範圍。價值假設仍未經使用者研究。主代理獨立驗收通過並正式放行後才進 M2。

預定 public source repository [KYStr/glossquote-labs-text-redactor](https://github.com/KYStr/glossquote-labs-text-redactor) 尚未發布，沒有 remote commit/ZIP。預定 host [redact.glossquote.com](https://redact.glossquote.com) 尚未部署；首頁、正式 SEO/headers/404、M3 與外部驗收皆 NOT_RUN。此輪沒有 source push、Cloudflare 或 homepage 操作。

## 2026-10-13 REDACT-M2-T01：公開來源與固定 ZIP 已驗證

此節為最新狀態；前述 M1 凍結／未發布是保留的歷史紀錄。主代理正式 M1 放行證據在 ../../.runs/handoff-release-2026-10-13/24-primary-m1/ACCEPTANCE.md、result.json、browser.json，基線 manifest 本體 SHA256 341805bac5b5da4a1e9ad573cbeab008f8ec31d5a1c7552f89bad28ecaade99d。獨立 44 tests/check/build 與雙語實際 browser/core/copy/clear/320 通過；M1 原八個 public assets 逐 SHA256 保持不變，舊 preview 程序未動。

M2 新增 scripts/release.mjs、serve-production.mjs、source-release.mjs、zip.mjs 與 release/archive tests；擴充 build/check/manifest/validation、package commands、.gitignore、wrangler.jsonc、發布 docs。Production 是獨立 dist-production/ 十三檔，僅新增 HTML head metadata，body/app/state/core/i18n/CSS 不變。固定 origin https://redact.glossquote.com；雙語 canonical/reciprocal hreflang/x-default、OG/Twitter summary、WebApplication JSON-LD、robots/sitemap、安全 _headers（exact JSON-LD CSP hashes）、canonical _redirects、雙語 404。Assets-only Wrangler metrics/logpush/logs/traces 關閉；沒有 Worker entrypoint、vars、account ID 或 credentials。缺頁 404 status 在本地 loopback HTTP model 已測，Cloudflare edge 仍未部署／驗證。

PUBLIC repository：[KYStr/glossquote-labs-text-redactor](https://github.com/KYStr/glossquote-labs-text-redactor)。GitHub visibility PUBLIC、default branch main；GitHub API 與 ls-remote HEAD/main 都確認 commit **6cd97c6491cd032ec613acd4dcd61f0cc5735d7c**。使用已登入官方 gh CLI，僅 per-command Git -c（包括 existing gh auth git-credential helper）；沒有 auth setup/login/refresh、global/system Git 寫入、force push 或憑證讀取。Root Git 未推送。

Reviewed publishing copy 在 ../../.runs/github-publish/glossquote-labs-text-redactor/source/，只包含 42 項 allowlist；排除 DISPATCH、TASK-ENTRY、private chat/machine metadata、dist/node_modules/.runs/輸入／證據。四份 public summary 取代本地 README/START-HERE/HANDOFF/project.json，product code/test/tooling bytes 保持。第一次 cached diff check 因初始 spec/docs Markdown 的 mixed CRLF/trailing EOF lines 失敗，依 dispatch 停止回報；主代理隨後明確准予只整理 reviewed copy 的 spec/docs。LF phase 改 11 檔，剩餘 phase 只去 3 檔多餘 EOF 空行；沒有 two-space hardbreak，正文／Markdown 語義未改；原產品歷史文件沒有做此整理。逐檔 before/after SHA、docs-only diff、copy-vs-original disposition 已記錄；最終 cached diff --check exit 0，未放寬 gate。

固定 Git blob source ZIP：../../.runs/github-publish/glossquote-labs-text-redactor/evidence/glossquote-labs-text-redactor-6cd97c6491cd032ec613acd4dcd61f0cc5735d7c.zip。

- 87,482 bytes；SHA256 **e1b493448344fe2911ffd78990ad3df6cd1743ff96162887b2e5ab5a71a00701**。
- 42 檔逐 Git blob bytes 相符；中央／本地 entry、path allowlist、mode、size、CRC 全驗證後才安全解壓到全新 unpacked/，沒有讀 ZIP 不明路徑或 symlink。
- 解壓副本重新 test/check/build/build:production/check:production，全 exit 0；49/49 tests、無 failed/skipped。原工作工具同五 gates 全 exit 0。Literal executable/argv/cwd/log 見 source-commands.json 和 unpacked-commands.json，沒有 npm install。
- 解壓 source manifest digest 3c3f5f698efeedafb65cfe008fc9a2686eb30d7e7f6b4fe1fa5d9ae76c30bf53；code 51cbe95a37473d22b395c7923686439c073552c6af3f737e7adae4344b03478c；M1 runtime 169709438bbb273b1f62021014c30e8a4f69472ede4318dfeda076ae65134faa；preview dist e0531338d32c6aac5efd0b8571ffcd144cd9c442ba41aa93a1a833df400d3688；production **6361eeeb29ff59cdc7d50492b3afde05c703622c7fcd9a6bf2d2806b97a5d5d3**。原工具／固定 ZIP 解壓重建產物 bytes/hash 一致。

M2 evidence 根：../../.runs/github-publish/glossquote-labs-text-redactor/evidence/。包含 source/unpacked commands/logs、Git argv、fixed-zip-manifest.json（每檔 Git blob/bytes/SHA256）、unpacked-manifest.json、reviewed-copy-diff.json、docs-*-normalization.json、docs-only-normalization.diff、publication-result.json、ls-remote.txt、repository-verified.json、m2-release-summary.json、scope/manifest 與 guards。第一次錯誤相對路徑的 guard launcher 未載入且無 Git 操作，已改正絕對 path；一次空 git-status pipeline 未生成 log，Get-Item logging error 已保留，後以明確 array 重新取得 clean=true，無內容改動或重推。

Git settings guard capture/verify（初始及 resumed 新 baseline）全 PASS，三個已知 user/system config 的 existence/size/SHA 不變。Windows Environment 初始／resumed／最終的完整 Snapshots 相同，含 PATH type/length/hash/ephemeral count、full Environment key fingerprint、TEMP/TMP。没有安裝 runtime、修改 persistent state 或啟停其他服務。

原 M1 preview 保持 http://127.0.0.1:4204/index.html /en/index.html；local production HTTP model 為 http://127.0.0.1:5204/index.html /en/index.html（session8199），保留供主驗。這個 model 不等於 Wrangler emulator 或正式 Cloudflare response；Wrangler dry-run / Cloudflare live / homepage / external review **NOT_RUN**，由主代理 M3 驗證。下載落盤 name/bytes、實際 200% zoom、完整 Network/Storage、實機/IME/AT、BFCache/pending OS clipboard ordering 等既有 native NOT_RUN 全部保留，不以 fixtures 或 unchanged code 宣稱人工通過。

M2 owner source gate 已通過，固定 public commit/ZIP 交主代理獨立 M2 驗收与 M3 免費部署／雙語首頁整合。Hosting 尚未部署，尚未交外部審查，完整產品不可標 complete。App Goal 工具仍顯示之前 blocked，無 resume setter；已向主代理說明，未虛報 status transition。

## 2026-10-13 主代理 M2／M3 最新回報（僅工作區狀態註記）

主代理已獨立核對固定 commit 6cd97c6491cd032ec613acd4dcd61f0cc5735d7c 的 42 Git blobs、PUBLIC/default HEAD，重新執行 49 tests 與五個 gates，確認八個 M1 public assets 未變。主代理已完成 redact 的免費 Cloudflare 部署，version **e8941539-9a48-4f54-aec7-4e7f32bb5391**，回報 **37 HTTP responses PASS**。正式入口為 https://redact.glossquote.com/index.html 與 https://redact.glossquote.com/en/index.html；部署／HTTP 狀態為主代理 M3 的證據，本功能對話沒有執行部署。首頁整合仍待本批由主代理處理，外部驗收尚未完成。

固定公開 commit 文件（包括 docs/RELEASE-CANDIDATE.md 表中的 GitHub NOT_RUN）是 **發布前／source freeze 時點的快照**，不是目前 PUBLIC source 或已部署 hosting 的結論。其首段已要求實際結果另記 HANDOFF/evidence；最新來源發布狀態以 PUBLIC repo、publication-result.json、fixed-zip-manifest.json 及上述主代理 M3 結果為準。保留這個固定 commit、ZIP、source/unpacked 與原 manifest；不為更新快照標籤另做 public commit、不改 runtime，也不重跑不變的 passing checks。前述 M1/M2 當時的未發布／未部署紀錄均是歷史狀態。

所有既有 native NOT_RUN 仍保留。產品版本要待雙語首頁整合、主代理完整發布驗收以及使用者／外部確認，才能標完成。原定 M2 交接已結束並再次凍結；此註記只更新工作區 HANDOFF，不修改固定公開來源或證據產物。

<!-- primary-handoff-release-2026-10-13 -->
## 2026-10-13 主代理正式發布與驗收

最新固定來源：https://github.com/KYStr/glossquote-labs-text-redactor/commit/6cd97c6491cd032ec613acd4dcd61f0cc5735d7c（PUBLIC獨立核實）。主代理由固定ZIP逐Git blob核对，再跑49測試及test / check / build / build:production / check:production全通過。37項正式HTTP回應及11資產核對通過；Cloudflare version e8941539-9a48-4f54-aec7-4e7f32bb5391。

正式站：[繁中](https://redact.glossquote.com/index.html) / [English](https://redact.glossquote.com/en/index.html)；雙語首頁已實際列出本工具。主驗長字串優先精確匹配與未列內容保留；僅發布副本文檔LF整理，無功能重寫。

狀態：**主驗通過，等待外部驗收**。保留原紀錄中的人工NOT_RUN；本輪更精確的瀏覽器範圍見批次驗收包，24正式英文頁Edge封鎖未繞過。沒有把發布前固定文件的NOT_RUN視為最新狀態，也沒有將自動或HTTP測試冒稱真裝置/AT/完整Network與Storage測試。

主證據：`.runs/handoff-release-2026-10-13/`；工作區狀態註記不是固定公開commit內的檔案。
<!-- primary-handoff-release-2026-10-13-end -->

<!-- external-followup-accepted-2026-10-16 -->
## 2026-10-16 主代理採納外部複驗

固定版本 `6cd97c6491cd032ec613acd4dcd61f0cc5735d7c` 標記 **外部測試通過（本輪核心與雙語離線受測範圍）**：49項原測試、1,000組對照、6項雙語離線核心操作。這些是外部實跑結果；主代理已核對版本、回報及封裝完整性，未在本輪重跑整套。

完整正式站Network／Storage、原生操作與真機等仍待驗；NEL停用的提供者紀錄比對一致，不代表既有瀏覽器policy／queue全部清除。沒有新增確認產品缺陷，無需產品返工或重發。詳[最新外驗總表](../EXTERNAL-FOLLOWUP-2026-10-16.md)。本註記不改公開固定commit；下方／上方較早等待外驗狀態保留為歷史。
<!-- external-followup-accepted-2026-10-16-end -->
