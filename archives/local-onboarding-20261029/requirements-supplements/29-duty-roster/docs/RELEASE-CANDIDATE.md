# 輪值排班表發布候選

M1主驗PASS；M2本機正式候選及reviewed publishing copy已通過69/69、preview/production建置、check及check:production。HTTP模型30案例與兩語瀏覽器均PASS。public與preview dist匹配8個M1固定hash。

固定設定：rota.glossquote.com、worker glossquote-duty-roster、compatibility_date 2026-10-17、static assets only、workers_dev/preview_urls/send_metrics/dependencies_instrumentation/observability/logs/traces關閉。12個正式產物只在dist-production。source commit/flat ZIP/manifest/guards將記HANDOFF最新發布段落與M2證據；本文是發布前候選快照。

M3 live、首頁及外部驗收NOT_RUN；人工限制保留，不把模型當部署。

## 來源發布已驗證

https://github.com/KYStr/glossquote-labs-duty-roster public，固定commit 08589bc3a9a5ccbc9f80eeffe8968f7767ccafc8，flat ZIP 114924bytes / SHA256 90c4dd98e577dd5f7ce2a918fb7e8fe35f8f9e9ea6c9d208a18be7e33021688e。修正乾淨來源測試依賴後，直接npm test69/69，build/build:production/release:check皆exit0。Git/環境guard無漂移。固定commit/ZIP不含發布後本地狀態註記。M3 live/首頁/外部仍NOT_RUN，詳HANDOFF。
