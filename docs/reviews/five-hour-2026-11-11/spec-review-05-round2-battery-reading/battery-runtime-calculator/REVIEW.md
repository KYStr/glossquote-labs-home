# 電池續航計算維護規格獨立複核

**維護建議 退修 · 文件與驗算 FAIL**

任務 `labs-five-hour-repair-battery-20261111`，複核人 `local-codex:01a1c87c-f8d5-7e92-8aed-25f805df2a6a`，候選 `4ffb54a6d0f763be3f923eec8b9a0baab88cb90c`。已驗維護作者、原 owner、claim、直接父提交、四檔 Git blob 與匿名 HTTP bytes。 [維護 PR #318](https://github.com/KYStr/glossquote-labs-home/pull/318) · [固定 SPEC](https://github.com/KYStr/glossquote-labs-home/blob/4ffb54a6d0f763be3f923eec8b9a0baab88cb90c/docs/specs/battery-runtime-calculator/SPEC.md) · [初審證據](https://github.com/KYStr/glossquote-labs-home/blob/3127d3ee9015c74aae709acf085516bc5cb7c277/docs/reviews/five-hour-2026-11-11/spec-review-05/battery-runtime-calculator/REVIEW.md)

## 三項維護面向

| 面向 | 分數 | 結果 | 證據 |
| --- | ---: | --- | --- |
| spec-corrections | 84 | FAIL | BAT-01 的前置安全整數檢查、首錯及 RESULT_LIMIT 生命週期完整。BAT-02 的兩語欄位提示和理想模型文案已修，§scope 保留把 DoD 用作轉換損耗近似的指示，與 §inputsOutputs 及 FAQ 的新口徑衝突。 |
| exact-fixtures | 100 | PASS | Node 24 的定標 BigInt 驗算 40/40。按 ID 核對原 31 筆全值及相對順序。兩個超界、相鄰三個分鐘邊界、首錯、等效額定輸入及 dirty 撤銷均重現。 |
| provenance-and-scope | 100 | PASS | PR #318 直接繼承原 PR #253 的固定 head。只修改指定規格目錄四檔，遠端 Git blob、原始 bytes 及作者發布副本一致。本人未參與原作或維護，r1616 的 owner 與 claim 相符。 |

## 原缺陷複核

- **BAT-01 PASS**。反推精確 333333333333333333334 mAh，pack 精確捨入 857142857142857143 分，皆回 RESULT_LIMIT。臨界 9007199254740990、9007199254740991 可輸出，9007199254740992 擋下。`cellVoltage:"1,000"` 先回 DECIMAL_FORMAT。成功後換成超界輸入，dirty 及 error 皆無報告。
- **BAT-02 FAIL**。同端 6000 mAh／5 V 或 30 Wh 配 10 W 均得 180 分鐘。兩語欄位及反推估算文字已修，舊範圍句仍引導使用者把 DoD 當轉換損耗，見 BAT-R2-01。

## 必要退修

### BAT-R2-01 轉換損耗與放電深度在同一份規格有相反指示

§scope 第 25 行仍稱轉換損耗只能以放電深度粗略涵蓋。第 97、225 行則限定 DoD 為額定電量的放電比例，明示模型未扣除轉換損耗。依新口徑，額定輸出 30 Wh、10 W、預設 DoD 100% 為 180 分鐘。若依舊句只為模擬已反映在額定輸出值的轉換損耗而再填 DoD 80%，同樣輸出條件會被算成 144 分鐘。 [SPEC 第 25 行](https://github.com/KYStr/glossquote-labs-home/blob/4ffb54a6d0f763be3f923eec8b9a0baab88cb90c/docs/specs/battery-runtime-calculator/SPEC.md#L25) · [SPEC 第 97 行](https://github.com/KYStr/glossquote-labs-home/blob/4ffb54a6d0f763be3f923eec8b9a0baab88cb90c/docs/specs/battery-runtime-calculator/SPEC.md#L97) · [SPEC 第 225 行](https://github.com/KYStr/glossquote-labs-home/blob/4ffb54a6d0f763be3f923eec8b9a0baab88cb90c/docs/specs/battery-runtime-calculator/SPEC.md#L225)

重現輸入

```json
{
  "mode": "runtime-wh",
  "capacityWh": "30",
  "loadWatts": "10"
}
```

只修 §scope 的損耗句，統一為轉換損耗未納入，DoD 表示納入估算的額定電量比例。保留既有計算欄位與模型，重審更新後的固定 head。

## 非必要改善

- **BAT-R2-02**。§inputsOutputs 第 131 行把 10⁻⁶% 稱為最小 DoD。`0.000001` 有 8 個 UTF-16 單位，先回 INPUT_LIMIT。`0.00001` 才是 7 單位合法下限。可修為正確下限，或明說 10⁻⁶% 只是保守下界。現有 10¹⁹ Wh 上界仍有限且保守，現有計算與 RESULT_LIMIT 不受影響。

## 文件八節可用性

| 章節 | 分數 | 結果 | 證據 |
| --- | ---: | --- | --- |
| goal | 97 | PASS | 沿用已核對的桌面、行動與反推三個使用情境。原節 bytes 相同，成功觀察量仍由四模式覆蓋。 [§goal](https://github.com/KYStr/glossquote-labs-home/blob/4ffb54a6d0f763be3f923eec8b9a0baab88cb90c/docs/specs/battery-runtime-calculator/SPEC.md#L7) |
| scope | 84 | FAIL | 四模式及活動換電池表的區隔保留。原節仍指示用 DoD 粗估轉換損耗，與同一份候選的新契約衝突。 [§scope](https://github.com/KYStr/glossquote-labs-home/blob/4ffb54a6d0f763be3f923eec8b9a0baab88cb90c/docs/specs/battery-runtime-calculator/SPEC.md#L17) |
| userFlow | 97 | PASS | 容量與 V 的對應、同端 W、理想模型、雙語表單級 RESULT_LIMIT 和結果撤銷均有可驗文案與流程。 [§userFlow](https://github.com/KYStr/glossquote-labs-home/blob/4ffb54a6d0f763be3f923eec8b9a0baab88cb90c/docs/specs/battery-runtime-calculator/SPEC.md#L35) |
| inputsOutputs | 95 | PASS | JSON schema、四個整數欄位、先驗輸入再查結果、未有部分輸出及 null 分支有釘版。DoD 最小值文字可更精確。 [§inputsOutputs](https://github.com/KYStr/glossquote-labs-home/blob/4ffb54a6d0f763be3f923eec8b9a0baab88cb90c/docs/specs/battery-runtime-calculator/SPEC.md#L86) |
| implementation | 97 | PASS | 定標運算與一次轉 Number 可直接實作。Worker 成功與失敗皆釋放，世代、Blob URL、CSP、隱私約束具體。 [§implementation](https://github.com/KYStr/glossquote-labs-home/blob/4ffb54a6d0f763be3f923eec8b9a0baab88cb90c/docs/specs/battery-runtime-calculator/SPEC.md#L135) |
| acceptance | 98 | PASS | 同候選九面向，新增合法端點與四筆 controller。其產品分數均為 null。 [§acceptance](https://github.com/KYStr/glossquote-labs-home/blob/4ffb54a6d0f763be3f923eec8b9a0baab88cb90c/docs/specs/battery-runtime-calculator/SPEC.md#L146) |
| tests | 100 | PASS | 獨立重算 36 筆核心與 4 筆狀態。對安全整數上限的字面 JSON、容量 ceil 與時分恆等式也有可重現證據。 [§tests](https://github.com/KYStr/glossquote-labs-home/blob/4ffb54a6d0f763be3f923eec8b9a0baab88cb90c/docs/specs/battery-runtime-calculator/SPEC.md#L162) |
| handoff | 98 | PASS | 文件、固定 refs、獨立重審、開工與發布順序齊備。來源維護 task 和 REG-01 的流程有明確區別。 [§handoff](https://github.com/KYStr/glossquote-labs-home/blob/4ffb54a6d0f763be3f923eec8b9a0baab88cb90c/docs/specs/battery-runtime-calculator/SPEC.md#L231) |

## 獨立驗算

以六位十進位定標 BigInt 計算能量、容量與時分。先驗精確整數上限，顯示量以精確十進位字串轉一次 Number。控制器以工作世代重放，下載輸出只在模型中檢查 canonical JSON bytes。 本次 40/40 相符，原 31 筆全值與相對順序保持。exit 0。 [完整字面結果](fixture-results.json) · [重現方式](../REPRODUCE.md)

## 讀回與未驗項

兩項維護 task 在本輪初讀 r1616 時為 working。正式 registry review、映射、readiness 與九個產品驗收面向均為 NOT_RUN。 [固定來源和登記讀回](../fixed-sources.json) · [父提交與差異讀回](../candidate-diff-readback.json)

- 額定容量應與對應的額定電壓配對，電芯和輸出端屬不同量測口徑。 [Anker 官方容量說明](https://service.anker.com/eu/article-description/Why-Is-the-Rated-Capacity-Marked-on-a-Power-Bank-Lower-Than-Expected)
- 原換電池排程按實測使用分鐘推算換組時間，依原審查證據維持產品區隔。 [活動備用電池替換表固定規格](https://github.com/KYStr/glossquote-labs-home/blob/c8edde6a8d2a83d69a5ef863057184d0ee5022d0/docs/specs/battery-swap-plan/SPEC.md)
