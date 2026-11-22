# 含稅未稅換算：固定預案獨立審查

- 任務：`labs-tax-included-converter-spec-20261109` / `spec-tax-included-converter-20261109`
- [PR #242](https://github.com/KYStr/glossquote-labs-home/pull/242)：open / draft；head `21410d31a0d51098e6bc71ede98cc36e9b841f72`；registry r1530 blob `e01da965f28e5248ca13158094ca356254a25c2b` 的 submission 相符。
- 審查者：`local-codex:01a1c87c-f22f-76f1-9e00-dcb0b0b55486`。本人未參與候選製作；與原作者、owner 及 contributors 核對。原 claim：`muse-r4-tax-included-conve-claim-20261109T152407Z-ea945`；owner `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory` 保留。
- 完成時間：`2026-11-11T02:51:54Z`。文件結論：**FAIL / revision**；修訂後重審；不要標記 ready。 Registry 寫入等待串行時段。

Windows 背景離線文件審查。25/25 指現有 fixtures 符合殘存規格與 AUTHOR-CHECK.md 所述算法；缺失規則仍未驗。下方九面向是共用追蹤欄位，固定候選的 acceptance 節缺失。產品程式、瀏覽器、下載、Network/Storage、正式 SEO 及部署均未執行。

## 固定來源與驗算

| 檔案 | Git blob | bytes |
| --- | --- | ---: |
| [BRIEF.md](https://github.com/KYStr/glossquote-labs-home/blob/21410d31a0d51098e6bc71ede98cc36e9b841f72/docs/specs/tax-included-converter/BRIEF.md) | `469eea98e05c5ed6cc366b43c44bf2e5d9c58008` | 1492 |
| [SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/21410d31a0d51098e6bc71ede98cc36e9b841f72/docs/specs/tax-included-converter/SPEC.md) | `c3df531a322a7dbf13979fdced0a1e9711ff2897` | 7626 |
| [fixtures.json](https://github.com/KYStr/glossquote-labs-home/blob/21410d31a0d51098e6bc71ede98cc36e9b841f72/docs/specs/tax-included-converter/fixtures.json) | `cf3af0af32669698725e52f4b1c921b4503b610a` | 8927 |
| [AUTHOR-CHECK.md](https://github.com/KYStr/glossquote-labs-home/blob/21410d31a0d51098e6bc71ede98cc36e9b841f72/docs/specs/tax-included-converter/AUTHOR-CHECK.md) | `ec1cd95c2883e39ab59397c8799b5904c88b1946` | 4306 |

本地檔案的 Git blob SHA 與遠端固定檔案逐一相符；SHA-256 詳見 [review.json](review.json)。作者核對已讀，未當作獨立驗證。

`python -B -X utf8 verify.py <fixed-candidate>/docs/specs/tax-included-converter/fixtures.json`：exit **0**，**25/25** 個字面案例符合。 [獨立驗算](verify.py) / [全部字面 input、fixture expected、獨立結果、額外反例](fixture-output.json)。

## 八個文件面向

| 面向 | 分數 | 完整 | 依據 |
| --- | ---: | --- | --- |
| `goal` | 92 | PASS | §goal：接案者／小商家從含稅價分拆三個金額；桌面報價與手機即場核對。使用填票前估算情境；逆算與填票契約的區隔需補（TAX-02）。 |
| `scope` | 93 | PASS | §scope：整元、雙向單筆、總額與逐項差，排除實際開票／申報、免稅判定及其他稅制。#242 與登記的所得稅、發票對獎不同；財政部核實一般稅額 5%。 |
| `userFlow` | 88 | FAIL | §userFlow 可見模式、樣例、dirty、取消、reset、切語與焦點；所引估算常駐提示在不存在的 tests 節，不能核對 gross 回推是否告知相差一元（TAX-01/02）。 |
| `inputsOutputs` | 65 | FAIL | §inputsOutputs 在第一條 mode error 半句截斷。資料形狀及金額上限有寫；其他驗證順序、完整錯誤、輸出與捨入契約不在 SPEC（TAX-01/02）。 |
| `implementation` | 0 | FAIL | 固定 blob 沒有 implementation 節。可用 BigInt 離線算術是審查推論，不能用作者描述填補 Worker、清理、CSP、下載格式或命令契約。 |
| `acceptance` | 0 | FAIL | 固定 blob 沒有 acceptance 節。PR／作者聲稱有九項，無法核實其固定 ID、證據、分數門檻及候選 noindex/正式 SEO。 |
| `tests` | 82 | FAIL | 25 個字面案例可依殘存契約和作者說明獨立重算；SPEC 無 tests 節，缺 gross 切換一元落差測例、固定序列化和必要候選驗證。 |
| `handoff` | 58 | FAIL | BRIEF 有 tools/ 路徑和大致交付順序；SPEC 缺 handoff，沒有固定實際命令、里程碑與交驗／停止要求。 |

產品九面向 **NOT_RUN**（無產品分數）：`functionality`、`boundaries`、`privacy`、`security`、`usability`、`accessibility`、`localization-seo`、`toolchain-provenance`、`compatibility`。

## 一級來源

- [財政部稅務入口網：營業稅稅率](https://www.etax.nat.gov.tw/etwmain/tax-info/innotative-tax-e-reference/filing/business-tax/wMDMRl7)：實際讀取核實一般稅額計算的現行稅率為 5%，法定區間 5% 至 10%；不是第 14 條訂為 5%。
- [加值型及非加值型營業稅法第 14、32 條](https://law-out.mof.gov.tw/LawContent.aspx?id=FL006082)：銷項稅額按銷售額計算並四捨五入到元；區分營業人、非營業人開票的列示方式。
- [南區國稅局：定價含稅，買賣雙方都安心](https://www.ntbsa.gov.tw/singlehtml/5e0e49a811b74b50b5a6486d38374285?cntId=7074381e864443b4b9f9aa5ec43c80ca)：三聯式情境分列銷售額與銷項稅額。官方 NT$52,500 範例整除，無法驗證半元情況。
- [施行細則第 32-1 條](https://law-out.mof.gov.tw/LawContent.aspx?id=FL006083)：非營業人、當期發票總額申報另有先捨入銷項稅額的規則；此案排除申報，不能把它當作三聯式單筆算法。

## 阻止放行的問題

### TAX-01 — SPEC.md 固定 Git blob c3df531a322a7dbf13979fdced0a1e9711ff2897

- 最小輸入：`{"operation":"讀固定 21410d31a0d51098e6bc71ede98cc36e9b841f72 的 SPEC.md","bytes":7626}`。
- 候選： 第 1 條 mode 驗證半句後以 `...[truncated 9113 chars]` 結束；只有 goal/scope/userFlow/inputsOutputs 四個 headings，第四節不完整。GitHub fetch_blob 和本地 SHA 確認是候選內容本身。
- 獨立預期： 發布真正完整的同 ID 規格；八節及 §userFlow 引用的結果提示可定位，明示所有輸入／錯誤／輸出、Worker/匯出／隱私、雙語 SEO、九面向、驗收命令和交接。
- 修訂驗證： 同 PR 新 head 四檔逐一核對、八節重讀、重新確認 25 個現存 fixtures 與新增邊界；別用 AUTHOR-CHECK 的聲稱當正文。

### TAX-02 — §goal 的三聯式使用情境、§scope 整元；AUTHOR-CHECK.md 含稅回推釘版

- 最小輸入：`{"mode":"single","basis":"gross","amount":"10","ratePercent":"5","lines":null}`。
- 候選： 作者的 net-first 得 (未稅 10、稅 0、含稅 10)，但同值用第 14 條所述從銷售額正算得 10×5%→稅 1、含稅 11。未稅 9 則含稅 9，沒有符合這個離散模型的整元前像。自訂 4%、含稅 13 時，精確未稅 12.5、精確稅 0.5，先捨未稅和先捨稅額得到不同三元組。
- 獨立預期： 以修訂契約釘版處理無法往返的輸入：明確標為整元估算並告知正算差額、不保證可直接填票，或在填票用途提供可辨識的無解／不一致狀態。區分單筆報價估算、營業人發票列示與非營業人申報規則；不得把未稅先捨說成通用法定回推。
- 修訂驗證： 新增 NT$10/5% 與 NT$13/4% 的字面案例，重算正反結果，核對兩語提示。


## 非阻塞改善

- 固定 5% 的查核日期與來源連結一併列在備註，避免離線頁的『現行』文字在稅率變更後被誤讀。

## 生產驗收繼承契約：FAIL（REG-01）

原製作規格 task 的八項是本次文件評分欄位，這是正確的文件 rubric。遠端 r1530 的 spec.acceptanceCriteria 也逐項填了相同八項：`goal`、`scope`、`userFlow`、`inputsOutputs`、`implementation`、`acceptance`、`tests`、`handoff`。固定 SPEC 的 §acceptance 缺失，不能猜其正式九項；目前八項明確是文件評分面向。 [核心 register-task](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/scripts/coordination-core.mjs#L287) 要求 production 原樣繼承 spec.acceptanceCriteria。目前未找到引用該 specId 的 production task。**不可標 ready 或照錯誤 rubric 開工**；由主統籌依合法維護流程修復並讀回。不改原 task 的八項、作者或 claim，也不影響上列 fixtures 結果。
