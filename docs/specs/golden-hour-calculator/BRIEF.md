# 黃金時刻計算 / Golden Hour Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-golden-hour-calculator-20261121`

攝影者為了拍日出日落前後那段暖金色與深藍色的光，先確認某個日期、某個地點的黃金時刻與藍調時刻各在幾點到幾點。天氣 App 只給日出日落時間，不給這兩個攝影時段；而且「日出後一小時」這種固定時長說法在赤道只有約 40 分鐘、在高緯度夏天可達 80 分鐘以上，照鐘點抓一定錯過光。

MVP 範圍。單一日期、單一地點：NOAA fractional-year 近似公式（γ 以當地正午取值）→ 日出、太陽正午、日落、日長、正午仰角；太陽仰角定義的攝影時段：黃金時刻 −4° 至 +6°、藍調時刻 −6° 至 −4°（PhotoPills 慣例），各分上午與傍晚兩窗；緯度／經度／固定 UTC 偏移輸入，含 8 個城市預設。非目標為時區資料庫、日光節約時間自動判斷、IP 定位或地理編碼、海拔與大氣折射的額外修正、民用／航海／天文晨昏蒙影表、月相、多日或全年表格、把結果用於導航、航行、航空或其他安全用途。

首個可觀察案例。台北夏至的黃金時刻（`taipei-summer-solstice`）：上午 04:48–05:37、傍晚 18:13–19:02，各 49 分鐘；藍調時刻各 10 分鐘。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/golden-hour-calculator/`，固定分支與 PR 交驗。本輪規格作者簡報為 run 6 SPEC-AUTHOR-BRIEF.md 概念第 32 條（黃金時刻）；太陽算法與輸入規則與 `spec-sunrise-sunset-calculator-20261109`（draft PR #164）共用同一 NOAA fractional-year 釘版，本工具在其上加算仰角攝影時段。
