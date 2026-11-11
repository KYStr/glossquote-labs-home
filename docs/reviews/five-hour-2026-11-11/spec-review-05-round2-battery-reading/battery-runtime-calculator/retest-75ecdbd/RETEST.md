# 電池續航計算範圍勘誤複驗

**BAT-R2-01 與 BAT-SCOPE-01 通過。建議以新 head 正式交驗。**

維護 task `labs-five-hour-repair-battery-20261111`。PR #318 固定新候選 `75ecdbdff3c5b3b8e2d5c097df517c6a75466776`，唯一 parent `4ffb54a6d0f763be3f923eec8b9a0baab88cb90c`。登記冊 r1627 的維護 owner、claim 和原 owner 相符。 [維護 PR #318](https://github.com/KYStr/glossquote-labs-home/pull/318) · [新規格範圍](https://github.com/KYStr/glossquote-labs-home/blob/75ecdbdff3c5b3b8e2d5c097df517c6a75466776/docs/specs/battery-runtime-calculator/SPEC.md#L25)

## 三項維護面向

| 面向 | 分數 | 結果 | 證據 |
| --- | ---: | --- | --- |
| spec-corrections | 98 | PASS | §scope 第 25 行已排除轉換損耗並限定 DoD 為額定電量比例。與同端額定提示、§inputsOutputs 和雙語 FAQ 一致。AUTHOR-CHECK 只新增 BAT-SCOPE-01 勘誤。BAT-R2-02 是未影響運算的保守下界措辭。 |
| exact-fixtures | 100 | PASS | 新舊 fixtures.json 匿名 HTTP bytes 與 Git blob 完全一致，SPEC 的算式、界限、首錯與控制器契約 bytes 相同。可沿用先前固定候選的 40/40 獨立驗算與原 31 筆保留證據。 |
| provenance-and-scope | 100 | PASS | PR #318 新 head 的唯一 parent 為舊 4ffb54a。GitHub 增量 diff 僅兩檔，四檔 raw bytes 校驗 Git blob。r1627 原 owner、維護 owner、claim 與三項 rubric 讀回相同。 |

## 阻擋項複核

第 25 行現在明定轉換器損耗不在模型內，DoD 只控制納入估算的額定電量比例。以 30 Wh 額定輸出和 10 W 負載為例，預設 DoD 得 180 分鐘。舊句若被理解為再填 DoD 80% 來估轉換損耗，會得到 144 分鐘。新範圍句、額定端提示及兩語 FAQ 給出一致指示。 [範圍](https://github.com/KYStr/glossquote-labs-home/blob/75ecdbdff3c5b3b8e2d5c097df517c6a75466776/docs/specs/battery-runtime-calculator/SPEC.md#L25) · [輸入契約](https://github.com/KYStr/glossquote-labs-home/blob/75ecdbdff3c5b3b8e2d5c097df517c6a75466776/docs/specs/battery-runtime-calculator/SPEC.md#L97) · [兩語 FAQ](https://github.com/KYStr/glossquote-labs-home/blob/75ecdbdff3c5b3b8e2d5c097df517c6a75466776/docs/specs/battery-runtime-calculator/SPEC.md#L225)

AUTHOR-CHECK 的既有 bytes 全保留，附加一行 BAT-SCOPE-01 勘誤。BRIEF 和 fixtures 逐 bytes 相同。SPEC 只換一行，其他章節逐 bytes 相同。 [作者勘誤](https://github.com/KYStr/glossquote-labs-home/blob/75ecdbdff3c5b3b8e2d5c097df517c6a75466776/docs/specs/battery-runtime-calculator/AUTHOR-CHECK.md) · [增量 diff 與精確讀回](scope-evidence.json)

## 沿用數值證據

沿用舊 head 獨立驗算的 40/40、exit 0、原 31 筆保留及安全整數邊界證據。新舊 fixture Git blob 均為 `2de34cd609afe606635be3e835af451432d016c9`。舊 head 的 spec-corrections 84 分及退修紀錄保持為歷史證據。 [原報告](../REVIEW.md) · [逐筆驗算](../fixture-results.json) · [重現方式](../../REPRODUCE.md)

## 非必要改善

BAT-R2-02 仍是措辭改善。實際可輸入的最小 DoD 為 10⁻⁵%，文件使用的 10⁻⁶% 屬保守下界，對運算及 RESULT_LIMIT 無影響。

目前維護 task 在讀回時為 working。正式 registry review、映射、ready 及產品驗收均為 NOT_RUN。 [機器報告](review.json) · [manifest](manifest.json)
