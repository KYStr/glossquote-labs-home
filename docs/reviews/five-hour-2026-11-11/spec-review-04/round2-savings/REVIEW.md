# FH-SAVINGS-R2｜儲蓄尾款與達標月份獨立複審

**維護文件三項達門檻，26/26 個固定案例相符。** 複審固定候選 `35b2d302033af86e48337b7019a286180d5e8259`，parent `1ffbc97defae56546824333671b90e2d87b0c359`。查核時 PR #306 為 open draft。 [PR #306](https://github.com/KYStr/glossquote-labs-home/pull/306) · [固定規格](https://github.com/KYStr/glossquote-labs-home/blob/35b2d302033af86e48337b7019a286180d5e8259/docs/specs/savings-goal-calculator/SPEC.md)

審查者 `local-codex:01a1c87c-f580-7382-b037-3b6d83eee0f7` 未參與原預案或此次維護。Registry r1591 的 `labs-five-hour-repair-savings-20261111` 為 `working`，`submission` 為 null。維護者 `local-codex:01a1c8a3-8c54-7810-a0e1-bc3a2ffbfe01`、claim `fh-savings-claim-77e39ae9-60eb-4275-88cd-f2fe4c1218fe` 與維護發布收據相符。正式審查登記等待串行時段。 [登記讀回](registry-check.json)

## 維護評分

| Registry 面向 | 分數 | 文件查核 |
| --- | ---: | --- |
| `spec-corrections` | 100 | BRIEF、SPEC 和交接均指向既有 `tools/compound-interest-calculator/` 的尾款升級。模式 B 分列目標、實際尾款後餘額與全額存入餘額。精確比較先限索引 0–1200，先查 B(1200)，正利率界內用整數二分。模式 A 用於模型回歸，整合另立任務。 |
| `exact-fixtures` | 100 | 23 個核心與 3 個合成 controller 案例逐項相符。兩種模式的存款／利息等式、正尾款少一分、1,200／1,201 月、正利率超期、原逐月入帳模型和三份 JSON 樣本均完成複算。 |
| `provenance-and-scope` | 100 | 匿名讀取七個候選檔，重算 Git blob SHA 與 SHA-256。四個 parent 檔逐 byte 相符原 #245。三份 GitHub diff 完整重建固定檔案，本機維護 diff 的四組 hunks 與 GitHub 相符。原 owner、claim、初審判決、固定前案及未執行項均可追溯。 |

