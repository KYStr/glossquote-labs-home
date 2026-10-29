# 行事曆檔產生器 M1 交接

2026-10-22（Asia/Taipei） · NEW22-40-M1 · 本地候選 `M1-r1`

M1 T00–T05 已實作，最終 Node/check/build/loopback HTTP 通過，停在主代理獨立驗收點。未執行瀏覽器、實際下載、原生日曆匯入、GitHub 公開、部署或首頁整合；未宣稱完整產品或外部覆核通過。原規格、AGENTS 與 docs 未修改。

|範圍|狀態與證據|
|---|---|
|T00–T04 本地實作／CLI|PASS：11 個 public 檔案，32 組最終 Node 測試，check/build/test 各 exit 0|
|T05 固定來源|[source-manifest.json](evidence/m1/source-manifest.json)：逐檔 bytes/SHA-256，排除 dist、證據與自身|
|主代理獨立程式／瀏覽器驗收|待主代理；本輪自測不替代獨立驗收|
|C20–C24 真瀏覽器|NOT_RUN_USER_FOCUS_INCIDENT|
|C25 Google Calendar 匯入 C01/C10|NOT_RUN_USER_FOCUS_INCIDENT；定時／全天均未匯入|
|C25 Apple Calendar 匯入 C01/C10|NOT_RUN_USER_FOCUS_INCIDENT；定時／全天均未匯入|
|C25 Outlook 匯入 C01/C10|NOT_RUN_USER_FOCUS_INCIDENT；定時／全天均未匯入|
|GitHub / source commit / reviewed commit / released commit|NOT_PUBLISHED / 無 / 無 / 無|
|Hosting / 正式網址 / 雙語首頁|NOT_DEPLOYED；calendar.glossquote.com 仍只是規劃，未加入 canonical|
|外部覆核|NOT_RUN|

## 改動檔案與差異

