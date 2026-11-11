# 匯率換算維護候選獨立複審

## 結果

**建議維護審查 PASS**。CUR-01、CUR-02 在固定候選 `b88f00cfc3379a22d11b5736d048f4e54bdc4641` 已修正。三項維護面向均達 90 分。r1621 的維護任務為 `working`，submission 為 `null`，正式登記審查待串行時段。 [候選 PR #319](https://github.com/KYStr/glossquote-labs-home/pull/319) · [固定派工簡報](https://github.com/KYStr/glossquote-labs-home/blob/418aee70f60a04cbe19e339597c91a056bcad0c4/docs/reviews/five-hour-2026-11-11/dispatch/repair-currency/TASK.md)

| 維護面向 | 分數 | 依據 |
| --- | ---: | --- |
| `spec-corrections` | 100 | 四檔一致釘版空匯率、顯式合成範例、依操作判定來源、雙語標籤、成功報告及反向鑑別。 |
| `exact-fixtures` | 100 | 22/22 核心、4/4 控制器、29/29 checkpoint 與 17/17 補充檢查通過。兩種報告完整 bytes 與預期 SHA-256 均吻合。 |
| `provenance-and-scope` | 100 | 按固定 HTTPS 原始 bytes 核對 12 個規格檔副本的 Git blob，四檔保存副本與 #258 位元組完全相等。GitHub 比對只改派工允許的四檔，原 owner、claim、PR 均讀回一致。 |

## CUR-01 匯率來源

初載及 Reset 均為 `rate:""`、來源 `null`、無結果、無報告。直接換算得到 `EMPTY/rate`。規格對 bfcache 恢復定義相同草稿。顯式 Load example 才把合成 `31.5` 帶入，並等待 Convert。 [SPEC §userFlow](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/SPEC.md#L39-L53)

| 動作及狀態 | 表單與成功結果的雙語來源 | 下載 `rateSource` |
| --- | --- | --- |
| 初載、重設或清空匯率 | 表單顯示「請輸入匯率 / Enter an exchange rate」 | 無下載 |
| 載入範例再成功換算 | 兩處均為「合成範例匯率 / Synthetic example rate」 | `example` |
| 手填匯率再成功換算，含手填同值 `31.5` | 兩處均為「手填匯率 / Manually entered rate」 | `manual` |

編輯金額保留目前來源並撤銷舊下載。編輯匯率會撤銷舊產物，同值編輯仍切換為手填。控制器以成功工作的快照標記結果與報告，核心仍只接收原五欄。驗算依序重播來源案例的 20 步，舊範例回覆在手填成功及重設後均被丟棄。另以舊回覆抵達新手填工作進行中的情形驗證世代隔離。 [SPEC §inputsOutputs](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/SPEC.md#L57-L78) · [工作快照契約](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/SPEC.md#L84-L89) · [來源案例](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/fixtures.json#L1104-L1208) · [逐步驗算](verification.json)

兩份完整的報告樣本依相同核心結果重建，遞迴排序鍵、保留陣列順序、UTF-8 無 BOM、末尾一個 LF。八個核心結果欄位逐值相同，唯一差異為來源值。以下為離線重建的實際檔案。 [SPEC 報告契約](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/SPEC.md#L78)

| 來源 | bytes | SHA-256 | 完整 bytes |
| --- | ---: | --- | --- |
| `manual` | 362 | `68b59c99e99674e21404d391193eb8a28e29ebadd7fe53bbba4bb8c7e881e9e9` | [report-manual.json](report-manual.json) |
| `example` | 363 | `6f20c87037f7321021a981ad1130ae348beb46c9fb49cb0ef910c4a87cea1b51` | [report-example.json](report-example.json) |

## CUR-02 反向精度

反向輸入 `amount:"30000"`、`rate:"3"`。用精確分數除以 3 得 `1000000` 分，顯示逆率為 `0.333333`。以該顯示值回乘得到 `999999` 分。快速對照表仍依正向計算為 `300 / 3000 / 30000 / 300000` 分。原循環小數案例用兩種算法皆得到 317 分，候選已改正該案例的說明。 [計算契約](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/SPEC.md#L70-L75) · [反向字面案例](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/fixtures.json#L132-L170) · [獨立推導](verification.json)

## 八節文件內容可用性

| 節 | 分數 | 觀察 |
| --- | ---: | --- |
| `goal` | 96 | §goal 說明旅遊、購物與匯款的核對情境，分清實際報價與供練習的合成數值。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/SPEC.md#L7-L14) |
| `scope` | 96 | §scope 限定單一匯率、兩枚代碼與單筆金額，界定即時報價及費用的範圍，對照既有工具。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/SPEC.md#L16-L29) |
| `userFlow` | 98 | §userFlow 定義初載、重設、錯誤回復、範例、取消及來源標籤。20 步來源案例完整覆蓋本次問題。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/SPEC.md#L31-L53) |
| `inputsOutputs` | 98 | 五欄核心輸入、八欄成功結果、欄位首錯次序與九欄成功報告明確。兩份報告可依契約重建。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/SPEC.md#L55-L80) |
| `implementation` | 96 | 純核心、controller 與 DOM 分工明確，工作快照綁定來源，說明 Worker、Blob 生命週期和零工作網路。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/SPEC.md#L82-L89) |
| `acceptance` | 96 | 九項未來產品面向各有驗證要求，列出來源一致性與邊界、獨立性、逐項 90 門檻及 NOT_RUN。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/SPEC.md#L91-L105) |
| `tests` | 98 | 22 個核心、4 個控制器、29 個 checkpoint 可離線重現。新增反例能辨識回乘顯示逆率的錯誤。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/SPEC.md#L107-L151) |
| `handoff` | 96 | 指定中央來源路徑、固定四檔與原承接，並列出正式文件登記、另領製作及後續交驗。 [固定段落](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/SPEC.md#L164-L172) |

## 固定來源與登記

- PR #258 讀回 `dcb21d0903006a708584edba8713e6117f8138a6`。PR #319 的第一筆 `8e2c723b54142b435f000eef7b552517ef12a7e1` 保留四檔原始 bytes，第二筆 `b88f00cfc3379a22d11b5736d048f4e54bdc4641` 只改 `BRIEF.md`、`SPEC.md`、`fixtures.json`、`AUTHOR-CHECK.md`。原 21 個核心案例的輸入及預期逐值相同。原三個控制器案例的輸入相同，既有 checkpoint 增加來源欄位，其中 Reset 的 `draft.rate` 由 `"31.5"` 改為 `""`。 [PR #258](https://github.com/KYStr/glossquote-labs-home/pull/258) · [第二筆差異](https://github.com/KYStr/glossquote-labs-home/compare/8e2c723b54142b435f000eef7b552517ef12a7e1...b88f00cfc3379a22d11b5736d048f4e54bdc4641) · [固定檔案雜湊](source-readback.json)
- r1618 的 ACK、register-task、claim、start 四筆 operationId 與 requestHash 精確讀回。r1621 的兩筆任務與原 spec 逐欄相同。維護 owner `local-codex:01a1c8a3-97f3-7ef1-a9c6-c33ad79facfd`，claim `fh-currency-claim-22d03c57-9355-4b50-a29c-6fe935f98642`。原規格 owner `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，claim `muse-r4-currency-converter-claim-20261109T155013Z-e6a82`。Reviewer `local-codex:01a1c87c-fc33-75e3-9aee-09999e6d38b1` 未參與兩份候選製作。 [r1621 固定登記冊](https://github.com/KYStr/glossquote-labs-home/blob/486390871b882099e749f40061e381a2dab86776/coordination/work-registry.json) · [來源與登記讀回](source-readback.json)
- REG-01 仍開放。原規格為 `draft`，登記的 production 繼承陣列仍是八節文件項目，與候選 §acceptance 的九個產品 ID 不同。維護 submit、正式 review、套用規格維護、ready、產品交驗及部署均待各自的流程。產品九項、Chrome／Edge、Network／Storage、正式 HTTPS／SEO 與原生下載對話均為 **NOT_RUN**。 [候選產品面向](https://github.com/KYStr/glossquote-labs-home/blob/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/SPEC.md#L91-L105) · [初審紀錄](https://github.com/KYStr/glossquote-labs-home/blob/12661e590ac65547c0eb77a16ebd9eceb3c4990e/docs/reviews/five-hour-2026-11-11/spec-review-06/currency-converter/REVIEW.md)

## 重現

下載兩份固定原始 fixture，將新版儲存為 `candidate-fixtures.json`，原版儲存為 `original-fixtures.json`。用 [固定檔案雜湊](source-readback.json) 核對原始 bytes。 [候選 fixture](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/b88f00cfc3379a22d11b5736d048f4e54bdc4641/docs/specs/currency-converter/fixtures.json) · [原始 fixture](https://raw.githubusercontent.com/KYStr/glossquote-labs-home/dcb21d0903006a708584edba8713e6117f8138a6/docs/specs/currency-converter/fixtures.json)

```sh
python -B verify.py --fixture candidate-fixtures.json --original-fixture original-fixtures.json --output-dir verified
```

獨立驗算以 Fraction、六位有效數字的 Decimal 與自建的控制器模型推導，逐值比對固定 fixture。執行 exit `0`，產出逐項紀錄與兩份報告樣本。 [驗算腳本](verify.py) · [驗算紀錄](verification.json) · [結構化評分](review.json)