[固定任務](https://github.com/KYStr/glossquote-labs-home/blob/418aee70f60a04cbe19e339597c91a056bcad0c4/docs/reviews/five-hour-2026-11-11/dispatch/repair-savings/TASK.md) · [固定檔案雜湊](source-check.json) · [完整 diff 讀回](diff-audit.json) · [逐案結果](verification.json)

## SG-01｜既有複利工具升級

固定 #44 §2–4 與 #80 英文頁的控制項已具備「幾個月達標」和「每月需存」。修訂保留原候選與既有工具路徑，補充整分尾款、實際期末餘額和 1,200 月搜尋。既有模型逐月捨入利息並在 600 月停止。以本金 0.01、目標 0.02、年率 12%、月存 0 重算，既有模型至第 600 月仍為 0.01。未中間捨入模型第 69 月為約 1.98689442 分，第 70 月為約 2.00676337 分。BRIEF、結果旁揭露及 FAQ 均交代計息假設。 [#44 固定規格](https://github.com/KYStr/glossquote-labs-home/blob/5a9acc11b5b23200c3d4cda32adaafbbd389532e/docs/specs/compound-interest-calculator/SPEC.md) · [#80 固定介面](https://github.com/KYStr/glossquote-labs-home/blob/e42ebf56853ad8e46964ea8fc1ebf9623c6c2bb1/tools/compound-interest-calculator/public/en/index.html#L33-L34) · [修訂範圍](https://github.com/KYStr/glossquote-labs-home/blob/35b2d302033af86e48337b7019a286180d5e8259/docs/specs/savings-goal-calculator/SPEC.md#L21-L29)

## SG-02｜目標、尾款與實際餘額

| 固定案例 | 目標 | 首次達標月 | 整分尾款 | 全額存入餘額 | 照計畫期末餘額 | 利息 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `months-growth-only-crossing` | 11000.00 | 10 | 0.00 | 11046.22 | 11046.22 | 1046.22 |
| `months-with-interest` | 20000.00 | 42 | 152.88 | 20147.13 | 20000.01 | 2547.13 |
| `months-one-cent-tail` | 0.51 | 1 | 0.01 | 0.52 | 0.52 | 0.01 |

第 42 月的尾款前餘額約 19847.125416，加 152.88 得約 20000.005416。純成長案例尾款為零，該月利息使期末高於目標 46.22。一分案例在存款前精確為 50.5 分。這個餘額顯示為 0.51，精確比較仍低於 51 分，存入一分後為 51.5 分，顯示 0.52。 [輸出契約](https://github.com/KYStr/glossquote-labs-home/blob/35b2d302033af86e48337b7019a286180d5e8259/docs/specs/savings-goal-calculator/SPEC.md#L85-L96) · [獨立逐月餘額](verification.json)

每月計息本金與利率非負，累計精確利息 I ≥ 0。初始額 P 與實際存款 D 均為整分，因此 `halfUp(P + D + I) − P − D = halfUp(I) ≥ 0`。此關係適用於兩模式。獨立驗算用 Python `Fraction` 分別累計實際存款與精確利息，再以 96 組固定種子算例補驗。 [驗算程式](verify.py)

## SG-03｜有界精確搜尋

規格要求餘額和乘冪入口先檢查索引為 0–1200 的整數。排除已達標或無成長後，先精確比較 B(1200)。不足時直接回 `beyond-horizon`。界內正利率用單調整數二分，零利率用整數進位除法。獨立驗算以逐月掃描求首個達標月，再以受限閉式核對。另遍歷全部 1,200 種首次達標位置，其中 848 種需 10 次、352 種需 11 次中點比較。索引 −1、1201、3,039,425 和非整數在乘冪前拒絕。 [搜尋與索引規格](https://github.com/KYStr/glossquote-labs-home/blob/35b2d302033af86e48337b7019a286180d5e8259/docs/specs/savings-goal-calculator/SPEC.md#L85-L102) · [索引紀錄](verification.json)

零利率、初始 0、月存 1 時，目標 1200 在第 1,200 月達標，目標 1201 回超期。正利率超期原反例在 B(1200) 約為 1.01005012 分，只需一次上限評估。補驗年率 0.01%、初始 0、月存 1、目標 1205.50，確於第 1,200 月首次達標。初始 0.55、目標 0.56、年率 0.01%、月存 0 的補例，B(1200) 約為 55.55275687 分，顯示 0.56，結果仍為超期。 [固定案例](fixtures/revised.json) · [補驗與評估序列](verification.json)

## 原案例與報告

原 21 個案例全部保留 ID、類型和輸入。14 個完整不變。其餘七個模式 B 輸出加上 `targetAmount`，其中兩案依實際照計畫存款重算期末餘額及利息。四個 `purpose` 欄重寫案例描述，逐欄前後值已列在 `originalDelta`。另新增五例。 [原 fixtures](fixtures/original.json) · [完整前後差異](verification.json)

下載旁的雙語文字明示報告含兩種模式的原始草稿和本次結果。以兩模式各自的非作用中欄驗證 raw 草稿、前導零及 Unicode 的保存，並比對固定排序、UTF-8 無 BOM 和單一結尾 LF。含息尾款的 371-byte 樣本 SHA-256 為 `9b80ce6af411e6b9e7e9129161cf11f111a3a34213b34f92e06c4377b021561a`。另兩份樣本分別為 276 和 364 bytes。Python 字面樣本與 Node 序列化三件逐 byte 相符。 [下載規格](https://github.com/KYStr/glossquote-labs-home/blob/35b2d302033af86e48337b7019a286180d5e8259/docs/specs/savings-goal-calculator/SPEC.md#L96) · [樣本與雜湊](verification.json)

## 登記與交接

原 #245 task 為 `revision`，原 spec 為 `draft`、未消耗。原 owner 和 claim 保留，初審仍可由 #286 的固定證據追溯。新版保留八個文件節名及九個未來產品 gate。r1591 的原 spec 仍把文件八項登記為產品繼承面向，REG-01 留在原審查範圍。此升級不計新工具 ready。 [原 #245](https://github.com/KYStr/glossquote-labs-home/pull/245) · [初審 #286](https://github.com/KYStr/glossquote-labs-home/blob/ac67a702d325c53555133ebcae249cc5913aa7f3/docs/reviews/five-hour-2026-11-11/spec-review-03/savings-goal-calculator/REVIEW.md) · [讀回](registry-check.json)

產品九面向、真實瀏覽器、實際下載、Network/Storage、正式 SEO、產品整合與部署均為 **NOT_RUN**。三個 controller 案例在合成狀態模型驗算。Registry ACK、review、ready 與 merge 均為 **NOT_RUN**。 [結構化複審](review.json)

在此證據目錄執行下列命令。使用 Python 3.12.5 標準庫，離線執行 exit 0，並與 [verification.json](verification.json) 比對每個 byte。

```sh
python -B -X utf8 verify.py --check
```