|檔案|內容|
|---|---|
|package.json、.gitignore|Node >=24 ESM/private，零 dependencies/devDependencies；忽略產物與證據|
|public/index.html、public/en/index.html|完整繁中／英文靜態標籤、說明、FAQ、同語首頁、語言切換、noindex；初始化前停用表單|
|public/styles/app.css|家族 Product App tokens、主表單／摘要、48/75rem 斷點、窄版、focus、reduce-motion、原文內部捲動|
|public/js/core/date.mjs|精確 schema、嚴格日期／時間、碼點上限、控制字元／surrogate 拒絕、換行正規化|
|public/js/core/zone.mjs|限定十區域、快取 Intl formatter、h23/gregory/latn 與 parts 檢查、129 候選、gap/fold/unsupported|
|public/js/core/event.mjs|模式 union schema、各端點顯式 DST 選擇、UTC 先後／366 日、全天 inclusive/exclusive 日期|
|public/js/core/ics.mjs|單事件、固定順序、UTC／DATE、escaping、75 octets 含前導空白、CRLF、UUID/stamp/64KiB guard|
|public/js/draft.mjs|完整兩模式草稿僅投影目前模式；隱藏 zone/time 不污染全天驗證|
|public/js/session.mjs|revision、穩定 UID/stamp、Blob URL 撤銷、下載能力不足保留摘要／ICS 預覽|
|public/js/i18n.mjs、public/js/app.mjs|完整雙語錯誤／狀態、摘要、early/late、同步失效、clear/pagehide/BFCache、textContent、錯誤焦點|
|scripts/check.mjs|真實檔案／ESM／資源與危險 API 靜態檢查；child 明確 windowsHide:true、shell:false、10 秒 timeout|
|scripts/build.mjs|閉合 allowlist；拒絕未知檔、junction/link、錯誤目標與 stale bytes；不刪未知輸出|
|scripts/serve.mjs|僅 127.0.0.1:4220；GET/HEAD、精確原始路由／Host／MIME、CSP/no-store/noindex；不開 browser|
|test/date-zone.test.mjs、test/ics.test.mjs、test/fixtures/taipei.ics|C01–C19 精確期望、手寫 CRLF fixture、獨立 unfold/property reader、邊界與拒絕|
|test/session.test.mjs|控制器／模式投影離線補充；不計作 C20–C22 browser PASS|
|test/static.test.mjs、test/toolchain.test.mjs、test/http.test.mjs|雙語靜態語義反例／對比計算、實際 junction、stale/unknown、真 loopback HTTP|
|HANDOFF.md、TASK-ENTRY.md、evidence/m1/**|命令／exit／環境／差異／未驗／固定來源紀錄；未另建 ZIP|

`dist/**` 為 11 檔 preview，逐 byte 等同 public，見 [dist-manifest.json](evidence/m1/dist-manifest.json)，不重複計入來源。T00 的 8 檔初始骨架保留在 evidence/m1/t00-dist，對應 t00-dist-manifest.json；不是目前候選。原 HANDOFF 保存於 evidence/m1/HANDOFF-before.md。

## 實際命令與結果

工作目錄為本工具。Node v24.14.0、ICU 78.2、tzdata 2025c、Unicode 17.0（[runtime.json](evidence/m1/runtime.json)）。沒有 npm install。

```powershell
& 'C:/Program Files/nodejs/node.exe' 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' run check
& 'C:/Program Files/nodejs/node.exe' 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' run build
& 'C:/Program Files/nodejs/node.exe' 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' test
```

三者 exit 0，完整參數／起訖 UTC／log 見 [validation-run1.json](evidence/m1/validation-run1.json)。check：11 檔與語法／靜態規則。build：11 檔 noindex。test：32 pass、0 fail、0 skipped，含 GET/HEAD 真實 response bytes、404 路徑／traversal、405 方法、403 非精確 Host、安全標頭／MIME。HTTP 測試只建立及關閉自己同程序的 4220 listener；port 衝突會失敗，不殺占用者。沒有留下 server。

手動開發先 build，再 `& 'C:/Program Files/nodejs/node.exe' 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' run dev`。dist 必須符合 public；STALE_DIST 時先由擁有者檢視保存舊版本，腳本不自行清除。測試暫存僅本工具 evidence/m1 下已識別檔案／junction，逐項清除，沒有遞迴刪除。

歷次紀錄保存於 [execution-history.json](evidence/m1/execution-history.json)：T00 check/build（8 檔骨架）、T01 13 組、T02 19 組、T03 6 組控制器、T04 6 組靜態／工具鏈。舊結果不能代表最終來源；最終以 run1 為準。

## 驗證分界

|需求|本輪 PASS 範圍|尚未執行|
|---|---|---|
|FR01 / C03,04,16,17|Node 精確 schema、日期、碼點、surrogate／控制字元|實際輸入／錯誤讀屏|
|FR02,03 / C01,02,05–09,19|精確 UTC、十區域、gap/fold、顯式選擇、最多 258 format 呼叫|真 browser Intl／歧義操作|
|FR04 / C10–12|exclusive DTEND、閏日、366/367 邊界、最大最後日|真 browser 模式草稿保留|
|FR05,06 / C13–18|手寫完整 fixture、獨立 reader、75 bytes、escaping、UID/stamp；控制器補充|C20 真下載、穩定 metadata、即時失效|
|FR07|記憶體控制器／模式投影；clear/pagehide/pageshow 已實作；靜態掃描|C21–24 真 browser 生命週期／BFCache／Network／Storage|
|FR08 / C23–25|雙語靜態語義、label、對比計算；HTML/CSS 結構前提|320px／200%／keyboard／screen reader／渲染、Chrome/Edge/mobile、三種真匯入器|

所有上述未跑 UI/native 項均 NOT_RUN_USER_FOCUS_INCIDENT。依本工具 AGENTS「不得 CUA、hidden/IAB、互動本機 browser/native automation」及焦點事件 override，本輪沒有 browser/native、鍵盤、IME、clipboard、dialog、screenshot 或隔離實驗。Node／離線 tag reader／HTTP 不能替代 browser 或真下載。

## 環境與修正

[environment-before.json](evidence/m1/environment-before.json)、[environment-before-final.json](evidence/m1/environment-before-final.json)、[environment-after-run1.json](evidence/m1/environment-after-run1.json) 完整一致，guard PASS；包含 HKCU/HKLM PATH hash/type/length/ephemeral count、TEMP/TMP type/length/hash 與完整 Environment-key fingerprint。

|範圍|PATH type / 長度 / entries / ephemeral|PATH SHA-256|Environment fingerprint|
|---|---|---|---|
|User|ExpandString / 834 / 16 / 0|3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb|3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a|
|Machine|String / 1227 / 30 / 0|52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8|a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82|

原有 MiKTeX/Cursor 重複 PATH 項保留。沒有持久環境、registry、PATH、服務或系統設定變更。

首次 guard 外層命令 exit 1：guard JSON 本身 PASS，但 `.ps1` 成功未設定 `$LASTEXITCODE`，外層把 null 誤判為非 0；後續改用 `$?` 和 Status，無實際 drift。交接 patch 的首次 Delete/Add 同路徑也被工具拒絕，沒有檔案變更，改 Update 後成功。這些不是產品測試失敗；歷史保留。

主代理指出語法 child 缺 windowsHide 後，已補 hidden/shell/timeout，再跑後續 CLI，最終工具鏈重驗 PASS。模式 schema 投影亦按主代理提醒補離線切換測例。

## 後續與限制

主代理先讀固定來源、獨立重驗，再以經審核的隔離機制處理必要 browser gate。未跑實際下載與匯入，不能推論所有日曆可用。時區取決於裝置 Intl/tzdata；異常 fail closed，不回退固定 offset 或本機時區。清除只釋放頁面引用／Blob URL，不承諾安全抹除瀏覽器、OS 或已下載檔案。

M2 須主代理另行明確放行。本輪未讀憑證、未呼叫 gh/auth/config、未公開／部署；規劃 repo KYStr/glossquote-labs-calendar-event 仍無 remote commit/visibility 證據。單一整合 ZIP 由主代理製作，本輪不另交多包。

原對話 requested gpt-6.1-sol/max，實際 backend 未獨立驗證。已實際建立涵蓋 M1–M4 的 Goal（無 token budget），狀態 active；產品未完成，不標 Goal complete，本輪在 M1 驗收點停止。
