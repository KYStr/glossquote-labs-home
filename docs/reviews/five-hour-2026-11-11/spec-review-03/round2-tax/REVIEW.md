# 含稅未稅換算維護複審

三個維護面向均達通過門檻，建議在作者正式交驗同一候選後接受本次文件維護。固定候選為 `9dde67ee408491dbfcef0cbadbb6a7f1a876bd02`。 [PR #297](https://github.com/KYStr/glossquote-labs-home/pull/297)

維護任務 `labs-five-hour-repair-tax-20261111`。本人 `local-codex:01a1c87c-f22f-76f1-9e00-dcb0b0b55486` 未參與候選製作。r1581 核對作者的 ACK、register、claim、start、原任務 owner 及候選引用。維護任務仍為 `working`。 [來源與承接證據](provenance.json)

| 維護面向 | 分數 | 獨立證據 |
| --- | ---: | --- |
| spec-corrections | 98 | TAX-01 的截斷已補齊八節及九個未來產品面向。TAX-02 的兩語估算、正算差額及 purpose:estimate 已寫進流程和下載契約，財政部一級來源與適用界線已重讀。 |
| exact-fixtures | 100 | 獨立 BigInt 核對 58/58。原 25 案例的輸入與 ID 保留，21 個 expected 不變，四個 gross 只增正算比較。重算 +1、+1、−1 三反例、首錯、晚到／逾時、三個下載字面及雙向抽樣。 |
| provenance-and-scope | 99 | 公開 PR #297 差異只含指定四檔。原 4 檔和候選 4 檔核對 bytes、Git blob、SHA-256。r1581 原候選與原 owner 保留，維護 claim 及四個 maker 事件相符。 |

原固定 `SPEC.md` 為 7,626 bytes，停在第四節的第一條模式驗證。新固定 `SPEC.md` 為 25,598 bytes，八節完整，釘定欄位驗證順序、兩語估算、Worker 世代與資料生命週期、固定 JSON、SEO、離線命令與九個產品驗收面向。

| 含稅輸入 | 估算未稅／稅額／含稅 | 正算含稅 | 差額 |
| --- | --- | ---: | ---: |
| 10 元，5% | 10／0／10 | 11 | +1 |
| 13 元，4% | 13／0／13 | 14 | +1 |
| 99 元，0.51% | 98／1／99 | 98 | −1 |

前兩筆相鄰未稅正算分別跳過 10 與 13。13 元案例若改成稅額先捨，會得 12／1／13。候選明示這是整元報價估算，下載保留 `purpose: "estimate"`、正算及有符號差額。

已讀第 10、14、32 條和預設稅率問答，並核對非營業人當期發票總額申報的第 32-1 條及整除例示。 [營業稅法](https://law-out.mof.gov.tw/LawContent.aspx?id=FL006082) · [財政部稅率問答](https://www.etax.nat.gov.tw/etwmain/tax-info/innotative-tax-e-reference/filing/business-tax/wMDMRl7) · [施行細則](https://law-out.mof.gov.tw/LawContent.aspx?id=FL006083) · [南區國稅局例示](https://www.ntbsa.gov.tw/singlehtml/5e0e49a811b74b50b5a6486d38374285?cntId=7074381e864443b4b9f9aa5ec43c80ca)

`node verify.mjs <candidate-tax-spec-directory> <original-tax-spec-directory>` 執行 exit 0。48 個核心、7 個控制器和 3 個匯出字面均相符。另驗 27,775 組含稅回推差額、27,775 組可正算輸入的精確往返及 7 個額外探針。三個下載字串的 bytes 和 SHA-256 與字面案例相符。 [驗算腳本](verify.mjs) · [逐案證據](fixture-output.json)

原 spec 的生產驗收面向登記問題 REG-01 仍待主統籌處理。產品、瀏覽器、實際下載及正式站檢查為 NOT_RUN。 [機器可讀複審提案](review-proposal.json)

重跑時以兩個固定版本的四個規格檔所在資料夾當作參數。 [維護候選固定檔](https://github.com/KYStr/glossquote-labs-home/tree/9dde67ee408491dbfcef0cbadbb6a7f1a876bd02/docs/specs/tax-included-converter) · [原候選固定檔](https://github.com/KYStr/glossquote-labs-home/tree/21410d31a0d51098e6bc71ede98cc36e9b841f72/docs/specs/tax-included-converter)
