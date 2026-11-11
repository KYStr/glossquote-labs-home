# 匯率換算獨立文件審查

- 文件結果 **FAIL**。建議退修，待主統籌安排串行登記。 產品九面向皆 **NOT_RUN**。
- Task `labs-currency-converter-spec-20261109`。Spec `spec-currency-converter-20261109`。[PR #258](https://github.com/KYStr/glossquote-labs-home/pull/258) 為 open draft。
- 固定候選 `dcb21d0903006a708584edba8713e6117f8138a6`。Reviewer `local-codex:01a1c87c-fc33-75e3-9aee-09999e6d38b1`，未參與本候選的製作。
- 登記冊 r1530，blob `e01da965f28e5248ca13158094ca356254a25c2b`。原承接者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，claim `muse-r4-currency-converter-claim-20261109T155013Z-e6a82`。
- 核對範圍為 BRIEF、SPEC、fixtures、AUTHOR-CHECK。四檔本地 Git blob 均與 PR diff 及固定 GitHub 檔案相同。[來源與讀回紀錄](../intake.json)

## 八節逐項查核

| 面向 | 分數 | 達標 | 實際證據 |
| --- | ---: | --- | --- |
| `goal` | 96 | 是 | §goal 說明手機比較外幣價格及桌面以服務商報價估算匯款。驗算 USD/TWD 範例 100 × 31.5 = 3150.00。 |
| `scope` | 96 | 是 | §scope 界定一組代碼與單一輸入率，排除即時報價、費用、歷史及多幣別。比對 source-index、catalog、r1530 與本輪 open PR，物理單位換算和同批稅率、毛利工具職責不同，未見同 slug 製作。 |
| `userFlow` | 80 | 否 | §userFlow 有空白、dirty、busy、success、error、cancelled。Reset 恢復 31.5，但僅 Load example 規定範例標記，與免責及作者的不預填承諾衝突。CUR-01。 |
| `inputsOutputs` | 96 | 是 | §inputsOutputs 的 ASCII、UTF-16 容量與錯誤優先序可獨立推導。精確結果最大 999999999000000 分，正反向都低於 2^53，捨入進位可用 rate=10.000001 觸發。 |
| `implementation` | 95 | 是 | 原生雙語 HTML、純核心／controller／DOM、固定 Worker 程式與工作世代。規定 CSP、零工作網路、儲存禁用與 Blob 釋放，Node 24 零依賴可行。 |
| `acceptance` | 94 | 是 | §acceptance 的九面向有可判定證據及逐項 90 門檻。§tests 明列隔離實測、預覽 noindex、正式雙語 SEO 與工作期 Network/Storage，實作前全部 NOT_RUN。 |
| `tests` | 84 | 否 | 21 個核心、3 個狀態 fixture 逐筆一致。現有兩個反向案例均無法抓到把六位顯示值回乘的錯誤。CUR-02。 |
| `handoff` | 96 | 是 | §handoff 固定四檔、開啟 PR、中央目標路徑、另行 claim、受影響檢查與分階段發布責任。 |

## 離線驗算

離線驗算使用 Python 3.12.5，exit `0`。核心 21/21、controller 3/3。完整的字面輸入、獨立推導、候選預期與補充案例見 [驗算輸出](verification.json)。重現用 [驗算腳本](verify.py)。[重現步驟與固定來源](../REPRODUCE.md)

- 精確分數算金額與每列對照表，取 `floor(x + 1/2)`。反向顯示用 60 位 Decimal 及六位有效數字的 half-up，先推導後深比對 fixture。
- `half-up-tie` 是 2.5 分 → 3 分。匯率 0.0066 的前兩階分別是 0.66 → 1 分與 6.6 → 7 分，能區分逐列捨入與倍增。
- `state-dirty-error`、`state-cancel-late`、`state-replace-late` 以審查用世代模型逐個 checkpoint 推導，另外重算 late payload 對應舊草稿。
- 首例的預期 compact JSON 由獨立結果遞迴排序、加單一 LF，byte 數與 SHA-256 保存於 `documentReport`。

## 阻止開工的問題

### CUR-01 重設會帶入未要求的範例匯率

- 重現 依 `state-cancel-late` 重設，或將匯率改成 `32.1` 後按 Reset，再直接按 Convert。 [SPEC 的重設](https://github.com/KYStr/glossquote-labs-home/blob/dcb21d0903006a708584edba8713e6117f8138a6/docs/specs/currency-converter/SPEC.md#L52)
- 觀察 Reset 帶入 USD/TWD、31.5 與 100，`Convert` 可得 3150.00。只有 Load example 被要求顯示範例身分。常駐聲明稱計算只使用使用者輸入的匯率，作者查核亦稱不預填。 [作者查核](https://github.com/KYStr/glossquote-labs-home/blob/dcb21d0903006a708584edba8713e6117f8138a6/docs/specs/currency-converter/AUTHOR-CHECK.md#L9)
- 預期 讓初載和重設一致遵守使用者輸入匯率的承諾。可清空匯率並只在 Load example 帶入合成值，或明訂並持續標示範例模式，涵蓋表單、結果與報告的來源，並讓說明及 fixtures 一致。
- 影響 輸入頁與報告可能把合成報價呈現成真實報價，影響預算及匯款判讀。
- 重審 更新 `BRIEF.md`、`SPEC.md`、`fixtures.json`、`AUTHOR-CHECK.md` 涉及此狀態的規則，再驗初載、重設、顯式範例與自行輸入。

### CUR-02 既有反向 fixture 無法辨認反向顯示值被拿來回算

- 重現 比較 `reverse-repeating` 的 `100 / 31.5` 與 `100 × 0.031746`，以及 `reverse-exact` 的 `3150 / 31.5` 與 `3150 × 0.031746`。 [反向算法](https://github.com/KYStr/glossquote-labs-home/blob/dcb21d0903006a708584edba8713e6117f8138a6/docs/specs/currency-converter/SPEC.md#L70)
- 觀察 兩組經半分進位分別都得到 317、10000 分。規格把 `reverse-repeating` 當作可辨認兩種算法的例子。
- 預期 增加能觀察差異的案例。`{fromCode:"USD",toCode:"TWD",rate:"3",amount:"30000",direction:"b-to-a"}` 應回 `convertedCents=1000000`、`inverseRate="0.333333"`。錯誤回乘只會得 999999 分。
- 影響 核心反向語義可能在現有 fixtures 全綠時仍出錯，合法大額出現可見差額。
- 重審 保留原循環小數案例或修正其用途說明。新增可區分的字面 input/expected 並重跑反向路徑。


## 非阻擋改善

- 刪去與純文字表單無關的 File.arrayBuffer 和合成檔樣板措辭，讓零檔案輸入範圍更易讀。

## 登記冊繼承契約 REG-01

登記冊 r1530 的 `spec.acceptanceCriteria` 使用 `goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff`。這八項適用於原 `workType=spec` 任務。SPEC §acceptance 的九個產品面向須成為 production 可繼承的 rubric。現有核心會要求 production 的驗收陣列與 spec 完全一致，因此 REG-01 阻止標為可開工 ready。需由主統籌依授權的修訂流程修正後重新讀回。[逐筆比較](../production-rubric-check.json)

## 預先約定的九項產品證據

| 面向 | 狀態 | SPEC 要求的證據 |
| --- | --- | --- |
| `functionality` | NOT_RUN | 正反換算、方向、對照與 JSON 報告 |
| `boundaries` | NOT_RUN | 端點、首錯與三個 controller 狀態 |
| `privacy` | NOT_RUN | 靜態載入後工作零請求與 URL／storage／log |
| `security` | NOT_RUN | CSP、敵意輸入 inert、固定報告、Worker/Blob 釋放 |
| `usability` | NOT_RUN | 兩語桌面手機主流程、取消與下載 |
| `accessibility` | NOT_RUN | 鍵盤焦點、狀態錯誤、320px、200% zoom、觸控與 reduced motion |
| `localization-seo` | NOT_RUN | 同語首頁回鏈、雙語訊息與 noindex，正式另查互惠 hreflang/canonical |
| `toolchain-provenance` | NOT_RUN | Node 24、離線命令、重建 hash 與同 PR head |
| `compatibility` | NOT_RUN | 隔離 Chrome 與 Edge 兩語狀態、Worker、Blob 與 reflow |

## 核對來源

- 核實匯款商報價可有匯差、費用與稅款，單一費率的乘除可用於估算。 [CFPB Circular 2024-02](https://www.consumerfinance.gov/compliance/circulars/consumer-financial-protection-circular-2024-02/)
- 核實央行參考匯率供資訊使用，實際交易應用交易服務商報價。 [ECB 外匯參考匯率框架](https://www.ecb.europa.eu/stats/pdf/exchange/Frameworkfortheeuroforeignexchangereferencerates.en.pdf)
- ISO 4217 的維護資料有現行、歷史及修正版本。本規格只用代碼做顯示標籤。 [SIX 資料標準](https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html)
- 逐節讀取的固定候選。 [PR #258 固定 SPEC](https://github.com/KYStr/glossquote-labs-home/blob/dcb21d0903006a708584edba8713e6117f8138a6/docs/specs/currency-converter/SPEC.md)

保留原 owner 與 claim。修正候選另核新 head、重算受影響 fixtures。正式 ACK／review／ready 仍待主統籌安排串行 slot。
