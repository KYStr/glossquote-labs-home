# 圖片列印尺寸試算（Image Print Size Calculator）

狀態：**M0 規格，尚未實作。** 本資料夾目前只定義產品規格；沒有產品程式、測試結果、固定版本、公開來源或正式網址。

## 使用者與工作

使用者已知一張圖片的像素寬高，想設定實際列印寬度，查看按比例推算的高度、有效 PPI，以及是否達到自己設定的目標 PPI。MVP 只收像素尺寸和毫米寬度，不收圖片檔，也不修改圖片。

一句話：輸入圖片像素寬高、列印寬度和可調整的 PPI 門檻，取得等比例列印高度、目前有效 PPI 和達標所需的最少像素寬高。

PPI 是依像素與尺寸計算的密度指標；預設 300 PPI 只是可修改的起始值，不是通用列印品質標準或品質保證。結果不評估印表機、紙材、觀看距離、裁切、色彩或影像處理。

## 使用環境與假設

- 第一版提供繁體中文與英文。繁中頁為 /index.html，英文頁為 /en/index.html。頁面切換會清除目前輸入和結果；只有值偏離初始狀態或已有結果時才先確認。三個資料欄空白、目標仍為預設 300、無結果時沒有待保留工作，不需確認。
- 適用桌面鍵盤、平板與手機。像素欄位和 PPI 欄位使用可見標籤及 ASCII 整數提示；毫米寬度使用 ASCII 句點和最多兩位小數。手機小數鍵盤若不提供句點，頁面提供可見的「插入小數點 / Insert decimal point」輔助，不把逗號轉成句點。
- M1 預覽只綁定 127.0.0.1:4211。5211 是日後 M2 本機 production-like HTTP model 的候選埠，只用來驗證靜態回應，不是試算 API。
- 試算在靜態資產載入後於目前頁面同步完成。沒有圖片上傳、應用程式網路請求、資料儲存、帳號或遙測。首次載入仍需下載網站檔案；不承諾冷啟動離線可用。
- 無 JavaScript 時顯示說明，工作控制保持停用；不得誤稱頁面仍可計算。低階手機上的載入和操作體驗尚待 M1 實測。
- 使用頻率、常見目標 PPI、實際手機鍵盤差異與使用者是否理解 PPI 尚未驗證，不代表搜尋量或市場需求。

## 非目標

- 不上傳、裁切、旋轉、縮放、銳化、AI 放大、轉檔或修改圖片。
- 不提供圖片預覽、列印工作流程、印表機設定、色彩管理、DPI 轉換或品質保證。
- 不以單一 300 PPI 規則判定所有用途；目標 PPI 由使用者在 1–2400 間設定。
- 不提供英吋輸入、任意高度、裁切比例、版面排版、多圖、檔案匯入、複製、下載、報告、雲端、同步或持久草稿。
- 不宣稱達標就一定清晰，也不宣稱未達標就一定無法使用。

## 閱讀順序

1. [PRODUCT.md](PRODUCT.md)：使用者工作、MVP 需求與非目標。
2. [TECHNICAL.md](TECHNICAL.md)：精確輸入 schema、BigInt 算式、結果和錯誤 shape。
3. [UX-SEO.md](UX-SEO.md)：雙語介面、使用環境、FAQ 與 SEO。
4. [ACCEPTANCE.md](ACCEPTANCE.md)：核心 oracle、瀏覽器案例及 NOT_RUN 邊界。
5. [TASKS.md](TASKS.md)：M0–M3 的工作界線與 gate。
6. M1 開始前由主代理補齊本工具共用契約： [AGENTS.md](AGENTS.md)、[START-HERE.md](START-HERE.md)、[TASK-ENTRY.md](TASK-ENTRY.md)、[HANDOFF.md](HANDOFF.md)。
7. M1–M3 依主代理準備的 [docs/BRAND.md](docs/BRAND.md)、[docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)、[docs/ENGINEERING.md](docs/ENGINEERING.md)、[docs/PRIVACY-SECURITY.md](docs/PRIVACY-SECURITY.md)、[docs/RELEASE.md](docs/RELEASE.md)、[docs/RELEASE-CANDIDATE.md](docs/RELEASE-CANDIDATE.md)、[docs/GIT-PUBLICATION-SAFETY.md](docs/GIT-PUBLICATION-SAFETY.md) 執行。

M0 僅交付這六份產品規格。規格案例是固定預期值，不是已執行或通過的測試。
