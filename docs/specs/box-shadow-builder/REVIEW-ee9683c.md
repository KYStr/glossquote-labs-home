# Box Shadow Builder：r2 受影響規格複審

固定候選：[ee9683cb60a4823e14768a26e24b782f59c6acac](https://github.com/KYStr/glossquote-labs-home/tree/ee9683cb60a4823e14768a26e24b782f59c6acac/docs/specs/box-shadow-builder)，[draft PR #8](https://github.com/KYStr/glossquote-labs-home/pull/8)。

結論：**原 R1 文件矛盾已修正；八節完整度均為 true，可依協作核心登記 spec ready。** 這不是產品 accepted、產品品質分數、原生下載成功、PR 核准、合併或部署。

## 固定來源與檢查範圍

- SPEC.md：37,635 UTF-8 bytes，SHA-256 `4befa00eed81e5510ffa1996f2fe26247514572de2277a902e8761a6de76ae6f`。
- AUTHOR-CHECK.md：5,748 bytes，SHA-256 `1e83f949354d28ce273991153e56ae0d800500ee5c5a7b31ad8396634e1f0323`。
- 原 [600927a 獨立報告](https://github.com/KYStr/glossquote-labs-home/blob/1da9b9b8d51ab56f50b32fa654fc97173b9d05b2/docs/specs/box-shadow-builder/REVIEW-600927a.md) 及候選保留；[brief](https://github.com/KYStr/glossquote-labs-home/blob/368fb4ba06b884bc126d0186355d197efc90b285/docs/specs/box-shadow-builder/BRIEF.md) 未換。
- 本人仍為原非作者，親讀 r2 固定文件受影響段、完整作者查核及原 R1 報告。遠端兩文件 bytes/hash、PR head 與重交候選相符。
- 接續已完成的差異查核收據，不重跑其相同作業：SPEC 只有八個單行替換（L4、75、89、93、97、167、245、265），反向零 fuzz 還原 r1 exact；第6節九面向表原樣。本輪另對這些段落及相鄰條款進行獨立語義與時序判斷。保留原完整審查已核且未變的內容，不冒稱重做整份。
- 本報告放在獨立審查分支，該分支旁邊的 SPEC 是歷史 r1；**待實作規格必須使用上述固定 ee9683 候選，不能誤用審查分支旁邊檔案**。

下列行號均對應 [r2 SPEC](https://github.com/KYStr/glossquote-labs-home/blob/ee9683cb60a4823e14768a26e24b782f59c6acac/docs/specs/box-shadow-builder/SPEC.md)。

## R1 修正的可反駁時序

| 事件 | r2 明定的結果 | 固定位置 |
| --- | --- | --- |
| 有效快照 S 首次顯式下載 U | 先鎖住新下載；一個 URL、一個獨立 lease，原期限30秒 | L89、L167 |
| 下載後立即 edit、確認清除或重新產生 | 舊結果／新取出權立即失效；已提出 U 不提前撤銷、不替換、不續期。有效新結果可以複製，但 lease 活著不能再下載 | L75、L89、L93、L167 |
| 連按或直接呼叫 handler | lease 存活時不建立第二 URL、不排隊、不重新 click 下載；不能只靠 disabled 外觀 | L167、T09 L245 |
| 到期但沒有有效新結果／有對話框／頁面不可用 | 撤銷該 URL；不得復活結果或無條件開放新下載 | L167、L245 |
| 第二個 lease 後第一個 timer 晚到 | timer 只能終結它自己的 token；不能撤銷新 URL、覆寫新狀態 | L167、L245 |
| hidden、pagehide、dispose 或語言離頁 | 明示強制 purge 例外；可能中止尚未接收下載，不宣稱 OS 完成或取消 | L97、L167、L265 |
| Blob／URL／下載 click 拋錯 | 撤銷已建 URL、解除失敗 lease；保留有效結果供選取或顯式重試 | L167、T10 L247 |

這些是**文件契約推演，不是執行產品測試**。原矛盾中的「必須等不可觀察的接收 ACK 才能 revoke」已移除；30秒只是有界保留期，與提前 purge 例外及可見提醒共同定義可實作行為。沒有把有限保留宣稱成所有瀏覽器下載的成功保證。結果 generation 與 lease token 分離也不放寬舊結果失效規則。

## 八節完整度證據

| 項目 | 完整 | 依據 |
| --- | --- | --- |
| goal | true | §1 L7–22 未變，原審已核受眾、問題、假設及可觀察成功條件；本修正仍服務同一取出流程。 |
| scope | true | §2 L24–50 未變，仍1–4層、原幾何/模式與排除項；沒有加多 URL、排隊、服務或接走相近工具責任。 |
| userFlow | true | §3 L52–97；L75/89/93/97 已分清正常編輯、取出、確認清除、取消及離頁例外。原 R1 所阻擋的快速操作現在有一致結果。 |
| inputsOutputs | true | §4 L99–167；原 raw/schema/端點/精確CSS/MIME/檔名未變，L167 明定單 lease、固定期限、入口 guard、舊 token 及失敗清理，無不可觀察 ACK 要求。 |
| implementation | true | §5 L169–203 未變；原 core/controller/DOM、Node24零依賴、CSSOM/CSP與雙語可及性分工仍適用。新增 lease 是控制器有界狀態，不改產品架構。 |
| acceptance | true | §6 L205–221 九面向表逐字未變；真 UI、下載 bytes、隱私/安全、可及性、雙語、工具鏈、桌面能力等必要實證均保留，未測仍 NOT_RUN。 |
| tests | true | §7；T09 L245 補立即 edit/clear/regenerate/連按/到期/晚 timer 及真 handler guard；B06 L265 要正常下載檔案實讀及快速操作觀察，T08/T10/B07 原錯誤與生命週期仍適用，不以 mock 當原生成功。 |
| handoff | true | §8 L277–305 未變；固定 commit、原作者同 ID 重交、不同 reviewer 八布林及另 production claim 順序明確，文件 ready 與 task 數值 accepted／產品驗收分開。 |

## 非阻擋註記及後續邊界

L167 有 literal `\n\n` 字樣，屬 Markdown 分段排版瑕疵；三段文字仍完整、可讀，沒有改變期限、purge 或 token 契約，不以此擴大完成門檻或暗改固定候選。

原九項產品品質面向及各項至少90的未來驗收要求完全保留。本輪沒有產品程式、瀏覽器、剪貼簿、下載檔案或輔具實測；不填文件八個虛構90分。原作者任務可以保留 reviewing／acceptance null，獨立以 `mark-spec-ready` 登記八節真實完整度。後續製作仍須合法登記／claim、完成真實產品證據及非作者品質審查。
