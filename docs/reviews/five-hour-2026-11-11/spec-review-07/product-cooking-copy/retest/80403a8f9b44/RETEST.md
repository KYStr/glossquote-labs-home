# 料理度量換算 Blob URL 複驗

候選 PR #323，固定 head `80403a8f9b44b9459d37842dc5d41796e61934f2`。**本次離線修正複驗通過。** 真瀏覽器、真機與原生下載仍為 `NOT_RUN_USER_FOCUS_INCIDENT`，產品未接受。[候選固定 commit](https://github.com/KYStr/glossquote-labs-home/commit/80403a8f9b44b9459d37842dc5d41796e61934f2) · [URL 修正範圍](https://github.com/KYStr/glossquote-labs-home/blob/3ffe6eb207e86c08691a7b45bd4459a740beff29/docs/reviews/five-hour-2026-11-11/dispatch/product-cooking-copy/AMENDMENT-URL-LIFECYCLE.md)

## 固定來源

此 commit 直接承接 `4f259d919e56c2f098035d2ae9d4431dc7b50af6`。公開 tree 有 37 個檔案，六個變動檔從固定 commit 讀取並驗 Git blob 與 SHA-256，其餘 31 檔與上一候選逐 byte 相符。產品差異限於 `createWorker` 函式、對應生成 app、預覽 manifest 與三案新測試。另兩個變動檔是作者證據。函式以外的 app 內容相同，public app 與生成 app 位元組一致。[固定檔案與範圍](retest-provenance.json)

## Worker Blob URL

使用固定 app.js 的完整 `createWorker`，注入 Node VM 的 Blob、URL 與 Worker。controller 重試經原 controller，使用實際 posted snapshot 產生協定形狀的回覆。

| 案例 | 舊 head | 此 head |
| --- | --- | --- |
| 正常終止 | 建立 1，撤銷 1 | 建立 1，撤銷 1 |
| 重複終止 | 建立 1，撤銷 2 | 建立 1，撤銷 1 |
| 建構拋錯 | 建立 1，撤銷 0 | 建立 1，撤銷 1，傳出原錯誤 |
| 終止拋錯 | 建立 1，撤銷 0 | 建立 1，撤銷 1，傳出原錯誤 |
| controller 重試 | 保留 draft，建立 2，撤銷 1 | 保留 draft，重試完成，建立 2，分別撤銷 2 |

修正使用 `catch` 釋放建構失敗的 URL，以 `finally` 在終止時釋放，並防止重複終止。五案 exit 0。原候選的缺口及本次觀察均為受控離線證據。[舊 head 結果](../4f259d919e56/url-original.json) · [此 head 結果](url-retest.json) · [注入式腳本](../verify-worker-url.mjs)

## 本次命令與沿用證據

`node --test test/worker-lifecycle.test.mjs test/build.test.mjs` exit 0，6 passed，含兩次可重現預覽重建、loopback 與三個生命週期測試。固定來源 checker exit 0。生成檢查在重建前後各 exit 0，9 個產物與 manifest 逐檔符合公開版本。Windows 持久環境前後指紋一致。[命令及產物](retest-commands.json)

雙語 HTML、checker、controller、其測試、核心、fixtures、報告與 Worker 來源的 blob 相同。沿用上一候選的 14 個 checker 負例、兩個 HTML 退修案、八個舊回覆及三個對照。固定 33 個 Worker 回覆與 14 份報告仍屬初次審查的離線證據。初次審查保留當時的 checker FAIL 與驗收範圍。[checker 與 controller 複驗](../4f259d919e56/RETEST.md) · [原固定審查](https://github.com/KYStr/glossquote-labs-home/blob/612c313ecf7d4df83a244c6758422abbd85a4e84/docs/reviews/five-hour-2026-11-11/spec-review-07/product-cooking-copy/REVIEW.md)

## 九個產品面向

| 面向 | 分數 | 狀態 | 證據及待驗 |
| --- | ---: | --- | --- |
| `functionality` | null | `NOT_RUN_USER_FOCUS_INCIDENT` | 八種舊回覆與三個對照可沿用，Blob URL 的控制器重試在離線環境可完成。待驗 兩語真實表單、結果與下載。 |
| `boundaries` | null | `NOT_RUN_USER_FOCUS_INCIDENT` | 固定錯誤、取消／編輯／重設的隔離案例有證據。待驗 瀏覽器首錯移焦與各狀態呈現。 |
| `privacy` | null | `NOT_RUN_USER_FOCUS_INCIDENT` | 來源與靜態規則一致，loopback 資源與 CSP 測試通過。待驗 真瀏覽器 Network、Storage、URL 與 console。 |
| `security` | null | `NOT_RUN_USER_FOCUS_INCIDENT` | 14 個引用負例可沿用，五個 Blob URL 控制通過，固定 checker exit 0。待驗 實際瀏覽器資源生命週期與安全行為。 |
| `usability` | null | `NOT_RUN_USER_FOCUS_INCIDENT` | 兩語內容與既有操作入口位元組相同。待驗 桌面與行動操作、狀態回饋及下載。 |
| `accessibility` | null | `NOT_RUN_USER_FOCUS_INCIDENT` | 兩語標籤、錨點與語意結構位元組相同。待驗 鍵盤、實際焦點、縮放、reflow 與輔具。 |
| `localization-seo` | 100 | `PASS_PREVIEW` | 沿用兩語靜態證據，新建置的 loopback noindex 通過。待驗 正式 HTTPS／SEO。 |
| `toolchain-provenance` | 100 | `PASS` | 固定 tree、37 個 blob、兩次重建及 9 個產物與 manifest 相符。 |
| `compatibility` | null | `NOT_RUN_USER_FOCUS_INCIDENT` | 既有 Node Worker 33 回覆可沿用，本次 Node VM 與 loopback 通過。待驗 真實隔離 Chrome／Edge、真機與原生下載。 |

`rubricComplete=true`，`requiredChecksComplete=false`，`productAccepted=false`。Registry、合併及部署均為 `NOT_RUN`。[結構化複驗](retest.json)
