# 固定候選

2026-10-16 最新：M1 已由主代理 PASS，M2原對話交付完成、awaiting-primary-m2-acceptance。public source已verified，固定commit `bc211486ade235366b5dc2b42f1297090ceacad9`。workspace與乾淨HEAD ZIP各50/50及所有6個gate exit0，產物逐檔相同。M3/正式hosting/首頁/外部驗收仍NOT_RUN。以下早期紀錄保留歷史狀態，以文末M2固定結果為準。

證據根：`../../../.runs/subscription-budget/w16-27-m1-20261016-01a141f4/`（本機限定，不可發佈）。來源相對於本工具；manifest 自身在工具外，沒有循環 hash。

- `source-manifest.json`：完整工具 source/docs/status 的 bytes/SHA-256，排除 dist/evidence。
- `implementation-manifest.json`：package/.gitignore/public/scripts/test 的固定輸入。
- `dist-manifest.json`：8 個 preview 靜態資產；public 與 dist bytes 相同。
- `final-npm-{test,check,build}.log`：exit 0；45/45 tests、8 assets/7 syntax checks/current build、8 assets build。
- `browser-evidence.json`：CUA 真實觀測；兩語主流程、編輯失效、錯誤焦點、確認/鍵盤/320px 60列、原生複製及下載 bytes。
- `final-preview.jpg`、`final-mobile-{zh,en}-60.jpg`：凍結候選確認。
- `environment-{before,after,comparison}.json`：兩次 PASS，HKCU/HKLM PATH type/hash/長度/ephemeral 及完整 Environment fingerprint 全部不變。

名稱原文控制字先於 trim 驗證；下載 URL 各自延後 30 秒釋放、上限 8、pagehide 全清；11 項真 app harness 事件/競爭測試包含相關邊界。沒有用 mock 冒充原生或 BFCache。

B13 真停用 JavaScript 的瀏覽器場景仍 **NOT_RUN**（CUA 無該設定能力）；只有 noscript/初始 disabled 的靜態檢查通過。主代理需補此必要項或明確處置缺能力。B10 真 zoom/設備/AT/高對比、B11 真 BFCache、B12 完整 Network/Storage、B14 真 offline/缺 Clipboard，以及原生下載 OS 選單仍各別 NOT_RUN。詳細界線與精確命令見 [HANDOFF](../HANDOFF.md)。

預覽 loopback `http://127.0.0.1:4207/index.html` 與 `/en/index.html`，task-owned exec session 19397 保留。兩語預覽 noindex/nofollow，無 production canonical。來源未公開，hosting 未部署，首頁未變更；不得將本候選當 live 或 external-review complete。

## M2 正式候選

證據根 `../../../.runs/subscription-budget/w16-27-m2-20261016-01a141f4/`。正式產物 `dist-production/` 共10個白名單檔案；canonical 為 https://subscriptions.glossquote.com/index.html 和 /en/index.html，雙向 zh-Hant/en/x-default，JSON-LD 無評價或使用人數，CSP 僅允許兩語精確 JSON-LD hash 並保留 connect-src/frame-ancestors none。預覽仍是獨立 noindex 版本，八個 public source 資產與 M1 hash 一致。

wrangler.jsonc 為純 JSON、固定 compatibility_date 2026-10-16、唯一 subscriptions.glossquote.com custom domain、靜態資產-only；沒有 main/build/bindings/其他target，metrics/observability/logs/traces/worker.dev/preview URL 皆關閉。主代理 release-profiles assertConfig 實際通過。未執行 Wrangler 或 Cloudflare API。

最終 workspace `npm test` 50/50（31 core、11 app、3 preview/toolchain、5 production），`check`、`build`、`build:production`、`check:production`、`release:check` 全 exit0。正式模型實際服務 dist-production bytes 於 127.0.0.1:5207，session15952保留；production-http.json 記錄9個可服務資產、404/405/421/HEAD/MIME/SEO/CSP hash與path gate。模型不等於live Cloudflare。

CUA production-browser.json 記錄兩語A04、語言清空、實際DOM SEO。原生TXT下載1284 bytes與報告一致，無BOM/額外LF。剪貼簿首次顯示成功後讀回不一致，第二次相同手勢等待成功後讀回一致；兩次觀測均保留，沒有猜測原因或改寫已凍結app。B13真正JS停用及其餘人工NOT_RUN，主代理已依使用者允許保留，不需再次申請。

來源白名單44檔由 scripts/release-check.mjs 固定，僅在獨立reviewed copy作Git publication，原始碼ZIP由固定HEAD archive，不含dist/evidence/node_modules/憑證。remote commit、visibility、ZIP及guards的實際結果由發布後工作區HANDOFF補記；來源快照不嵌入自身commit hash，避免自我指涉。

### M2 發布後固定識別

PUBLIC https://github.com/KYStr/glossquote-labs-subscription-budget ，branch codex/m2-production，完整remote/API commit `bc211486ade235366b5dc2b42f1297090ceacad9`。reviewed copy為M2 evidence下 publishing-copy；HEAD原始碼ZIP `glossquote-labs-subscription-budget-bc211486ade235366b5dc2b42f1297090ceacad9.zip`，104415 bytes、44檔（7個目錄項目另計），SHA-256 `fa53bcb77728f0b8c144f798a1ef448c4025b4dff86d089b799b51618a636370`。Git blob/ZIP/reviewed source逐檔一致，archive-check乾淨重驗全部6命令exit0/50 tests且8 preview+10 production產物一致。

Git settings capture/verify及Windows Environment before/after均PASS、指紋不變。僅工作區5份狀態文件在publication後補記，不回寫固定commit/ZIP；驗收以publishing-copy或ZIP為準。production-manifest.json含兩語及全部10檔bytes/SHA；M2-RESULT.json為總表。正式模型session15952保留，本次未部署任何Cloudflare或首頁。
