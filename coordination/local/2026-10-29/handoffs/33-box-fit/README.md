# 箱內排列容量試算（Box Grid Capacity Calculator）

狀態：**M2 正式工具鏈與公開來源候選，待主代理驗收；UI 操作維持暫停。** 最後 59 個測試、check、preview/production build、production check、release check 和乾淨來源副本 gates 全部通過。公開來源：[KYStr/glossquote-labs-box-fit](https://github.com/KYStr/glossquote-labs-box-fit)，固定 commit `cc9e23ddcaae09d5a4d5423c305458c86cafb5e2`。來源公開不代表 hosting 已上線；部署和首頁由主代理在驗收後處理。

## 本機使用

Node.js 24+，不需安裝套件。於本資料夾執行 `npm test`、`npm run check`、`npm run build`；`npm run dev` 只在 `127.0.0.1:4213` 提供 noindex 預覽。主代理可沿用 HANDOFF 記錄的既有背景預覽服務。

正式產物依序使用 `npm run build:production`、`npm run check:production`、`npm run release:check`。`npm run preview:production` 只綁 `127.0.0.1:5213`，是 HTTP 模型而非 Cloudflare。`dist-production/` 與 M1 preview 隔離；正式 manifest 在旁邊的 `dist-production.manifest.json`，不放進部署資產。M1 八個 public 檔案 bytes 均未變。公開副本排除內部作業文件；其 README 來源為 `release/PUBLIC-README.md`。

2026-10-18 最新限制：所有 browser/native/computer UI 操作均暫停，包括隱藏分頁的輸入、點擊、鍵盤、resize、截圖、導航及讀取；只繼續背景 CLI／檔案工作。後續 UI 項目標記 `NOT_RUN_USER_FOCUS_INCIDENT`，待主代理明確解除。不以 hidden 作為安全保證。

## 使用者的工作

輸入箱子可用的內部長、寬、高，單件物品長、寬、高，和物品彼此之間的間隙，估算以單一朝向、均勻直角格排列時可放的數量。可選擇只看原始朝向，或比較六種沿箱子三軸對齊的朝向，並查看每層數量、層數及哪個朝向的格數最多。

工具只計算尺寸格數，不是混合朝向或最佳裝箱演算法，也不判斷形狀、重量、容器承重、材料變形、操作空間或運輸安全。數學結果不保證實物可裝入。

預設假設：需求頻率待驗證；尺寸都以毫米輸入；間隙只存在於相鄰物品之間，邊界沒有額外留白；允許旋轉預設開啟，表示比較六個軸對齊排列。使用者可關閉旋轉，只算長×寬×高原始方向。這些初始值不構成實物或運輸建議。

## 規格閱讀順序

1. [PRODUCT.md](PRODUCT.md)：使用情境、輸入、結果和非目標。
2. [TECHNICAL.md](TECHNICAL.md)：固定 API、錯誤、BigInt 公式與結果 schema。
3. [UX-SEO.md](UX-SEO.md)：雙語畫面、操作、FAQ 與 SEO。
4. [ACCEPTANCE.md](ACCEPTANCE.md)：手算數值 oracle 與瀏覽器案例。
5. [TASKS.md](TASKS.md)：M0–M3 milestone 與 gate。
6. [START-HERE.md](START-HERE.md)、[AGENTS.md](AGENTS.md)、[HANDOFF.md](HANDOFF.md)：任務入口、原功能對話契約與實際交接狀態。
7. [docs/BRAND.md](docs/BRAND.md)、[docs/ENGINEERING.md](docs/ENGINEERING.md)、[docs/PRIVACY-SECURITY.md](docs/PRIVACY-SECURITY.md)、[docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)、[docs/RELEASE.md](docs/RELEASE.md)、[docs/RELEASE-CANDIDATE.md](docs/RELEASE-CANDIDATE.md)、[docs/GIT-PUBLICATION-SAFETY.md](docs/GIT-PUBLICATION-SAFETY.md)：本工具共通產品、安全、工程與發布規則。

## 固定候選

- 名稱：箱內排列容量試算 / Box Grid Capacity Calculator
- slug：box-fit
- 正式候選 origin：https://boxfit.glossquote.com，尚非已部署網址
- M1 預覽：http://127.0.0.1:4213/
- M2 本機 production model：http://127.0.0.1:5213/
- 語言頁：繁中 /index.html、English /en/index.html

M1/M2/M3 的狀態及實際證據以 HANDOFF.md 和 docs/RELEASE-CANDIDATE.md 為準。不得把手算規格案例寫成已通過測試。
