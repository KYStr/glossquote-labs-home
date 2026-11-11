# 壁紙採購與坪數換算產品修訂

目前候選的 Worker URL 修正與驗證見 [PWP-03](REPAIR-03.md)。[PWP-01／02](REPAIR-02.md) 與下列原驗證為前版固定證據。下列原驗證結果屬固定候選 `8fbd9ac4d98865480444ce11c4b772389a54ea3c`，保留供對照。

維護任務 `labs-five-hour-product-wallpaper-ping-20261111`。以 [PR #283](https://github.com/KYStr/glossquote-labs-home/pull/283) 的 `448bd9fc9865fe65f6014b66f4a2e2d54b76f539` 接續既有產品。原壁紙 [Build #270](https://github.com/KYStr/glossquote-labs-home/pull/270) 與坪數 [Build #274](https://github.com/KYStr/glossquote-labs-home/pull/274) 保留。修正契約採已獨審接受的 [規格維護 PR #299](https://github.com/KYStr/glossquote-labs-home/pull/299) 固定 `c2c3f7715023990b1427e052a25c52f1987eaca9`，失敗基線見 [PR #314](https://github.com/KYStr/glossquote-labs-home/pull/314)。

- 壁紙以全牆寬計整幅，尺寸清單和開口總面積都用於淨牆面積。既有開口案例為 23 幅、8 捲，半高窗為 6 幅、2 捲及 6.04 m² 淨面積。保留 `openingsWidthCm` 摘要，`effectiveWidthCm` 採全牆寬。輸入格式檢查完成後，開口超高早於總量和短捲檢查，回報第一個超高列的 `heightM`。兩語表單在提交失敗時標記該列並呼叫焦點，等高合法。頁面提示、結果表頭、FAQ 和固定下載同步。
- 坪數沿用原精確核心、介面和建置產物。測試加入 100 坪的 3558.32 ft²，與 3.3058 近似係數的 3558.33 ft² 作對照，並核對速查第 100 列及原 30 坪下載。
- 兩款原產品共 57 個檔案逐 byte 核對 Git blob。原檔與實質差異見 [來源清單](source-manifest.json) 和 [產品差異清單](delta-manifest.json)。建置提交只帶兩個產品子樹與本交驗證據。
- 瀏覽器、真機、讀屏、Network／Storage 及原生下載的必要項仍是 `NOT_RUN_USER_FOCUS_INCIDENT`。必要檢查尚未完成，待同一固定候選的獨立審查。部署為 `NOT_RUN`。

[驗證與重跑方式](VERIFICATION.md) · [機器可讀證據](verification.json)

