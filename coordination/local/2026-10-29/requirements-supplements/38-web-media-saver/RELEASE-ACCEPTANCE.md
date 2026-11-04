# WMA22 外驗修正整合（2026-10-22 最新）

F01發布HTML完整性缺口已由原對話修正，主代理親讀diff、獨立Node24.14.0重跑279/279產品測試、check/release及16個head反例通過。修正前16例誤收，修正後16例拒絕；正例皆通過。

修正版公開來源commit `d9a4fe848f00b8a6e2285a130d177b7f19e226b3`；正式站仍是`8716a264c6d6866d2343a0b7ec7b2a163dc797c7`的相同產物。本輪16份dist未變，15份公開媒體檔及雙語首頁HTTP bytes與舊發布一致，因此不重新部署或重寫首頁。看板已更新本輪來源與部分外驗狀態。

**主驗F01修正通過，整體外驗仍PARTIAL，等待修正版外部確認。** 完整Network/Storage、跨來源CORS、Edge、原生選存、真機及讀屏沒有改標PASS。本輪全程背景CLI/HTTP，沒有瀏覽器或桌面互動。

[本輪主驗](../../.runs/web-media-external-2026-10-22/primary/REVIEW.md)、[版本與發布結果](../../.runs/web-media-external-2026-10-22/primary-result.json)。以下保留前次發布紀錄，勿將歷史browser測試當作本輪重跑。

---

# 網頁影音保存：發布驗收

本版已公開來源、部署並更新雙語首頁，**主代理限定範圍驗收通過，等待外部驗收**。不代表主流平台通用下載或所有格式已完成。

- 正式站：[繁體中文](https://media.glossquote.com/)、[English](https://media.glossquote.com/en/)。
- 公開來源：[GitHub](https://github.com/KYStr/glossquote-labs-web-media-saver)，固定 commit `8716a264c6d6866d2343a0b7ec7b2a163dc797c7`。
- 首頁：[繁中](https://glossquote.com/index.html)、[English](https://glossquote.com/en/index.html)，來源 commit `7e937c8cd9f975562daf65f4b2d524a130134023`。
- [主代理完整結果](../../.runs/media-web-release-2026-10-22/primary-result.json)、[下一階段產品規格](docs/PRODUCT-NEXT.md)。

主代理親閱發布程式、設定、測試與候選 diff，獨立重跑14新增發布測試與check；驗證原35 executable/config檔及未變的M1來源hash。既有249產品／57獨立／50瀏覽器證據只沿用未變範圍，不冒稱本輪重跑。

新增隔離Chrome測試：本機12、正式站12、首頁整合14。每階段包含雙語真實download bytes；合成H264/AAC影片11,759 bytes保存完全相同，輸出WAV96,044 bytes、48kHz、1秒、約439.5Hz，符合440Hz來源且非靜音。原生選檔／儲存對話框沒有操作。這是單一codec fixture，不能代表所有影音格式。

實際HTTPS逐一比對正式產物bytes/SHA與完整預期安全headers、雙語SEO、robots/sitemap、404/aliases；雙語首頁往返點擊通過。測試期間未見非預期請求/遙測注入，任務後Storage觀測為空；完整生命週期仍待驗。瀏覽器位於私有非互動station/desktop及job，禁止clipboard、對話框/非預期popup；精確job結束證據已保留。Windows持久環境與Git設定指紋未變。

本次上線內容是瀏覽器可讀HTTPS直鏈／本機檔案保存和短片WAV，不含平台作品頁擷取、MP3等新編碼、直播或播放清單。原檔32MiB，轉WAV輸入16MiB/120秒。P1/P2/P3見後續規格；未經架構變更授權不把內容送到代理後端。

原對話負責發布實作與GitHub推送；主代理負責獨立驗收、部署、首頁及看板。工具接受原對話要求gpt-6.1-sol/max；未有可獨立確認的後端身份。所有未驗項保留，沒有標記外部驗收完成。
