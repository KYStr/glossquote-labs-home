# 成本與財務工具預案獨立審查（FH-spec-review-03）

**五份固定候選均建議修訂，零份可標 ready。** 已核對 20 檔 Git blob，118/118 個字面案例相符；含稅 25 案依殘存規格與作者說明重算，儲蓄有兩個字面結果另經實際付款重算發現語義錯誤。產品、瀏覽器與部署均 NOT_RUN。

初讀 registry r1530，交接前讀回 r1544（2026-11-11 03:03:55 UTC），五份 PR 仍開啟，head、原 owner、claim、預案面向與 draft/reviewing 狀態相符。沒有相同 specId 的 production task。

| 固定 PR | 報告 | 字面案例 | 修訂重點 |
| --- | --- | ---: | --- |
| [#240](https://github.com/KYStr/glossquote-labs-home/pull/240) | [breakeven-calculator](breakeven-calculator/REVIEW.md) | 21/21 | NO_MARGIN 退化情況錯誤，2.675% 不能區分兩種精確 tie 捨入。 |
| [#242](https://github.com/KYStr/glossquote-labs-home/pull/242) | [tax-included-converter](tax-included-converter/REVIEW.md) | 25/25 | 固定 SPEC 中途截斷；整元含稅逆算可能與正算差一元。 |
| [#243](https://github.com/KYStr/glossquote-labs-home/pull/243) | [markup-margin-calculator](markup-margin-calculator/REVIEW.md) | 35/35 | 捨入後售價可能不達目標率；零售價的毛利率未定義。 |
| [#244](https://github.com/KYStr/glossquote-labs-home/pull/244) | [stock-profit-calculator](stock-profit-calculator/REVIEW.md) | 16/16 | 零股當沖與報價跳動限制；全域最小保本價、精確分值需釘版。 |
| [#245](https://github.com/KYStr/glossquote-labs-home/pull/245) | [savings-goal-calculator](savings-goal-calculator/REVIEW.md) | 21/21 | 與 #44/#80 的雙目標模式重疊；末月餘額與正利率超期算法需修。 |

五份共用 REG-01：spec 登記的八項文件面向會被 production 強制繼承，和九產品面向不符。維持原作者 task 的八項，只由主統籌處理規格登記的生產 rubric，且新候選修訂後另審。

每份報告旁有 `review.json`、`verify.py`、`fixture-output.json`。驗算採 Python 3.12 內建函式庫、exit 0，只讀已核對的固定 fixtures。離線驗算前後的 Windows 持久環境一致。公開紀錄只保留檢查結果。見 [環境檢查](environment-guard.json)。

這份提交保存五份固定文件候選的審查證據。registry 的本人 ACK 與退修登記等待主統籌安排串行時段。

[交接資料](checkpoint.json) · [SHA-256 清單](manifest.json)
