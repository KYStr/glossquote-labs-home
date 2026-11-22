# 含稅未稅換算 — 維護作者檢查

本次維護任務 `labs-five-hour-repair-tax-20261111`。以獨立 maintenance claim 修正文件，等待非作者驗收。產品、部署及正式站檢查均為 NOT_RUN。

## 固定來源與修訂

原作者與 owner 為 `cloud-dot`，原 task `labs-tax-included-converter-spec-20261109`。原 SPEC、作者檢查和其他原檔可從 [PR #242 固定來源](https://github.com/KYStr/glossquote-labs-home/tree/21410d31a0d51098e6bc71ede98cc36e9b841f72/docs/specs/tax-included-converter) 讀取。 [本次固定派工簡報](https://github.com/KYStr/glossquote-labs-home/blob/8040cc2dfbbfb40c2ac587133d1c03578deab224/docs/reviews/five-hour-2026-11-11/dispatch/repair-tax/TASK.md) · [具名初審](https://github.com/KYStr/glossquote-labs-home/blob/8040cc2dfbbfb40c2ac587133d1c03578deab224/docs/reviews/five-hour-2026-11-11/dispatch/repair-tax/initial-review/tax-included-converter/REVIEW.md)

| 原檔 | Git blob | bytes |
| --- | --- | ---: |
| BRIEF.md | `469eea98e05c5ed6cc366b43c44bf2e5d9c58008` | 1492 |
| SPEC.md | `c3df531a322a7dbf13979fdced0a1e9711ff2897` | 7626 |
| AUTHOR-CHECK.md | `ec1cd95c2883e39ab59397c8799b5904c88b1946` | 4306 |
| fixtures.json | `cf3af0af32669698725e52f4b1c921b4503b610a` | 8927 |

四檔先從固定 GitHub 版本按 bytes、Git blob SHA-1 與 SHA-256 逐一核對，於取得本次 claim 並讀回 start 後原樣複製至候選路徑。確認複本逐 byte 相符後才改。歷史作者聲稱的完整八節以固定實際內容為準，原 SPEC 只有前三節及截斷的第四節。TAX-01 以 [完整八節](SPEC.md) 補正，新增完整錯誤優先序、資料生命週期、雙語、固定下載及未來產品九面向。

TAX-02 保留單筆含稅先捨未稅的歷史三元組，明訂用於報價和填票前估算。畫面及 JSON 保留正算總額與有符號差額。財政部來源於 2026-11-11 複查，適用範圍、法規版本與連結見 SPEC scope。

## 字面案例和命令

候選 [fixtures.json](fixtures.json) 共 **58 筆**。離線 Python 3.12.5 以精確分數與狀態模型核對字面結果，48 核心、7 控制器、3 匯出均通過；未匯入產品程式。原 25 筆輸入及 ID 逐一比對，21 筆完整 expected 相同。下列四筆原未稅／稅／含稅維持原值，新增正算欄；原 shape 沒有這兩欄。字面 fixtures SHA-256 為 `2e23c652e92618e044fc642095c0be6f13d7dea1d72f2dc1217869ea3eda175a`。

| 案例 | 前後均相同的三元組 | 新增 forwardGross / forwardDifference |
| --- | --- | --- |
| gross-basic | 100000／5000／105000 | 105000／0 |
| gross-round-up | 9523／476／9999 | 9999／0 |
| gross-one-dollar | 1／0／1 | 1／0 |
| rate-decimal-gross | 924／76／1000 | 1000／0 |

兩個反例保留獨立算式。10 元、5% 的精確未稅 200/21，整元估算未稅 10、稅 0；10 元正算稅 1、含稅 11，差 +1。13 元、4% 的精確未稅 12.5、精確稅 0.5，未稅先捨得 13／0／13，正算含稅 14，差 +1；先捨稅額則得 12／1／13。另有 99 元、0.51% 的負差案例，估算未稅 98，正算含稅 98，差 −1。

| 報告字面 bytes | bytes | SHA-256 |
| --- | ---: | --- |
| export-gross-10 | 291 | `a0ccf20ca1ed1aecb0fdd55d0fc5f28530e611ec4ffac77696bf724a0f165f16` |
| export-gross-13 | 291 | `f914a17f6812dc46ce7daf501ed3adb4b678526a8e00fa43cb6dba1b3f40d586` |
| export-lines-difference | 458 | `9b73c5bfc922673877856184a283b2bba9da5e170af6f5a57f0f6391b55660f9` |

實際本地命令為在 repair-tax 任務目錄執行 `python -B -X utf8 evidence/verify-document.py`，exit 0。八個 headings、九個產品 ID、25 筆歷史 fixture 差異、58 筆字面結果與三份精確報告 bytes 皆已核對。逐案證據及命令檔在維護交接包；瀏覽器、DOM、實際下載、網路與儲存、正式 SEO、產品分數均未執行或評定。

REG-01 仍是登記依賴。現行原 spec 條目以八個文件面向供 production 繼承，未看到引用該 spec 的 production task。主統籌須合法補正並讀回，非作者須核對新固定候選及八節完成度，再進 ready。這份作者檢查提供自檢證據，不具獨立驗收效力。
