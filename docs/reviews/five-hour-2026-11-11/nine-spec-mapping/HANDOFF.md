# 九份修正規格的固定來源映射

整合者：local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf。本候選由已承接的五小時協調工作整理，後續映射任務尚未登記、未 claim、未 accepted、未 apply、未 ready。原 40 規格作者、52 原 PR 和既有 claim 均保留。

## 範圍與觀察

九份規格目錄的 40 份檔案逐位元複用已獨立接受的維護候選。另附同來源 README 的 1810 bytes 作原 source 路徑的固定對應；此檔與目前主分支 README 完全相同，不改主頁文件。映射僅把規格 ref 與九項產品驗收標準對上真實固定文件；不製作、改寫或發布產品。

| 規格 | 固定文件 | 來源 commit | 後續範圍 |
| --- | --- | --- | --- |
| age-calculator | [SPEC](../../../specs/age-calculator/SPEC.md) | `448bd9fc9865fe65f6014b66f4a2e2d54b76f539` | 待八節獨審與正式 ready |
| workdays-calculator | [SPEC](../../../specs/workdays-calculator/SPEC.md) | `448bd9fc9865fe65f6014b66f4a2e2d54b76f539` | 待八節獨審與正式 ready |
| salary-converter | [SPEC](../../../specs/salary-converter/SPEC.md) | `448bd9fc9865fe65f6014b66f4a2e2d54b76f539` | 待八節獨審與正式 ready |
| bill-split-calculator | [SPEC](../../../specs/bill-split-calculator/SPEC.md) | `448bd9fc9865fe65f6014b66f4a2e2d54b76f539` | 待八節獨審與正式 ready |
| dew-point-calculator | [SPEC](../../../specs/dew-point-calculator/SPEC.md) | `448bd9fc9865fe65f6014b66f4a2e2d54b76f539` | 待八節獨審與正式 ready |
| cooking-measurement-converter | [SPEC](../../../specs/cooking-measurement-converter/SPEC.md) | `23fa1265837f66fbedc04441db260dbb2a5ed924` | 待八節獨審與正式 ready |
| nhi-premium-calculator | [SPEC](../../../specs/nhi-premium-calculator/SPEC.md) | `23fa1265837f66fbedc04441db260dbb2a5ed924` | 待八節獨審與正式 ready |
| race-time-predictor | [SPEC](../../../specs/race-time-predictor/SPEC.md) | `23fa1265837f66fbedc04441db260dbb2a5ed924` | 既有跑步配速升級；不計新增工具 ready，不另開站 |
| calories-burned-calculator | [SPEC](../../../specs/calories-burned-calculator/SPEC.md) | `76aeb64235e82de05970e18a2e1231859aa1ee2a` | 待八節獨審與正式 ready |

[mapping.json](mapping.json) 的 document/source 不含自指 commit，使用實際 bytes/SHA-256；正式 task targets 由發布後的固定候選 commit 補上。九項產品 criteria 的 label 均逐字擷取該 SPEC 的表格，不改成八個文件章節。新的映射 maintenance task 自己使用八節文件 rubric。

## 可審查證據

- [逐檔來源](SOURCE-BYTES.json)：41 檔的來源 task/commit/Git blob/SHA-256。40 份規格 bytes 沒有修改，既有通過數值證據可重用，不冒稱再次執行產品。
- [來源與原登記快照](SOURCE-HISTORY.json)：三個 accepted 維護 task、原 owner/claim/acceptance 及九個未派工 draft。它是時間點快照；正式操作仍須讀最新 GitHub。
- legacy：[PR283](https://github.com/KYStr/glossquote-labs-home/pull/283)；[獨評](https://github.com/KYStr/glossquote-labs-home/blob/f5993ac4d92d21f3a42c914ea73f730746891c2d/docs/reviews/run5-legacy-repair-2026-11-10/acceptance/FINAL-REVIEW.md)。
- precision：[PR285](https://github.com/KYStr/glossquote-labs-home/pull/285)；[獨評](https://github.com/KYStr/glossquote-labs-home/blob/a36e68a4b4afcb2fad575798ad991592df0ea718/docs/reviews/five-hour-2026-11-11/astra/precision/INDEPENDENT-REVIEW.md)。
- calories：[PR288](https://github.com/KYStr/glossquote-labs-home/pull/288)；[獨評](https://github.com/KYStr/glossquote-labs-home/blob/dc46b7e5124afd2e930f709800de6ed16fbfac7f/docs/reviews/five-hour-2026-11-11/astra/calories/INDEPENDENT-REVIEW.md)。

## 接續順序

1. 協作核心 PR295 先完成已知漏洞修正、固定候選獨審與合法整合；本映射不繞過它。
2. 讀最新 registry，核對原 author/ref/criteriaHash/未派工與三個維護 accepted，保留全來源作者閉包。
3. 登記新的 maintenance 映射 task，固定本候選 commit/targets，再由真實承接者 claim/readback/start/submit。不可借用任何來源作者或審查者身分。
4. 非作者針對九份文件完整八節逐項給分與證據，全部必要檢查完成、每項至少90才 accepted。
5. primary 以合法 apply-spec-maintenance 套用，同ID與原作者，append-only歷史，回 draft。
6. 非作者另對同一文件作 ready。race-time-predictor 保留既有工具升級身分，不作新工具庫存；此版先留 draft，另走 running-pace 升級整合。其餘八份只能在真實八節通過後計入 ready。
7. 產品另登記並承接，完整九面向、實際隔離瀏覽器、GitHub候選、部署、雙語首頁及外部驗收依序完成。

## 範圍限制與既有微小文案

年齡原 BRIEF 對既有日期工具缺星期的說明已過時，真正差異是年齡借位與下次生日；工作日的反運算只在 SPEC 列出的端點/方向條件下成立。這些觀察沒有被悄悄寫回本次逐位元來源。餐費工具處理付款前稅/小費及均分，既有墊款結算處理每人已付與轉帳，兩者不能混稱。

本候選不表示任何產品已上線、任何瀏覽器/裝置/Network/Storage/原生下載已通過，也未合併各原 PR。沒有桌面/本機互動瀏覽器操作。
