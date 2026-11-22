> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：1269b64cfe7371e78c3a693b7fb7095b4f1520098cb6d4787b8143e8e11987a0。

# 烤盤尺寸換算規格獨立審查

**文件審查 FAIL，建議退修。** 固定 [PR #264](https://github.com/KYStr/glossquote-labs-home/pull/264) 的 `88a5d223d06de8e6a732327a92fed78f94296e74`。11 列容量、15 個核心案例、3 個狀態案例都與獨立推導一致。兩個額外的合法輸入重現深度提醒與小倍率顯示缺陷。遠端預案的製作繼承條件也須修正後才可 ready。產品九面向均為 NOT_RUN。

## 候選與獨立性

- 任務 `labs-baking-pan-converter-spec-20261109`，預案 `spec-baking-pan-converter-20261109`。PR 開啟中且為 draft，四個變更檔案都在 `docs/specs/baking-pan-converter/`。完整讀取四檔並將本地固定副本逐檔核對遠端 Git blob，SPEC 與作者檢查的 SHA-256 亦符合原交驗登記。固定簡報與來源清單的本地 Git blob 同樣符合 PR #284 的 `83d5b24a00eb80d07ffcdd8aa2886006bc8a61ed`。[固定候選四檔](https://github.com/KYStr/glossquote-labs-home/tree/88a5d223d06de8e6a732327a92fed78f94296e74/docs/specs/baking-pan-converter) · [固定派工簡報](https://github.com/KYStr/glossquote-labs-home/blob/83d5b24a00eb80d07ffcdd8aa2886006bc8a61ed/docs/reviews/five-hour-2026-11-11/dispatch/spec-review-07/TASK.md)
- 初讀遠端登記冊 r1530、blob `e01da965f28e5248ca13158094ca356254a25c2b`，另對固定 branch commit 的原始 bytes 重算 Git blob。2026-11-11 10:53:09（台北）讀 r1537，10:59:53 交接前讀 r1541、blob `1bc61dc8e2a1a746c9648e016e5d730b2e9b2084`。兩次讀回的目標任務、預案及 PR head 均與初讀一致。任務為 `reviewing`，預案為 `draft`，無關聯 production task。已讀遠端 AGENTS、START-HERE、AGENT-HANDBOOK、兩份協作文件、預案庫存與審查規則，以及登記冊指定的首頁基線 `26525d5f6380915ea95dde879dec769442db0d95`。[共用登記冊](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/coordination/work-registry.json) · [固定首頁基線](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)
- 原 owner、提交者和唯一 contributor 為 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，原 claim `muse-r4-baking-pan-convert-claim-20261109T155858Z-279cc`。本 reviewer `local-codex:01a1c87c-ffde-7e81-b968-9bb9eb2492cd` 由 Codex chat 清單核實，未參與候選製作。
- 查重範圍包括遠端登記冊、source index、預設分支工具目錄與 PR 標題。相近工具各有獨立輸入與輸出。食譜份量換算用原／目標份數縮放食材清單，烘焙百分比用麵粉基準轉換配比與重量，料理單位換算用食材密度轉換單位。這份規格以兩個容器尺寸或表格容量計算單一麵糊總量。查得同名 PR 僅 #264，預設分支的 `tools/baking-pan-converter` 查無此目錄。[食譜份量換算](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/sources/legacy/recipe-scaler/README.md) · [烘焙百分比](https://github.com/KYStr/glossquote-labs-home/blob/c51b64e37c9524ca44fd776b0d55954cb1cf8707/docs/specs/bakers-percentage-calculator/SPEC.md) · [料理單位換算](https://github.com/KYStr/glossquote-labs-home/blob/213af9991a1a2d0a07f9acfe3e173d57184d9dec/docs/specs/cooking-measurement-converter/SPEC.md)

## 阻止 ready 的缺陷

### BPC-01　較淺的盤可能讓同量麵糊更厚

- **最小重現。** 兩側皆選自訂長方形。來源 `20 × 20 × 8 cm`，目標 `10 × 10 × 4 cm`，份量 `300 ml`。容量 `3200 → 400 ml`，規格結果為 `0.13`、`12.5%`、`37.5 ml`、`shallower`。
- **實際與預期。** SPEC 釘版雙語提醒稱同量麵糊在較淺盤會較薄並通常熟得較快。兩盤均裝得下 300 ml。按直壁模型，原盤麵糊厚度為 `300 ÷ 400 = 0.75 cm`，目標盤為 `300 ÷ 100 = 3.00 cm`。依倍率改用 37.5 ml 後，目標盤厚度才是 `0.375 cm`。盤壁高度可比較。容量比例近似維持填充比例，兩盤同量的麵糊厚度則由底面積決定。雙語提示和 BRIEF 應描述正確的比較對象，並把熟度提示依據寫成實際麵糊厚度及食譜條件。[候選目標](https://github.com/KYStr/glossquote-labs-home/blob/88a5d223d06de8e6a732327a92fed78f94296e74/docs/specs/baking-pan-converter/SPEC.md#L7) · [候選提示](https://github.com/KYStr/glossquote-labs-home/blob/88a5d223d06de8e6a732327a92fed78f94296e74/docs/specs/baking-pan-converter/SPEC.md#L171) · [King Arthur Baking 的換盤說明](https://www.kingarthurbaking.com/blog/2025/08/18/baking-pan-size)
- **修正驗收。** 在 BRIEF、SPEC 與 fixtures 加入上述反例。雙語結果仍可顯示目標盤「較淺」，提示須通過 `0.75 → 3.00 cm` 的同量反例。另核對反向較深及 nominal 未知狀態。保留估算限制與預留膨脹空間的說明。

### BPC-02　合法的正倍率與份量可能顯示為零

- **最小重現。** 來源自訂長方 `60 × 60 × 15 cm`，目標自訂長方 `5 × 5 × 1 cm`，`1000 ml`。精確容量比為 `25 ÷ 54000 = 1/2160`，即約 `0.000462963` 或 `0.0462963%`。依 SPEC 固定小數位，畫面與 JSON 報告會同時給 `factor: "0.00"`、`percent: "0.0"`、`scaledQuantity.value: "0.5"`。省略份量時可見倍率和百分比仍都是零。同盤 `round-8 → round-8`、`0.01 g` 也會輸出 `1.00` 倍與 `0.0 g`。[候選範圍與格式](https://github.com/KYStr/glossquote-labs-home/blob/88a5d223d06de8e6a732327a92fed78f94296e74/docs/specs/baking-pan-converter/SPEC.md#L94)
- **預期。** 有效正值在兩語摘要與可攜報告都應可辨識為正的近似值或正值範圍。可固定小量時的額外精度，例如第一例顯示約 `0.000463` 倍、`0.0463%`、`0.5 ml`，同盤例保留 `0.01 g`。請定義所有可達正值的顯示及 JSON 約定。現有食譜份量換算已對捨入為零的正值顯示小於指定精度的提示。[既有工具的低量表示](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/sources/legacy/recipe-scaler/README.md#input-and-precision)
- **修正驗收。** 在 SPEC 與 fixtures 增列兩端尺寸及深度、可省略份量、極小正量與相同烤盤案例。逐一核對兩語可見輸出及 canonical JSON bytes，原 18 例依新契約複驗。

## 依原任務的八個文件面向

每節布林值代表該節目前是否足以放行文件。100 為證據完整，95 為主契約可判定且有小處需釐清，80 為需修正的文件缺陷。評分依 [r1530 原任務條件](https://github.com/KYStr/glossquote-labs-home/blob/e0ef81a2b5489489f13b2bc088f8906978700cb5/coordination/work-registry.json) 與固定 SPEC。

| 面向 | 可放行 | 分數 | 證據 |
| --- | --- | ---: | --- |
| goal | false | 80 | 桌面可保存計算、手機可在廚房或賣場比對。目標對厚度的敘述與固定提醒涵義仍有 BPC-01。 |
| scope | true | 95 | 11 列／兩種自訂幾何、g 或 ml、單總量及匯出，與三個相近工具的用途及資料介面有明確差異。BRIEF 單位措辭有小處可釐清。 |
| userFlow | false | 80 | 空白、範例、dirty、執行中、取消、錯誤、成功、重設、離頁草稿與焦點都可實作。結果必顯示的提醒有 BPC-01。 |
| inputsOutputs | false | 80 | 14 個字串欄位、逐欄首錯、單位／範圍、確切輸出與 UTF-8 匯出已定。BPC-02 的有效值會失去正值語意。 |
| implementation | true | 95 | Node 24、原生 HTML/CSS/ESM、純核心／controller／DOM、固定 Worker、終止與 URL 清理及無持久資料均有明確方案。移除不適用的檔案讀取文字可使邊界更清楚。 |
| acceptance | false | 80 | 九面向均已列方法。功能、邊界、可用性與雙語證據須能對 BPC-01、BPC-02 提出明確反證。 |
| tests | false | 80 | 18/18 現有案例相符，含 π、首錯、世代失效與獨立序列化。兩個新反例必須入規格與案例，以便產品測試攔下。 |
| handoff | true | 100 | 固定文檔、原任務及開啟 draft PR 可追溯。製作路徑、里程碑、候選命令、交驗與發布證據責任皆有定義。 |

## BPC-03　預案登記錯用文件審查條件

- r1530 和 r1537 的原 `workType: spec` 任務均以 `goal`、`scope`、`userFlow`、`inputsOutputs`、`implementation`、`acceptance`、`tests`、`handoff` 為條件。這八項用於原規格製作的文件審查，上表依原條件評分。[原任務與預案登記快照](https://github.com/KYStr/glossquote-labs-home/blob/e0ef81a2b5489489f13b2bc088f8906978700cb5/coordination/work-registry.json)
- 同一預案的 `spec.acceptanceCriteria` 卻逐項複製這八個 ID 與標籤。固定 SPEC 的製作條件有九項，依序為 `functionality`、`boundaries`、`privacy`、`security`、`usability`、`accessibility`、`localization-seo`、`toolchain-provenance`、`compatibility`。協作核心要求每個 production task 的條件與其 `spec.acceptanceCriteria` 完全相同。照 SPEC 填九項會與目前登記不符，照登記填八項會繼承錯誤的產品交驗要求。[固定 SPEC 九面向](https://github.com/KYStr/glossquote-labs-home/blob/88a5d223d06de8e6a732327a92fed78f94296e74/docs/specs/baking-pan-converter/SPEC.md#L119-L129) · [production 繼承檢查](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/scripts/coordination-core.mjs#L100-L104)
- 預期由主統籌依授權修訂流程保留原文件 task 的八項，把同一 spec ID 的登記條件修為固定 SPEC 九項及其證據要求。修正後核對兩組 ID／標籤，再決定 ready。此項與 18 個既有字面案例的 PASS 分開記錄。

## 獨立推導與執行紀錄

- 以標稱英吋尺寸乘精確 2.54，再以有理數和 π 的 50 位小數近似重算九個幾何列。兩個 nominal 列從原表杯數乘 237，得到 2844／3792 ml。查到另一張表同列 12／16 杯，該頁表頭卻統稱 2 吋深。尺寸、杯數與換算慣例以原採用的 Brown Eyed Baker 表為準。幾何列屬假設直壁、標稱尺寸的估算。原表的同名常見烤盤容量可不同。[NIST 英吋定義](https://www.nist.gov/pml/owm/si-units-length) · [NIST 毫升](https://www.nist.gov/pml/owm/si-units-volume) · [Brown Eyed Baker 容量表](https://www.browneyedbaker.com/how-to-convert-pan-sizes/#pan-size-conversions) · [Softonic 對照表](https://tools.en.softonic.com/pan-size-converter)
- 背景 Node v24.14.0，執行 `node .runs/five-hour-2026-11-11/dispatch/spec-review-07/review/baking-pan-converter/verify-fixtures.mjs`，exit 0。以有理數分別推導每個顯示值，與規格指定的 binary64 路徑交叉核對。用文件事件模型推導 dirty、cancel/late 與 replace/late，驗證目前世代和下載狀態。10 個成功核心例各存獨立 canonical JSON 的 UTF-8 內容、長度及 SHA-256。首例 `1647 → 2085 ml`、`1.27` 倍、`126.6%`、`633.0 g`，報告 321 bytes。完整 18 份字面輸入與獨立預期、11 列、額外界線與兩個缺陷重現見 fixture-evidence.json（本地證據：fixture-evidence.json），執行檔見 verify-fixtures.mjs（本地證據：verify-fixtures.mjs）。
- 前後執行 Windows 環境 guard 均 exit 0。HKCU/HKLM PATH 類型、長度、臨時項數、PATH SHA-256 及完整 Environment key 指紋相同，兩端臨時項數均為 0。 機器可讀紀錄（本地證據：review.json）

## 九個未來產品面向

以下是文件可對應的測試證據。PR #264 僅含文件，所有產品分數皆為 null。

| 面向 | 產品狀態 | 實作候選應提供的證據 |
| --- | --- | --- |
| functionality | NOT_RUN | 兩語表單送出後的畫面及完整報告對字面案例，包含更正後的深度說明。 |
| boundaries | NOT_RUN | 5／60 cm、1／15 cm、100,000 g 或 ml 與越界，首錯、未啟用欄位、晚到回覆及捨入到零的正值。 |
| privacy | NOT_RUN | 初始靜態資產請求，載入後離線計算、使用及重設期間零工作請求，並查 storage、URL、console。 |
| security | NOT_RUN | 惡意輸入保持惰性，CSP、固定報告名稱、輸出限制、Worker 及 Blob URL 回收。靜態方案的 `worker-src` 與 `connect-src` 可分別限制 Worker 來源與連線。[W3C CSP3](https://www.w3.org/TR/CSP3/#directive-worker-src) |
| usability | NOT_RUN | 兩語桌面及手機的空、範例、換算、錯誤、dirty、取消、重設與下載流程。 |
| accessibility | NOT_RUN | 320 CSS px、實際 200% zoom、Tab／Shift+Tab、Enter／Space、可見焦點、標籤／錯誤／狀態、對比、觸控與減少動態。 |
| localization-seo | NOT_RUN | 兩語 HTML、訊息同義、同語首頁回鏈、候選 noindex。正式候選另核 canonical、互惠 hreflang、x-default、sitemap 與標頭。 |
| toolchain-provenance | NOT_RUN | Node 版本、離線測試／檢查／預覽建置的 exit、兩次重建的資產 SHA-256 及相同 PR head。 |
| compatibility | NOT_RUN | 真實隔離 Chrome、Edge 的兩語 Worker、取消、重設、reflow、Blob 報告 bytes。原生對話保留人工檢查。 |

## 非阻塞釐清與交接

- BRIEF 的容量單位一句可讀成允許杯與公升。依 SPEC，數量單位為 g 或 ml，盤容量為 ml。建議兩處用同一組單位。把「可省略」寫明為 UI 可留白，核心仍要求 `quantity: ""` 的鍵。自訂盤欄位可標示量測內尺寸。移除泛用的 textarea、File.arrayBuffer 與合成檔測試用語。
- AUTHOR-CHECK 記載作者沒有直接執行登記命令，登記冊 r1495–1499 保存的 actor ID 則都是同一位原 owner。這份審查只依遠端欄位讀回責任歸屬，實際發送歷史命令的人仍未核實。必要時由主統籌對照雲端原始證據。
- BPC-01／02 的修正範圍是原預案的四份文件，以同一 task/spec 與新 PR head 再審。BPC-03 的登記修訂由主統籌依合法流程安排。第一階段本地退修證據已保存，GitHub ACK、正式 review、mark-spec-ready 均 NOT_RUN。
