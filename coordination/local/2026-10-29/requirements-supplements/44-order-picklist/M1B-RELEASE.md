# 訂單揀貨與裝箱單：M1B 離線發布準備

狀態為離線 release candidate，等待主代理驗收與必要 browser gate。預定 origin 為 `https://picklist.glossquote.com`，不是已上線網址；本輪沒有 GitHub、部署或首頁變更。Requested configuration：gpt-6.1-sol/max；backend 身分未獨立確認。

在本工具目錄使用 Node 24+，不安裝依賴：

```text
npm test
npm run check
npm run build:release
npm run check:release
```

原有 test/check/build/dev 保持原設定；本輪不啟動 dev，也不重建原 preview。`node scripts/release.mjs` 沒有 mode、mode 不是 build/check 或有額外參數，都會拒絕；origin 只由程式固定常數提供，不能用 CLI／環境代入。

瀏覽器驗收者應使用 **release-artifacts/site/**，其 sibling **release-artifacts/manifest.json** 是審核清單，不應放進網站。此候選有 14 個 site 檔案；原 public/dist 仍是 noindex 的預覽。候選頁面保留原「本地預覽候選 / Local preview candidate」可見文字，直到後續獨立發布任務完成必要驗收。

Release HTML 只修改 head 的 robots 與 SEO links：中文及英文各自 canonical、zh-Hant/en/x-default 三個互返 alternate（x-default 中文）。新 robots Allow 與 sitemap 只列兩個 canonical，沒有 lastmod。原 `_headers` 只有 X-Robots-Tag 換成 index, follow；CSP、connect-src、script-src、privacy 和其他 headers 保持原 bytes。這是靜態設定，不是真實 hosting header 證據。JS、CSS、其他非 SEO 資產及整個 HTML body 都逐 byte 保持 R01。

Release 來源只允許 13 個固定 public 檔案，其 bytes/SHA-256 在 scripts/release.mjs 的 SOURCE_PINS 固定，獨立於輸出 manifest。Builder 先檢查完整來源及既有輸出；checker 重新讀取來源、重建 expected bytes、比對實際 site 與 manifest，並解析實際 HTML SEO。manifest 或資產一起竄改、來源變動、缺檔、多檔、未知空目錄、symlink/junction 都拒絕。檢查以已審核的腳本為信任邊界，沒有宣稱簽章或不可竄改主機。

第一次建置只用 exclusive writes 建立全新 release-artifacts；合法相同輸入重建只驗證並沿用既有 bytes。未知、被改過或不完整的既有輸出不會被採納、刪除、覆寫或自動修復。若 I/O 故障留下部分新建檔案，保留現況交主代理處理；不要自行刪除以重跑通過。

反例測試只在 evidence/m1b/fixtures/ 的自有臨時 copy 執行，沒有修改真 public/dist。這些 copy 含故意污染的檔案，只是測試工作區，**不列入 source/artifact manifest，也不放進發布 site 或使用者交付包**。測試 junction 在斷言後只移除自建 link，從不遞迴刪目標。主代理收回本輪 logs/manifests 與受審 source/release-artifacts，再製作單一整合 ZIP。

固定來源、site、全部 release artifacts（含 sibling manifest）的逐檔 bytes/SHA 與 aggregate digest 見 evidence/m1b/。`node scripts/m1b-evidence.mjs` 只生成本輪證據；原 M1/R01 證據不改。input-preservation.json 比對 public、dist 與全部舊 evidence/m1 檔案，environment-comparison.json 比對持久 Windows 環境。

尚缺：主代理獨立驗收、真正隔離 browser 的視覺／鍵盤／320px／200%／實際 File/下載／Network/Storage／生命週期／輔助科技及必要人工門檻，仍為 **NOT_RUN_USER_FOCUS_INCIDENT**；實際 HTTP/hosting headers、GitHub、部署和首頁整合未執行。本輪不是 M2 公開來源或上線放行，沒有新授權需求。
