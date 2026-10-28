# 網址參數檢視與整理 · URL Inspector

Gloss Tools by GlossQuote 的本機網址工作區。貼入 HTTP/HTTPS 網址，檢視重複 query 參數、逐列編輯或移除，再自行複製或下載 TXT。未修改片段保留原始編碼與順序；不造訪輸入連結。

**已上線，待外部複驗；版本尚未完成。** 使用[繁體中文](https://urls.glossquote.com/index.html)或[English](https://urls.glossquote.com/en/index.html)。2026-10-12主對話完成正式發布及雙語首頁整合、有界驗收；本功能對話記錄其證據，沒有代稱親跑正式站。固定部署實作commit c5f21708b0630e703b4cf5b6bbdb2a2899726f8c，Cloudflare version b0af355e-a06b-4ce7-b72d-5d4f28ca15d0。

來源發布與固定版本見 [HANDOFF](HANDOFF.md) / [發布交接](docs/RELEASE-CANDIDATE.md)。初始規格文件中的「尚未實作／尚未執行」是派工前紀錄；實際結果及仍待驗項以 [TEST-RESULTS](docs/TEST-RESULTS.md) 為準。

## 執行與驗證

Node.js 24+；無 runtime 或 npm 套件依賴，不需要 npm install。

```text
npm run dev
npm test
npm run check
npm run build
npm run build:production
npm run check:production
```

開發預览使用 `http://127.0.0.1:4193/index.html` / `/en/index.html`。埠被占用時伺服器使用 OS 分配的空閒埠，不終止其他程序。`npm run build` 生成 noindex preview；production build 只接受固定 origin `https://urls.glossquote.com`。兩模式皆輸出精確 12 個檔案與可重現 SHA-256 資產 manifest 到本工具 dist。

本工具不需要帳號、憑證、API 或遠端字型。上限為 65,536 UTF-16 碼元、256 參數列；不能解碼的列可保留或移除。修改簽名或驗證連結可能使其失效；整理參數不是安全掃描或去識別化保證。來源或草稿改動立即停用舊輸出。工作資料只在頁面記憶體，不保存至 storage 或頁面 URL。

## 測試與發布狀態

23 個 Node 測試通過；Chrome/Edge 本機主流程、邊界、清除、真實剪貼簿与原生 TXT bytes 已驗。主對話另驗正式11公開assets/30HTTP、Chrome兩語主要操作與同語首頁往返。完整 Network/Storage、完整鍵盤鏈、真實剪貼簿拒絕/race、hidden/recovery、200% 縮放及讀屏人工觀察仍有 NOT_RUN/局部待驗；沒有把有界結果稱為完整產品PASS。

Cloudflare 配置只部署 dist 靜態資產、沒有 Worker server 運算；正式操作由主對話整合，見 [RELEASE](docs/RELEASE.md)。自家資產載入仍需要網路。來源公開不代表額外授予任何未聲明的開源授權；本工具未加入第三方 runtime 資產。

---

## 派工前原始規格紀錄

以下保留當時的規格狀態與意圖，不是目前發布狀態。

原題名：網址參數檢視與整理。

狀態：規格就緒，尚未實作、未推送、未部署。工具 slug：url-inspector。

把一條長網址拆成可讀欄位，逐列修改或移除參數，再產生可自行複製的網址；從頭到尾不造訪該網址。

目標工作：內容編輯者檢查分享連結、客服用假例子理解重複參數、開發者查清楚 +、%20 與 %2B 的差別。瀏覽器 DevTools 已能檢視請求參數；本工具的差異是貼入後即可處理、無需先送出請求、未修改參數保留原始編碼。這是待使用者验证的價值假設，不代表已證實市場需求。

- 原生 HTML/CSS/ESM；開發測試 Node 24+；零 runtime 套件。
- 繁體中文與英文獨立頁；資料只在記憶體。
- 不提供短網址展開、惡意連結判定、掃碼、網頁預覽、UTM 活動追蹤、登入或雲端歷史。
- 正式候選：urls.glossquote.com；公開來源目標 KYStr/glossquote-labs-url-inspector，均尚未建立/發布。

開工讀 [START-HERE](START-HERE.md)、[TASK-ENTRY](TASK-ENTRY.md)、[HANDOFF](HANDOFF.md)，再依任務讀 [產品](PRODUCT.md)、[技術](TECHNICAL.md)、[UX/SEO](UX-SEO.md)、[驗收](ACCEPTANCE.md)、[任務](TASKS.md)。

T00 建立後的命令：npm run dev（127.0.0.1:4193）、npm test、npm run check、npm run build；正式產物命令見 [發布契約](docs/RELEASE.md)。目前不能把尚未建立的命令說成已通過。
