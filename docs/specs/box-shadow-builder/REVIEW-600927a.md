# Box Shadow Builder：固定候選規格完整度審查

候選：[600927aad37872a47d1507f380066c103ba8f025](https://github.com/KYStr/glossquote-labs-home/tree/600927aad37872a47d1507f380066c103ba8f025/docs/specs/box-shadow-builder)，[draft PR #8](https://github.com/KYStr/glossquote-labs-home/pull/8)。
結論：**revision required，尚不可 mark-spec-ready**。本次是非作者文件完整度審查，沒有產品實作、原生測試或品質分數。

## 固定文件與方法

- SPEC.md：35243 UTF-8 bytes，SHA-256 `2ab92141f3c5985746f536a14a2b8a9fcbccc71718c54b6e3e16d2016ead90de`。
- AUTHOR-CHECK.md：4264 bytes，SHA-256 `2060a896a6bd37fbf3795013d079872902edaf628ae4062ff7f7d765f3482bd4`。
- [原 brief](https://github.com/KYStr/glossquote-labs-home/blob/368fb4ba06b884bc126d0186355d197efc90b285/docs/specs/box-shadow-builder/BRIEF.md)：5421 bytes，SHA-256 `61509d91a6b8662de04ae45fa4a3c8789a32309cad69d97f78a2d1a4d27943c0`；候選所含 brief 同 bytes。
- 親讀三份完整文件；按固定章節核契約一致性、精確輸出、邊界和交接，不以標題存在當作通過。獨立計算單層樣例為228 bytes，四個最長合法 token 組成的完整 CSS 為411 bytes，均小於1024。這是文件算術，不是產品測試。

以下行號皆指固定候選 [SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/600927aad37872a47d1507f380066c103ba8f025/docs/specs/box-shadow-builder/SPEC.md)。

## 八節逐項證據

| 項目 | 完整 | 固定證據與結論 |
| --- | --- | --- |
| goal | true | §1，L7–22：受眾、陰影幾何問題、明示假設及六個可觀察成功條件；沒有虛構需求研究。 |
| scope | true | §2，L24–50：1–4層、排除任意CSS/圖像/遠端功能；固定相近規格對照。核 Color Palette 的單色/對比輸出、Gradient 的角度/停止點背景、Image Overlay 的點陣比較，與本件幾何/內外陰影用途不同，不轉移既有責任。 |
| userFlow | false | §3有初始、排序、修錯、取出及取消流程；但L75的URL即時撤銷與L167的下載接收保障相衝，見R1。 |
| inputsOutputs | false | §4，L99–167：raw/schema、首錯優先、合法端點、alpha、三行CSS及MIME/檔名清楚；URL生命週期仍有R1矛盾，尚不能給完整true。 |
| implementation | true | §5，L169–203：core/controller/app分層、Node24零依賴、固定CSSOM出口/CSP、預覽幾何、雙語及可及性實作順序可執行。此true不抵銷跨節R1，也不代表程式已存在。 |
| acceptance | true | §6，L205–221：九項未來產品面向各有方法、成功觀察、證據與不可替代界線；必要原生/輔具未測保持NOT_RUN，不從文件推導產品90分。 |
| tests | false | §7列T01–T11/B01–B08、獨立expected、端點及正常原生流程；T09 L245照搬即時撤銷，未提供與R1保障一致的快速連續操作期望。 |
| handoff | true | §8，L277–305：固定commit/PR、非作者八布林、同ID修訂與另production claim明確；文件ready與task數值accepted、產品品質、發布分開。 |

## R1：下載URL的相互衝突生命週期

位置：L75、L167、L245（另與L97生命週期清理相關）。

文件要求編輯後立即撤銷舊URL、每次顯式下載先撤銷前一個，同時又要求不得在正常瀏覽器尚未接收下載前撤銷。文件沒有定義可觀察的下載接收ACK；把30秒當最長存活時間也沒有解開立即撤銷分支。

可反駁的文件時序：
1. 有效快照S提出下載U。
2. 接收完成尚未被契約確認時，使用者立即編輯或再按下載。
3. L75/L167/T09要求立刻revoke U；L167的另一要求卻禁止此刻提前撤銷。
4. 實作者無法同時滿足兩者。這是規格內部矛盾及風險推導，**不是已實測瀏覽器下載失敗**。

最小修訂方向：分離「目前結果及新取出權」和「已提出下載的有限URL lease」。可以保留原單一URL/30秒上限：lease存活時禁新下載；編輯、重新產生或清除撤掉結果/新取出權，但不提前回收已啟動lease；離頁/hidden/dispose的強制purge例外及可能影響明確說明。這是可採用方向，不要求增加URL上限、下載功能或新的服務。

同步修訂§3、§4.4及T09：加入下載後立即編輯、重新產生、清除、連按、到期、舊timer與離頁的明確expected。不能以一個正常下載成功個案證明所有快速操作可靠。原生能力仍需未來產品的真實檔案證據。

## 保留的正確內容與後續

CSS幾何/內外繪製平面、同平面先列在前、正偏移inset可見左上內帶、不以模糊像素逐位元作跨瀏覽器保證，與固定 [W3C CSS Backgrounds and Borders 3 §6.1](https://www.w3.org/TR/2024/CRD-css-backgrounds-3-20240311/#box-shadow)相符。沒有理由變更這些契約或其他數值邊界。

原作者沿同 spec ID 窄修，保留本候選與本報告，固定新commit及兩文件hash後依原協議重新提交。複審只核受影響段與其餘精確差異；通過八節布林才可合法ready。不填虛構數值分數、不合併PR或部署。
