# 照片聯絡表 — M1B 離線發布候選

本輪契約：root workspace 的 `.runs/batch20-release-prep-2026-10-23/TASK.md`。這是正式靜態資產的離線準備，**尚未上線，也不是 M2 發布放行**。產品仍為 `0.1.0-m1`；本輪只增加 M1B 發布工具鏈與證據。requested model `gpt-6.1-sol/max`，backend 身分未獨立確認。

預定 origin 固定為 `https://contact-sheet.glossquote.com`，toolSlug 固定 `image-contact-sheet`。此網址只是產物內的預定 canonical；沒有進行網域查詢、GitHub、認證、上傳、Cloudflare、部署或共享首頁操作。

## 重現與審查位置

Node 24、零 dependency，不需要 install：

```text
npm test
npm run check
npm run build:release
npm run check:release
```

- `build:release` 精確對應 `node scripts/release.mjs build`。
- `check:release` 精確對應 `node scripts/release.mjs check`。
- 沒有 mode、錯誤 mode 或多餘參數都失敗；CLI 不接受 origin、路徑或部署參數，也不讀環境設定。
- 發布候選 web root：`release-artifacts/site/`。審核 manifest：`release-artifacts/manifest.json`，不在 web root。
- 瀏覽器驗收者應使用已確認完全隔離使用者輸入的機制，以 **site 目錄作 web root**；本輪不啟動 server/browser，也不以直接開 HTML 檔案宣稱模組執行通過。
- 原 `npm run build`／`dev` 未改；未重建或改寫 `public/`、`dist/`，預覽仍 noindex。舊 M1 evidence 不覆寫。原 `inventory.mjs` 的 M1 清單是歷史固定版本，不要以它覆寫本輪新證據。

## 可重現產物與信任邊界

`scripts/release-inputs.json` 釘住已驗 M1 的13個 public 來源 path/bytes/SHA-256，與原 M1 inventory 相符。`release.mjs` 僅允許既有 `PUBLIC_FILES`；先檢查完整來源樹、尺寸與雜湊，拒絕新增／缺失／變動／symlink/junction，再產生預期 bytes。

site 是原13資產加 sitemap 的去重集合，共14檔。JS/CSS 與其他非 SEO 資產逐位元組保留。兩語 HTML 只改 head robots，加入唯一 canonical 與 zh-Hant/en/x-default links；各 canonical 為 `/index.html`、`/en/index.html`，x-default 指向中文。html lang、title、description、H1、可見「本地候選預覽」與 body 全部保留。

robots 為 Allow `/` 並列出唯一 sitemap URL；sitemap 只列兩個 canonical、沒有 lastmod。`_headers` 直接以原 public/_headers 為來源，只把 X-Robots-Tag 改成 `index, follow`；CSP、connect/script/img/blob 規則與其他安全／隱私 headers 全部保持原 bytes。沒有使用 serve fallback，也沒有啟動 serve。配置檔不是 hosting header 驗證證據。

manifest schema 固定 `schemaVersion:1`、`mode:release-candidate`、origin、toolSlug、排序 files/sourceFiles。它不含時間、隨機資料、本機絕對路徑或自身 hash。check 不用 manifest 來決定讀取路徑或認定檔案正確，而是從釘住的 public 重新建立預期 bytes 和 manifest，再逐檔比較。因此一起修改產物及 manifest 也不能令檢查通過；未批准的來源修改也會被 pins 擋下。這是以受審工具鏈／pins 為信任根的完整性檢查，不是來源簽章或對任意惡意工具鏈修改的保證。

build 先完整核對既有輸出。完全相符的合法重建不寫檔，bytes 確定相同。缺檔、改檔、額外檔、未知空目錄、部分／未管理輸出一律保留並拒絕，不自動修補或刪除。第一次產生使用 exclusive-create，manifest 最後寫；若 I/O 故障留下新建的部分結果，後續 build 也會拒絕，需主代理審查處理。本工具不做遞迴刪除。

## 驗證與未驗項目

新增16項 Node release 測試，以獨立 literal domain/SEO oracle、暫存 copy 與 before/after bytes 檢查驗證：兩語互返、head 限定差異、安全 header 保留、runtime／preview 不變、確定重建、CLI 負例、缺失／額外／污染輸出、manifest+asset 協同竄改、來源變更、junction/symlink。負例只操作 `evidence/m1b/release-test-cases/` 內的本任務 copy；每個拒絕案例都核對原物沒有改寫。舊 tooling 測試僅把臨時位置移至 m1b，不改產品 oracle。

本輪最終命令／test 數／exit、完整環境前後快照、47份不可變檔核對與新來源／產物雜湊記於 HANDOFF 追加段及 `evidence/m1b/`。不得以離線 full suite 當成 browser gate。

全部維持 **NOT_RUN_USER_FOCUS_INCIDENT**：真 JPEG/PNG decode、EXIF1–8實際旋轉／鏡像、透明白底與 Canvas PNG再解碼、實際下載／取消／記憶體、雙語 render／鍵盤／AT／320px／200% zoom，以及正式 HTTP headers／Network／Storage。沒有啟動任何 browser/CUA/IAB/CDP/native 或使用桌面輸入／clipboard；沒有新依賴、服務、憑證或持久環境／Git/auth 修改。

下一步由主代理讀實際 diff／site／manifest 並獨立核對。必要 browser gates 通過後仍需獨立的 M2 放行；本輪不代表公開來源、部署、首頁整合或外驗完成。
