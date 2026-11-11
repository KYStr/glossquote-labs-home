# FH-spec-review-05 獨立規格審查交接

五份固定草案均須退修，ready 建議 0。五個 Node 驗算命令 exit 0，120 筆字面結果吻合。其中間歇計時器的 6 筆狀態結果依作者說明重建，完整轉換契約驗證仍是 NOT_RUN。

交接前讀到遠端登記冊 r1545。五件均維持原 owner 與候選，PR 開啟，規格仍為 draft。spec.acceptanceCriteria 五筆均登記為原規格製作 task 的八節，缺 production 繼承用的九面向（REG-01）。間歇計時器固定 SPEC 也缺 §acceptance。 [初讀證據](remote-readback.json) · [交接讀回](handoff-readback.json)

| 固定 PR | Fixture 相符 | 文件問題 | 證據 |
| --- | ---: | --- | --- |
| #253 | 31 | 合法極端輸入造成反推容量和總分鐘失真，額定電壓配對與反推文案需修正。 | [REVIEW.md](battery-runtime-calculator/REVIEW.md) · [review.json](battery-runtime-calculator/review.json) |
| #254 | 20 | FAQ 公式與日文計數說明、作者 U+10000／U+20000 字面、預設速率依據需修正。 | [REVIEW.md](reading-time-estimator/REVIEW.md) · [review.json](reading-time-estimator/review.json) |
| #255 | 28 | 與既有圖片列印工具重疊，長寬比與 PPI 語義及 200 分級反例需處理。 | [REVIEW.md](photo-print-size-calculator/REVIEW.md) · [review.json](photo-print-size-calculator/review.json) |
| #256 | 20 | 與既有名單分組工具重疊，同名成員不可辨識，重現條件和每組上限文案有缺。 | [REVIEW.md](group-generator/REVIEW.md) · [review.json](group-generator/review.json) |
| #257 | 21 | 固定 SPEC 在狀態轉換表截斷，聲音提示範圍待釘版。 | [REVIEW.md](interval-timer/REVIEW.md) · [review.json](interval-timer/review.json) |

各報告附驗算程式、逐筆輸入／獨立預期及命令 exit。產品九項檢查與 GitHub ACK／正式 review 保持 NOT_RUN。退修與登記維護由主統籌接續。

[重現步驟與固定 fixture](REPRODUCE.md) · [證據 manifest](manifest.json)
