# WEB-M1 主代理驗收 — 2026-10-22

**通過：純網頁候選 WEB-M1 / R03–R04。尚未公開 GitHub、部署、加入正式首頁或通過外部驗收。**

使用者已選「完全網頁且全部本地，只支援瀏覽器可直接讀取的來源」。本版直接保存可讀 HTTPS 影音原檔，或將支援的短音軌轉成 PCM16 WAV；也可選本機檔案。無助手安裝、解壓或執行檔。平台作品頁不在本版支援範圍。

## 已親自完成

| 驗證 | 結果 | 實際範圍 |
|---|---|---|
| 完整產品測試 | 249 PASS / 0 fail / 0 skip | 保留原139項，包含新網頁及格式回歸 |
| 主代理獨立測試 | 57 PASS / 0 fail / 0 skip | URL、實際串流大小、取消等待、格式負例及獨立 WAV 解析 |
| check / build | PASS | 零外部依賴、preview/noindex、閉合15檔產物與manifest |
| 隔離 Chrome 基本操作 | 30 PASS | 雙語demo、原檔/WAV真實bytes、File、CORS負例、取消、失效、指定階段storage與320px |
| 最終修正版瀏覽器補驗 | 20 PASS | R03/R04拒絕、正確有界WebM標頭、WAV smoke、鍵盤、語言導覽、200% CSS文字重排 |
| 下載 | 14 次 protocol 保存 | 取得並核對檔案bytes；不代表原生保存對話框或使用者OS下載通過 |
| Windows保護與程序收尾 | PASS | 完整persistent Environment snapshots不變；所有已捕捉任務job程序世代退出 |

實作由原功能對話 `01a16218-cb6e-7721-b83f-f34241b8c08c` 完成。實際送出 `gpt-6.1-sol` / `max` 配置請求，工具接受；backend身分未獨立確認。主代理讀取修改和測試，實際重現4個格式問題並交回原對話修正：假MP3、QuickTime誤標、WebM標頭外假DocType、MP4不完整品牌項。原失敗證據保留。

Chrome版本155.0.8059.85。使用既有審查過的noninteractive station/private desktop/exact job與native sandbox，沒有桌面輸入、使用者profile、IME或clipboard操作。第一輪CORS負例因Playwright自動補ACAO而失敗，修正測試為明確不匹配的Origin後通過；沒有把該測試工具行為列成產品bug。

30項基本瀏覽器案例在修正前候選執行；最終候選的payload只改`assets/media.mjs`。以最終20項補驗覆蓋格式變更及WAV主要流程，其餘已通過的相同輸入證據保留。不能把此紀錄解讀成對所有真平台或所有codec的相容測試。

## 固定版本及待驗範圍

來源manifest SHA-256：`2fd1b7dfe8a4e5a3df2c8d2c4f13c73fec825c23f0d519ea2fc1aa89c1e0bbd5`。

dist manifest SHA-256：`b9b649c74a9c329080193d5241cd9e667e533f45af5831c1c584e8823f699509`。

原生選檔／保存、OS下載行為、真機、Edge、原生縮放／IME／剪貼簿、真外部媒體來源及完整Network/Storage生命週期仍NOT_RUN。合成HTTPS回應不代表真TLS或平台實測。WebM正例只確認基本標頭辨識，不宣稱完整影片可播放或解碼。

本機預覽：`npm run build`、`npm run serve -- --port=4218`，開啟 `http://127.0.0.1:4218/` 或 `/en/`；瀏覽器使用本身不需Node。候選預設noindex；正式發布是下一里程碑，需原對話推來源，主代理設定免費Cloudflare、核對正式SEO/HTTP/瀏覽器及首頁。

[主代理完整結果](../../.runs/media-web-m1-2026-10-22/primary-result.json) · [獨立測試](../../.runs/media-web-m1-2026-10-22/independent.test.mjs) · [格式回歸](../../.runs/media-web-m1-2026-10-22/format-regression.test.mjs) · [原對話交接](HANDOFF.md)
