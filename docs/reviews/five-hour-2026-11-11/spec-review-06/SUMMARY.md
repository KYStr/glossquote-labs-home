# FH-spec-review-06 獨立文件審查總表

五份候選均建議退修，可開工 ready 為 **0/5**。獨立重算核心 **97/97**、controller **15/15**。五支離線驗算皆 exit `0`。九項產品驗收在每份文件均記 NOT_RUN。

| 候選 | PR | 字面案例 | 阻擋 | 證據 |
| --- | ---: | ---: | --- | --- |
| 匯率換算 | [#258](https://github.com/KYStr/glossquote-labs-home/pull/258) | 24 | CUR-01、CUR-02。重設帶入未標記的匯率範例。反向 fixture 無法抓到誤用顯示匯率。 | [審查](currency-converter/REVIEW.md) · [資料](currency-converter/review.json) |
| 骰子模擬器 | [#260](https://github.com/KYStr/glossquote-labs-home/pull/260) | 24 | DICE-01。同 seed 跨骰式不保證同輸出，報告也無法證明未重擲。 | [審查](dice-roller/REVIEW.md) · [資料](dice-roller/review.json) |
| 泳池水量 | [#261](https://github.com/KYStr/glossquote-labs-home/pull/261) | 21 | POOL-01。未啟用欄位的 Unicode 驗證與測試預期互斥。 | [審查](pool-volume-calculator/REVIEW.md) · [資料](pool-volume-calculator/review.json) |
| 嬰兒奶量 | [#262](https://github.com/KYStr/glossquote-labs-home/pull/262) | 19 | BABY-01、BABY-02。超出指引期間仍給逐餐量，下載缺來源及適用語境。 | [審查](baby-feeding-calculator/REVIEW.md) · [資料](baby-feeding-calculator/review.json) |
| 寵物餵食量 | [#263](https://github.com/KYStr/glossquote-labs-home/pull/263) | 24 | PET-01、PET-02。減重欄位需明示目標體重。允許的邊界會把正餐量捨成 0 g／0 杯。 | [審查](pet-feeding-calculator/REVIEW.md) · [資料](pet-feeding-calculator/review.json) |

## 共通 ready 阻擋

`REG-01` 涉及五筆 `spec.acceptanceCriteria`。原規格工作 task 的八個文件面向有效。製作 task 須繼承 spec 的驗收陣列，目前陣列為文件八面向，和各候選 §acceptance 固定的產品九面向不一致。r1553 仍可重現。[登記逐筆比對](production-rubric-check.json)

## 來源與讀回

- 審查者 `local-codex:01a1c87c-fc33-75e3-9aee-09999e6d38b1`。本輪簡報固定在 PR #284 的 `83d5b24a00eb80d07ffcdd8aa2886006bc8a61ed`。首次 r1530 登記冊 blob 為 `e01da965f28e5248ca13158094ca356254a25c2b`，比對了五候選的 20 檔與簡報 2 檔 Git blob。[初讀與檔案比對](intake.json)
- 台北 11:16 讀回 r1553，blob `41782f0214ca3ad31763fdc8a9062f6569db531a` 與 GitHub connector 同值。五個 PR 仍是固定 head 的 open draft，五件原 task 都是 reviewing，五份 spec 都是 draft。已對照同 specId 的 production task。
- 審查環境檢查前後一致。公開副本保留審查結果與重現資料，原始報告和機器環境紀錄留存在本地。
- 文件結果與證據已落盤。正式 ACK 與 review 等待主統籌安排串行時段。各份修正後須依新 head 重核受影響項。

[機器可讀總表與 SHA-256](summary.json)

[重現步驟](REPRODUCE.md) · [檔案 manifest](manifest.json)
