# 料理度量換算文案修正獨立審查

**判定為 revision。** 固定候選 `3fd8379427b1318ba65c1169f0256befc47ca93a` 的兩語來源文案與計算回歸通過。靜態檢查會把註解中的來源字串視為有效連結，需修正 CMC-CHECK-01。必要的真瀏覽器與原生下載仍為 `NOT_RUN_USER_FOCUS_INCIDENT`。[候選 PR #323](https://github.com/KYStr/glossquote-labs-home/pull/323)

## 固定來源與驗收設計

- 維護任務 `labs-five-hour-product-cooking-copy-20261111`，claim `fh-cooking-copy-20261111055849154-claim`。作者與 reviewer 身分不同。候選公開 head 與本地發布回執相符。原工具基線 `448bd9fc9865fe65f6014b66f4a2e2d54b76f539` 的 31 檔與來源匯入 `55930721be19cb869a4229776e1e56b0239881a2` 的產品 tree 皆為 `0ff18fa2b669efebbb9a474991d90abed16ed100`。[基線 PR #283](https://github.com/KYStr/glossquote-labs-home/pull/283) · [固定任務](https://github.com/KYStr/glossquote-labs-home/blob/6c8413f577bcc5bc26471c5c9fff6cc09ed88014/docs/reviews/five-hour-2026-11-11/dispatch/product-cooking-copy/TASK.md)
- 核對候選 36 個公開檔與 PR 範圍，逐檔從固定 commit 取 bytes、以 Git tree 中的 blob SHA 校驗並重算 SHA-256。實際修正 delta 包含 10 個產品檔及 5 份作者證據。PR #304 與 PR #285 的四個規格檔逐檔相同，規格與產品的 fixtures 亦同 bytes。[固定 SPEC](https://github.com/KYStr/glossquote-labs-home/blob/4bc6d4e300d315597a4b1ea5feb86f6f2d6fc1c0/docs/specs/cooking-measurement-converter/SPEC.md) · [逐檔清單](file-manifest.json)
- 用基線清單把允許的文字、靜態檢查與生成檔限制到已宣告路徑。先驗雙語來源及 FAQ，再用獨立有理數驗原 fixtures、報告及 Worker 回覆。最後用隔離副本測靜態引用例外及重建。九個產品面向依固定 SPEC 記分，實際需要瀏覽器的檢查保留未驗狀態。[中央審查規則](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/docs/REVIEW-AND-RELEASE.md)

## 來源與兩語文案

| 主張 | 原始資料與獨立核對 |
| --- | --- |
| 奶油 | King Arthur Baking 教材第 1 頁的無鹽奶油為每杯 227 g。重量表半杯 113 g 已取整，乘二會是 226 g。工具模型的半杯結果為 113.5 g。兩語候選直接指教材的一杯值。[Easy As Pie，第 1 頁](https://shop.kingarthurbaking.com/content/class-pdfs/EasyAsPie_February2025.pdf#page=1) |
| 蜂蜜 | 重量表為每湯匙 21 g。模型以 240 ÷ 15 = 16 湯匙／杯推得 336 g／杯。兩語均說明推導。[Ingredient Weight Chart](https://www.kingarthurbaking.com/learn/ingredient-weight-chart) |
| 燕麥片 | 重量表的一般或快熟列為 89 g／杯，另有 King Arthur 品牌燕麥 113 g／杯。兩語候選把 89 配到一般或快熟品項。[Ingredient Weight Chart](https://www.kingarthurbaking.com/learn/ingredient-weight-chart) |
| 水與鮮奶 | 重量表列各 227 g／杯。兩語水 FAQ 將該食材估值與純體積 1 杯 = 240 mL 分開說明。[Ingredient Weight Chart](https://www.kingarthurbaking.com/learn/ingredient-weight-chart) |
| 杯量模型 | FDA 營養標示規則為 240／15／5 mL，NIST 美國習慣杯約 236.5882 mL，兩種杯量相差約 1.4%。候選說明把食材每杯估值套用到工具的 240 mL 杯。[21 CFR 101.9(b)(5)(viii)](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9#p-101.9(b)(5)(viii)) · [NIST SP 811 B.8](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8) |

在公開候選兩頁的來源中確認實際錨點只有兩個新外部目標，分別為重量表與教材固定第一頁。兩語 FAQ、來源段落與核心來源註解的數值及語義相符，生成頁亦通過公開 bytes 比對。[繁中來源](https://github.com/KYStr/glossquote-labs-home/blob/3fd8379427b1318ba65c1169f0256befc47ca93a/tools/cooking-measurement-converter/public/index.html#L97-L134) · [英文來源](https://github.com/KYStr/glossquote-labs-home/blob/3fd8379427b1318ba65c1169f0256befc47ca93a/tools/cooking-measurement-converter/public/en/index.html#L97-L134)

## 必須保留的位元組

下列 21 檔已逐位元組比對。每檔 SHA-256 與 Git blob 見 [逐檔清單](file-manifest.json)。

```text
HANDOFF.md
REPAIR-VERIFICATION.md
VERIFICATION.md
dist-preview/js/app.js
dist-preview/js/controller.mjs
dist-preview/js/worker-handler.mjs
dist-preview/robots.txt
dist-preview/styles/app.css
package.json
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/styles/app.css
scripts/build.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/build.test.mjs
test/controller.test.mjs
test/core.test.mjs
test/fixtures.json
test/report.test.mjs
```

`public/js/core/convert.mjs` 的實際 diff 只有兩組完整註解。剔除這些註解後，可執行段含常數、公式與序列化邏輯均逐 byte 相同。兩版生成 Worker 解開 JSON 字串後均等於該版核心加固定 handler，可執行段 SHA-256 一致。已用兩個本地 Node Worker 各收發 33 組 fixture／補充輸入核對 generation 與實際輸出。[獨立驗算程式](verify-parity.mjs) · [算式與位元組證據](parity-evidence.json)

## 離線執行

| 命令 | 實際結果 |
| --- | --- |
| `node --test test/*.test.mjs` | exit 0，60 passed、0 failed、0 skipped，含三個 controller fixtures 與 loopback HTTP。 |
| `node scripts/check.mjs` | 固定候選 exit 0。另執行下方六個審查探針。 |
| `node scripts/build.mjs --mode preview` | 兩次 exit 0，9 個生成檔與 manifest 逐檔相同，且符合公開候選。 |
| `node scripts/check-generated.mjs --mode preview` | 提交的產物及獨立重建後各 exit 0。 |
| `node ./verify-parity.mjs fixed-sources/baseline fixed-sources/candidate` | exit 0，20 個字面核心、13 個額外案例、14 份字面成功報告的完整 UTF-8 bytes、LF、SHA-256 均相符。 |

Node v24.14.0。工具及子行程在審查用副本執行，Windows PATH 與完整 Environment key 指紋在測試前後一致。作者的測試與 5 份提供檔保留為 provided。上表是本次獨立執行。[命令、exit 與重建證據](commands.json)

## CMC-CHECK-01　註解中的引用被認成有效連結

在審查副本的繁中頁，把既有重量表的完整 `a` 元素包在 HTML 註解內。此時重量表沒有可操作的來源連結。預期靜態檢查與 HTML 引用測試都應失敗。實際 `node scripts/check.mjs` 及 `node --test test/html.test.mjs` 皆 exit 0。checker 用 `text.split(link)` 計數再 `replace`，測試也掃描原始文字，兩者把註解內的字串當成有效引用。[checker](https://github.com/KYStr/glossquote-labs-home/blob/3fd8379427b1318ba65c1169f0256befc47ca93a/tools/cooking-measurement-converter/scripts/check.mjs#L219-L237) · [HTML 測試](https://github.com/KYStr/glossquote-labs-home/blob/3fd8379427b1318ba65c1169f0256befc47ca93a/tools/cooking-measurement-converter/test/html.test.mjs#L103-L115)

其餘五個探針均得到預期的 exit 1。它們涵蓋帶額外查詢的 URL、頁面文字中另出現固定 URL、其他檔案中的固定錨點字面、原有禁止能力 token 及重複引用。退修時維持既有 URL 和檔案範圍，將放行及正向測試綁定實際導航錨點，並要求註解案例失敗。測試副本已還原並逐檔核對。[checker 探針證據](checker-evidence.json)

## 九個產品面向

| 面向 | 分數 | 狀態 | 觀察與缺口 |
| --- | ---: | --- | --- |
| `functionality` | null | `NOT_RUN_USER_FOCUS_INCIDENT` | 20 核心、13 補充、14 字面成功報告與兩個 Node Worker 各 33 回覆相符。 待驗 兩語實際表單、結果畫面與 Blob 下載。 |
| `boundaries` | null | `NOT_RUN_USER_FOCUS_INCIDENT` | 數量上限、精度、單位長度、列舉、首錯、Unicode、三個既有狀態 fixture 與輸出上限均經離線檢查。 待驗 實際瀏覽器的首錯移焦與重設／取消呈現。 |
| `privacy` | null | `NOT_RUN_USER_FOCUS_INCIDENT` | 候選產品執行碼與網路／儲存規則未變，兩個新外部 URL 均為明示引用連結。loopback CSP 有 connect-src 'none'。 待驗 實際 Network、Storage、URL 與 console 觀察。 |
| `security` | 80 | `FAIL` | CSP、固定報告、Worker 行為及五項負向探針都有離線證據。CMC-CHECK-01 的註解引用被當作導航，兩種檢查皆誤通過。 待驗 同候選瀏覽器安全與資源生命週期。 |
| `usability` | null | `NOT_RUN_USER_FOCUS_INCIDENT` | 兩語實際來源文字及 FAQ 語義相符，原控制器及操作入口 bytes 保留。 待驗 桌面與行動的各狀態操作及實際下載。 |
| `accessibility` | null | `NOT_RUN_USER_FOCUS_INCIDENT` | 兩語頁原有 id parity、標籤、錯誤關聯與導航結構通過離線測試。兩個新增連結有可見名稱。 待驗 鍵盤與實際焦點、320 CSS px、200% zoom、對比、觸控、減少動態及輔具。 |
| `localization-seo` | 100 | `PASS_PREVIEW` | 兩頁 lang、title、H1、description、同語首頁回鏈、FAQ 對譯、preview noindex 及無正式 canonical/hreflang 已核。 待驗 正式 HTTPS／SEO 另驗。 |
| `toolchain-provenance` | 100 | `PASS` | 公開固定 36 檔及 Git blob 相符。Node v24.14.0 指定命令 exit 0，兩次重建 9 檔與 manifest 都符合公開候選。 |
| `compatibility` | null | `NOT_RUN_USER_FOCUS_INCIDENT` | Node Worker 橋接驗兩版所有 33 筆資料、世代與錯誤。loopback HTTP 測試雙語資產。 待驗 真實隔離 Chrome／Edge、reflow、Blob 與原生下載。 |

`rubricComplete=true`，`requiredChecksComplete=false`。候選仍有 CMC-CHECK-01，且真瀏覽器、真機、Network/Storage 與原生下載缺證據。正式 HTTPS、合併、部署與 registry 操作均為 `NOT_RUN`。[結構化審查](review.json)
