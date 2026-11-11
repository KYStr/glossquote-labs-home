# 壁紙採購與坪數換算規格修訂

本候選涵蓋兩份規格、字面測例及離線文件驗證。維護任務 ID 為 `labs-five-hour-repair-wallpaper-ping-20261111`。

- 壁紙按全牆寬估算整幅採購。WALL-01 的窗戶例修為 6 幅、2 捲、淨面積 6.04 m²。既有清單例從 19 幅、7 捲修為 23 幅、8 捲，淨面積 26.31 m²。下載保留結果欄位，`effectiveWidthCm` 現為全牆寬，`openingsWidthCm` 為尺寸摘要。
- WALL-02 先完成逐欄檢查，再回第一個超高開口的 `OPENING_HEIGHT_EXCEEDS_WALL`、`heightM` 及 1-based 開口列號。同高合法。待產品修訂時，須將列錯連到開口高度欄，並更新兩語說明、下載測試與建置產物。
- 坪數的 PING-01 改以 100 坪檢查精度。精確換算得 3558.32 ft²，使用 3.3058 近似係數得 3558.33 ft²。原 30 坪報告的 99 bytes 與 SHA-256 已核對。
- 原規格固定於 [壁紙 PR #226](https://github.com/KYStr/glossquote-labs-home/pull/226) 的 `f8939291d2e283f1e6496d3a9cc802a054732200`、[坪數 PR #227](https://github.com/KYStr/glossquote-labs-home/pull/227) 的 `6d7cc4cd18a273b0d386b19b85b883573d097cba`。候選父 commit 為中央 default 的固定版本，該版本沒有這兩份規格。另附 [原來源差異](source-diff.patch) 與 [來源及候選雜湊](manifest.json)。差異檔的兩行舊作者工作環境資訊以指向固定來源的文字代替。
- 既有 [壁紙 Build #270](https://github.com/KYStr/glossquote-labs-home/pull/270) 及 [坪數 Build #274](https://github.com/KYStr/glossquote-labs-home/pull/274) 由原責任路徑處理。產品驗收、瀏覽器、原生對話、正式 SEO 與部署皆為 `NOT_RUN`。規格文件候選待非作者審查。

## 離線重驗

在候選 repository root，以 Node 24.x 執行。

```sh
node docs/reviews/five-hour-2026-11-11/candidates/repair-wallpaper-ping/verify-wallpaper-calculator.mjs docs/specs/wallpaper-calculator/fixtures.json
node docs/reviews/five-hour-2026-11-11/candidates/repair-wallpaper-ping/verify-ping-area-converter.mjs docs/specs/ping-area-converter/fixtures.json
```

壁紙核對 19 核心、3 controller 和兩份 canonical 下載。坪數核對 24 核心、3 controller、100 列速查表、係數分辨例和原 30 坪下載。腳本改編自固定初審的離線文件驗證器，以整數推導字面結果。
