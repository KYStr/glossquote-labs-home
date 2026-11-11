# Run 5 交接初篩 B｜用途、規格來源與驗證證據

2026-11-10。檢查範圍為 #223/#265、#231/#276 的產品用途，以及 12 組 HANDOFF、VERIFICATION、PR metadata 和 fixtures 的交叉核對。遠端預設分支固定於 `8fa06a997da219be3b81341e46b778374d8c7141`，registry blob `610d6d88d7482f3929e8da1844d148f1412511d0`、revision 1521。規格完整度與產品九面向的正式獨評尚未執行。

## #223 / #265 分帳用途

- 新工具的輸入是稅前帳單、稅率、小費比例、小費計算基數與人數，輸出稅額、小費、總額和個別應付額。沒有個別已付資料或轉移清單。因而不滿足「每個人輸入已付多少，算誰付誰」。[固定 SPEC §scope/inputsOutputs](https://github.com/KYStr/glossquote-labs-home/blob/31e8f193505e871d2b982538dc6292e5696d7863/docs/specs/bill-split-calculator/SPEC.md#L16-L67) · [#265 固定 HANDOFF](https://github.com/KYStr/glossquote-labs-home/blob/a8af53de730a7235091005c43be62460e2d557f8/tools/bill-split-calculator/HANDOFF.md#L18-L36)
- 既有 Bill Splitter 的兩種模式都收每人姓名與已付金額、自動加總、算應付與已付差額，並輸出「甲支付乙金額」。雙方都有等分，但前者的獨立用途是餐費稅／小費試算，後者的用途是墊款結算。保留既有產品來源，不能以 #265 替代。#223 的查重清單列了電費分攤與含稅換算，缺少既有 Bill Splitter 的比較。先補這項差異與清楚的用途命名，再評估是否各自陳列。固定來源索引的 `legacy-default:bill-splitter` 指向歷史公開來源，未用它推定本輪 live 版本。[既有固定 PRODUCT FR-03–05](https://github.com/KYStr/glossquote-labs-bill-splitter/blob/c82e8a182b36cf9568e28d9179a923e0fdaf7a4b/PRODUCT.md#L5-L9) · [共用來源索引](https://github.com/KYStr/glossquote-labs-home/blob/8fa06a997da219be3b81341e46b778374d8c7141/coordination/source-index.json#L635-L649) · [#223 查重](https://github.com/KYStr/glossquote-labs-home/blob/31e8f193505e871d2b982538dc6292e5696d7863/docs/specs/bill-split-calculator/SPEC.md#L20-L24)

## #231 / #276 完賽預測用途

- 既有 Running Pace 規格已接受任意範圍內的已知距離（0.01–300 km 或 mi），可用時間和距離求配速，並以同一 Riegel 1.06 公式輸出 5K、10K、半馬、全馬和每列預測配速。它在 r1521 是 draft 規格，證據支持規格重疊。#231 SPEC 第 24 行、AUTHOR-CHECK 第 11 行宣稱它缺自訂已知距離與每列配速，與舊規格牴觸。可保留的實質差異是直接以已知成績執行預測的流程、可輸入自訂**目標**距離，以及公尺輸入／每公里呈現和精度契約。先補正去重說明，再由獨立文件審查判斷是否足以單列。 [既有 Running Pace 固定 SPEC](https://github.com/KYStr/glossquote-labs-home/blob/40a7dc689e8e2fc2c527c323ca68398d95e9db19/docs/specs/running-pace-calculator/SPEC.md#L6-L23) · [#231 固定 SPEC](https://github.com/KYStr/glossquote-labs-home/blob/304df4065f31ee63cefb2f22b388b8865a5ec947/docs/specs/race-time-predictor/SPEC.md#L16-L25) · [#231 作者檢查](https://github.com/KYStr/glossquote-labs-home/blob/304df4065f31ee63cefb2f22b388b8865a5ec947/docs/specs/race-time-predictor/AUTHOR-CHECK.md#L8-L12) · [#276 固定 HANDOFF](https://github.com/KYStr/glossquote-labs-home/blob/2b528170837773a677c10b0c6414d80f1044af6f/tools/race-time-predictor/HANDOFF.md#L66-L79)

## 四個無法解析的規格來源

下列建置 HANDOFF 的完整 commit 用 GitHub GET `/repos/KYStr/glossquote-labs-home/commits/<sha>` 查詢，均回 HTTP 422 `No commit found for SHA`。各規格 PR 的真實 head 與 r1521 的對應 `document.commit` 一致。相同前綴與 fixture bytes 只能證明對應關係與測例檔一致，無法替無效規格引用作證。修正 HANDOFF／VERIFICATION 的固定引用，並在實際規格與新候選下重核受影響的證據。

| 建置 / 規格 PR | HANDOFF 無法解析的 commit | 規格 PR head／r1521 document.commit |
| --- | --- | --- |
| [#271 HANDOFF:6](https://github.com/KYStr/glossquote-labs-home/blob/32e6e44be95d2dadc059150f8396f865f16333bc/tools/feels-like-temperature/HANDOFF.md#L6) / #229 | `0b6ec5c684ba0370dec57f7a17712f3b57a09a56` | `0b6ec5c6dcbdd6fc457de9c827c1b3ac8652716e` |
| [#272 HANDOFF:6](https://github.com/KYStr/glossquote-labs-home/blob/44980ce29ec4e04a8bb2d5252e4d69da80acc142/tools/dew-point-calculator/HANDOFF.md#L6) / #230 | `8b89efbe8fdd9f62f7fbeb0d9a5290c0a8a3c462` | `8b89efbe27da257c130bea8f70d5e4abc8865232` |
| [#273 HANDOFF:6](https://github.com/KYStr/glossquote-labs-home/blob/6371152d930e32aae8a0ef590ca44dd4bf5fe2da/tools/clothing-size-converter/HANDOFF.md#L6) / #228 | `ed41923a03d27c2c826658f4a27749ea188728a2` | `ed41923a0c653a92b2602d0ed02deba873a42ec5` |
| [#277 HANDOFF:6](https://github.com/KYStr/glossquote-labs-home/blob/d91f9fcde299dcc2655f9f16d8fe1e2b8c027690/tools/period-cycle-calculator/HANDOFF.md#L6) / #233 | `3fc93c6c3501795ceafdb56f544f5be2d4d24718` | `3fc93c6c679974e7b0830ad45a01f2af968839a6` |

## 12 份作者紀錄

逐一讀取 VERIFICATION 的 `npm test` 行，作者報告 **607 tests passed**。逐位元組比較本地擷取的 `test/fixtures.json` 與配對規格 PR head 的 `fixtures.json`，12/12 一致。這輪未執行產品指令、瀏覽器、真機、乾淨設定檔的網路／儲存觀察、原生對話、正式 HTTPS/SEO 或部署。

| 建置 / 規格 PR | 工具 | 作者測試數 |
| --- | --- | ---: |
| #265 / #223 | [bill-split-calculator](https://github.com/KYStr/glossquote-labs-home/blob/a8af53de730a7235091005c43be62460e2d557f8/tools/bill-split-calculator/VERIFICATION.md#L21) | 49 |
| #266 / #224 | [salary-converter](https://github.com/KYStr/glossquote-labs-home/blob/f7e6ec583d28947445d15e5aa254569c7d4fc068/tools/salary-converter/VERIFICATION.md#L17) | 42 |
| #267 / #221 | [age-calculator](https://github.com/KYStr/glossquote-labs-home/blob/717ffe47574b2def25c9ab6f44e8dae6f0e1d080/tools/age-calculator/VERIFICATION.md#L35) | 50 |
| #268 / #222 | [cooking-measurement-converter](https://github.com/KYStr/glossquote-labs-home/blob/a4ba7abbf50fb3dffa0a93e2a2165cd47be502f8/tools/cooking-measurement-converter/VERIFICATION.md#L24) | 58 |
| #269 / #225 | [workdays-calculator](https://github.com/KYStr/glossquote-labs-home/blob/0be2e551d603d5c0615c7043534d9def5982ddb7/tools/workdays-calculator/VERIFICATION.md#L10) | 64 |
| #270 / #226 | [wallpaper-calculator](https://github.com/KYStr/glossquote-labs-home/blob/6be517b99651d23d082e7ad9b84a288583068d56/tools/wallpaper-calculator/VERIFICATION.md#L17) | 49 |
| #271 / #229 | [feels-like-temperature](https://github.com/KYStr/glossquote-labs-home/blob/32e6e44be95d2dadc059150f8396f865f16333bc/tools/feels-like-temperature/VERIFICATION.md#L24) | 45 |
| #272 / #230 | [dew-point-calculator](https://github.com/KYStr/glossquote-labs-home/blob/44980ce29ec4e04a8bb2d5252e4d69da80acc142/tools/dew-point-calculator/VERIFICATION.md#L21) | 46 |
| #273 / #228 | [clothing-size-converter](https://github.com/KYStr/glossquote-labs-home/blob/6371152d930e32aae8a0ef590ca44dd4bf5fe2da/tools/clothing-size-converter/VERIFICATION.md#L29) | 53 |
| #274 / #227 | [ping-area-converter](https://github.com/KYStr/glossquote-labs-home/blob/f1bb55845b9e9f1863626f9dc1c24558ba3a4088/tools/ping-area-converter/VERIFICATION.md#L39) | 59 |
| #276 / #231 | [race-time-predictor](https://github.com/KYStr/glossquote-labs-home/blob/2b528170837773a677c10b0c6414d80f1044af6f/tools/race-time-predictor/VERIFICATION.md#L21) | 44 |
| #277 / #233 | [period-cycle-calculator](https://github.com/KYStr/glossquote-labs-home/blob/d91f9fcde299dcc2655f9f16d8fe1e2b8c027690/tools/period-cycle-calculator/VERIFICATION.md#L27) | 48 |
| | 合計 | 607 |

### 共通交驗缺口

- 12 份文件明列真實瀏覽器、真機及正式 HTTPS／SEO 尚未執行。部分清單也明列隔離設定檔的網路／儲存和原生對話。#269 的清單沒有逐項列出乾淨設定檔的 Network／Storage 觀察。HTML、HTTP、模擬 DOM 或 Worker 快速驗證可支撐部分工具鏈證據，不能補上真實瀏覽器的證據。 [#269 NOT_RUN](https://github.com/KYStr/glossquote-labs-home/blob/0be2e551d603d5c0615c7043534d9def5982ddb7/tools/workdays-calculator/VERIFICATION.md#L76-L92) · [#265 NOT_RUN](https://github.com/KYStr/glossquote-labs-home/blob/a8af53de730a7235091005c43be62460e2d557f8/tools/bill-split-calculator/VERIFICATION.md#L49-L63)
- 作者紀錄有命令與敘述式結果，但 12 份 VERIFICATION 均無明列逐命令的 exit code，且各自的 HANDOFF／VERIFICATION 內無完整建置 PR head SHA。可由外部 PR metadata 指認固定證據檔，正式交驗仍須將證據固定到該 candidate、task、claim 與 PR。r1521 的 12 個 build PR 在本次 [registry mapping](registry-mapping.json) 均為空 `tasks`，沒有正式產品 submission 的對應。待有效 task、claim、submission 和同候選的獨立評分齊備後，才可判定產品是否 accepted。 [遠端 Handbook](https://github.com/KYStr/glossquote-labs-home/blob/8fa06a997da219be3b81341e46b778374d8c7141/docs/AGENT-HANDBOOK.md#L78-L86) · [交驗及審查規則](https://github.com/KYStr/glossquote-labs-home/blob/8fa06a997da219be3b81341e46b778374d8c7141/docs/COORDINATION-COMMANDS.md#L145-L179)
