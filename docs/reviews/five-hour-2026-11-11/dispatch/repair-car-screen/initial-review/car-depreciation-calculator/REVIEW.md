> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：b60bab7755480aa435615711936d5a3886cfcb186553e86bc66d127566a7916f。

# 車輛折舊計算獨立文件審查

審查時間 2026-11-11T03:06:21Z。文件需退修。維持原 task、spec ID 與 owner，由修訂後的新 head 提供複驗。

- 任務 labs-car-depreciation-calculator-spec-20261109，預案 spec-car-depreciation-calculator-20261109。
- 固定候選 efad9c067e608d72b02078755e24357d5635b3b7。[SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/efad9c067e608d72b02078755e24357d5635b3b7/docs/specs/car-depreciation-calculator/SPEC.md) · [PR #250](https://github.com/KYStr/glossquote-labs-home/pull/250)
- Reviewer local-codex:01a1c87c-f580-7382-b037-3b6d83eee0f7，未參與候選製作。Registry r1530，blob e01da965f28e5248ca13158094ca356254a25c2b。原 owner 與 claim 已讀回。固定來源查核（本地證據：../source-check.json）
- 文件評定 FAIL。審查時的遠端狀態為 task reviewing、spec draft。

## 八節評分

| 面向 | 完整度 | 分數 | 證據 |
| --- | --- | ---: | --- |
| goal | PASS | 96 | §goal 指明桌面查折舊路徑與現場手機估算，常駐揭露購入價模型僅供規劃。 |
| scope | PASS | 96 | §scope 釘版三模式、整元、殘值下限與逐年表。核對固定燃油與房貸規格，皆有不同資料與成果。 |
| userFlow | PASS | 92 | §userFlow 定義方式切換、分離草稿與核心、結果、取消、錯誤、重設和下載。直線期末語義與下限標記須對應計算規則。 |
| inputsOutputs | FAIL | 80 | §inputsOutputs 限制語法、順序、列號、精度與匯出。對有效且不可整除的價格，直線攤提期末可能未達殘值甚至永遠不動（CAR-01）。 |
| implementation | PASS | 95 | §implementation 的 BigInt、七欄草稿投影成五欄核心、工作世代及 CSP 為零依賴可實作，運算只需 30 列。 |
| acceptance | PASS | 95 | §acceptance 九產品面向定義逐項檢查、≥90 與必要項完成，包含三種方式、兩語與正式站 gate。產品全部 NOT_RUN。 |
| tests | FAIL | 85 | 14 核心與 3 controller 均由獨立演算比對通過。現行直線期滿案例剛好整除，漏掉 CAR-01 的捨入餘差。 |
| handoff | PASS | 97 | §handoff 列固定文件包、原 owner、另取製作 claim、命令與交驗/發布責任。 |

## 阻擋缺陷

### CAR-01 直線攤提年限不能可靠決定殘值到期點

- **重現與實際** `{method:'straight',price:'880003',years:'10',salvagePercent:'10',usefulLife:'10'}`。殘值 `88000`，折舊基礎 `792003`，每年固定整元 `79200`。第 10 年剩 `88003` 且 `floorReachedYear=null`，第 11 年仍折 3 元才到下限。另一合法例購入價 1、殘值 0%、攤提 3 年，年額四捨五入為 0，30 年仍值 1 元。
- **預期與複驗** 保留整元並固定餘差分配，使攤提年限當年完成折舊至殘值。以 880003 元例驗第 10 年 `currentValue=88000`、累計 `792003`，第 11 年折舊 0。若產品刻意採固定整元扣減模型，須改寫攤提年限欄位與雙語方法說明，明示何時可能延後或未達下限。
- **影響** 使用者用攤提年限和首次達下限年做規劃，現有年額規則與「直線攤提年數」的期末語義不合。IAS 16 在此只作方法定義佐證。 [IFRS Foundation IAS 16 §50、53、62](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf?bypass=on)

## 製作驗收繼承

- **REG-01 實際** 原規格製作 task 的八節 criteria 與文件審查一致。登記冊的 spec.acceptanceCriteria 也填入 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。
- **預期** 製作 task 依協作規則繼承 spec.acceptanceCriteria，該欄位須保存 SPEC 的九個產品面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility。目前九項皆未繼承。
- **處置** 由主統籌依合法修訂流程處理同一 spec ID，重讀登記及候選後才可標記 ready。

## 非阻擋事項

- 預設 20/18/15/12/10/8/8/6/6/5% 可作可編輯的假設示例。規格沒有支持「常見」的台灣成交資料來源，將雙語措辭收斂至示例即可。
- FAQ 把後期 0 折舊一律解釋為達下限。購入價 100000、定率 50%、殘值 0 時，第 18 年起因整元鏈停在 1，未達下限。另可說明零費率與捨入停滯。
- 等於下限與本年發生裁切各有意義。`straight-floor-before-life` 第 10 年 `endValue=50000` 但 `floored=false`，UI 下限標記宜按相等判定。
- §tests 案例表可補已存在且重算通過的 `table-half-used`，使 14 個核心案例均可從表定位。

## 字面案例與檢查

命令 `node .runs/five-hour-2026-11-11/dispatch/spec-review-04/review/car-depreciation-calculator/verify.mjs` 在 v24.14.0 離線執行，exit 0，逐案 17/17 相符。三組 controller 為文件狀態模型，完整輸入、獨立輸出與額外探針均已保存。重算腳本（本地證據：verify.mjs） · 逐案證據（本地證據：fixture-results.json） · 命令輸出（本地證據：fixture-run.log）

產品九面向 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility 均為 NOT_RUN，分數為 null。瀏覽器、畫面、下載、正式 HTTPS／SEO 與部署為產品階段的檢查。

## 來源

- 實讀 §50、53、62，直線法以折舊基礎扣殘值後分配至使用年限，用於核對模型語義。 [IFRS Foundation IAS 16](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2021/issued/part-a/ias-16-property-plant-and-equipment.pdf?bypass=on)
- 實讀車況、里程、地區及成交資料的作用。未將其美國行情當作台灣預設係數。 [Kelley Blue Book 估值方法](https://b2b.kbb.com/kbb-vehicle-values/faq/)
- §1–2 為里程、油耗和油價估燃料開支。 [燃料成本固定規格](https://github.com/KYStr/glossquote-labs-home/blob/23ea1fefda8c495a29e71932d8fd55cc92f2d804/docs/specs/fuel-cost-calculator/SPEC.md)
- §1–2 為本金、利率與分期償還，無車價折舊。 [房貸固定來源](https://github.com/KYStr/glossquote-labs-home/blob/e0ef81a2b5489489f13b2bc088f8906978700cb5/docs/specs/mortgage-amortization/SPEC.md)
- 核對零依賴、八節、九項未來驗收與文件 ready 門檻。 [批次任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
