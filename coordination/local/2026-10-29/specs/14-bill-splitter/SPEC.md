# 分帳與墊款結算 — 既有規格保存

Task ID: `labs-14-bill-splitter` · Spec ID: `spec-14-bill-splitter`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 分帳工具產品規格

目前契約為 U14 v2（2026-10-13）。快速與進階都由每人已付自動加總，直接產生誰付給誰；不再手填總額或啟用墊款。工作區是一張共同費用結算表，由一人整理大家的付款資料，不是多人同步或逐筆帳本。新版本機程式已由primary驗證，仍須來源發布、正式部署及新版外驗；舊88f2036版本的外部通過不套用到新版。

- FR-01 金額：每人已付初值0，空白視為0，非空須≥0。每人及合計上限為99,999,999（0位）或99,999,999.99（2位），預設2位；總額由BigInt最小單位相加。全員付款0有效。只接受ASCII十進位，允許前導0及少於精度位數，兩端空白trim；拒絕正負號、逗號、貨幣符號、exponent、NaN/Infinity、超精度、.5及1.。原始金額最多32 UTF-16 units。不自動四捨五入、不用浮點金額。精度切換不改數字，不符即要求修正可見的付款欄位；合計超限也關聯可見付款欄位。
- FR-02 人員：2–50人，預設3人。建立穩定遞增id，不以姓名當key；姓名預設人員1/2/3或Person 1/2/3，使用者可編輯。trim後1–40 Unicode碼點；在trim前即拒絕ASCII控制字元、U+0085/U+2028/U+2029行分隔符及孤立surrogate，避免偽造報告行。允許重名，介面同時顯示穩定序號。新增/移除/姓名變更立即使舊結果失效。最少兩人不可移除，最多50人不可新增，均要說明原因；MVP不提供重新排序。
- FR-03 分攤：預設快速結算，每人權重1。進階分帳可選平均／依份數；份數預設1、0–1000整數，拒絕小數、科學記號、負數及空白。份數模式的總份數必須>0，即使付款合計0也不可全0份。0份者分攤0，但付款仍計入總額與應收款。切快速／平均保留份數草稿並忽略隱藏非法份數，返回份數模式才重驗。正總額按BigInt最大餘數法分配，平手依建立順序；零總額產生全0分攤。分攤和精確等於已付合計。
- FR-04 共用付款流程：兩種模式永遠顯示姓名及已付、永遠自動加總並計算結算。沒有總額輸入、paid toggle或使用者需核對的paid mismatch流程。模式共用人員／姓名／付款／精度；進階分攤方式與份數草稿另保留，快速計算不能覆寫。只驗目前模式必要資料，不輸出部分結果。
- FR-05 結算：balance=已付−應付，正數收款、負數付款。依固定人員建立順序分別排債務人/債權人，雙指標產生 min(欠款,應收) 的轉移直到全部歸零；不產生0轉移、本人轉給本人或浮點分。這是可重現的建議，不宣稱轉帳筆數最少或代為付款。顯示每人應付/已付/需收或補付，以及逐筆「甲支付乙金額」。
- FR-06 狀態：初始快速／三人已付0／無結果；明確按「算出誰付給誰」才計算。任何來源、模式、精度、人員或份數變更立即清空舊結果及報告、停用copy/download；錯誤不沿用上一筆。50人同步O(n log n)，不加假等待／取消。範例只由明確按鈕載入；快速900/300/0，進階相同付款＋份數2/1/1，載入仍需計算。
- FR-07 複製/下載：UI與兩種報告都先列逐筆結算，再列自動總額、人數、精度、各人付款／分攤／收補款及尾數規則。進階含分攤方式與有效份數；英文進階用Share，快速可用Equal share，不把加權叫平均。沒有轉帳時明說無需補款，全0明說無人付款。copy只在手勢writeText，拒絕提供手動選取；晚到成功／失敗均不可更動新revision。glossquote-split.txt固定UTF8無BOM、LF、單一末尾LF；無分享URL或自動發送。Blob最遲30秒及變更／清除／pagehide回收。
- FR-08 資料/清除：只記憶體，無storage、歷史、URL query/hash、剪貼簿讀取、遠端API或分析。清除保留目前快速／進階選擇，恢復三人已付0／份數1／平均／2位／無結果，焦點第一人姓名，同時清掉隱藏草稿。不聲稱OS抹除。切語頁面不傳遞內容，旁邊提示會清除。
- FR-09 可及性/雙語：兩語所有欄位/錯誤/结果/報告/FAQ完整；320px、200%和鍵盤能新增/移除/修改/計算/copy/download。姓名及可操作區44px目標；錯誤關聯欄位，重名仍能辨識序號；不只用紅綠表達欠款/應收。user文字以textContent/value顯示。
- FR-10 發布：同語首頁/語系導覽、static SEO、固定source/public GitHub、經主代理驗證的正式部署及外部驗收流程，依 [RELEASE](docs/RELEASE.md)。

無貨幣轉換；同一幣別、共同費用包含稅及服務費，精度由使用者選。快速讓全部參與者平均承擔整筆合計，進階按整筆合計權重分攤；沒有不同費用各自不同子群、百分比、逐筆明細或長期帳本。舊calculateBill僅內部相容，舊總額>0／可選paid的測試不是v2 UI要求。實際分層證據與NOT_RUN見 [TEST-RESULTS](docs/TEST-RESULTS.md)。


---

## 原文件 TECHNICAL.md

# 分帳工具技術契約

本機候選使用原生ESM與Node24+，無runtime依賴。檔案：public/{index.html,en/index.html,styles/tokens.css,styles/app.css,js/app.mjs,js/i18n.mjs,js/core/money.mjs,js/core/split.mjs,js/core/report.mjs}；test/{money,split,report,scaffold,release,controller,ui-contract}.test.mjs；scripts/{serve,check,build,validate,release,publish-manifest}.mjs、wrangler.jsonc及public/_headers。驗收證據與未驗項見 docs/TEST-RESULTS.md。

## U14 v2 頁面入口與純函式

- calculateQuickSettlement({precision, people:[{id,name,paid}]})：exact schema；快速固定有效權重1，完全不讀隱藏份數。
- calculatePaidSettlement({precision,mode,people:[{id,name,paid,weight}]})：exact schema；mode僅equal/shares。equal使用有效权重1；shares驗0–1000整數且總份數>0，包括total0時。
- 兩入口共用金額／姓名／id驗證，BigInt加總paid，單人及合計採相同上限。PAID_TOTAL_MAX.fieldId=people，控制器導向第一個可見paid；WEIGHTS_ZERO導向第一個可見weight，aria訊息在變更／清除時恢復。
- result含workflow、total、precision、mode、settlement=true、people的有效weight/paid/share及balances/transfers。total0時share全0、balance全0、transfers空；份數全0仍先拒絕。
- UI只有共用付款、精度、原生radio快速／進階，進階另選平均／份數。没有total或paid-toggle DOM。原生radio提供鍵盤方向鍵，不假裝ARIA tabs。兩种UI／報告都結算優先；英文進階Share不使用Equal share。

以下低階函式與舊calculateBill保留相容／回歸，不把舊手填總額介面當成目前產品入口。

- parseAmount(raw,precision,{allowZero=false,emptyAsZero=false}) -> BigInt minorUnits。precision只0/2；先trim，再嚴格regex，split('.')，尾部padEnd(precision,'0')後BigInt；在轉換前限制raw≤32 UTF-16 units，超限錯誤，與FR01上限一致。總額/已付共用函式不同flags，不用parseFloat/Number轉換金額。
- formatAmount(minor,precision,locale) -> string。先BigInt整除/餘數，整數部分可交Intl.NumberFormat(zh-Hant/en,{maximumFractionDigits:0})格式化BigInt，二位fraction左補0後'.'相接。畫面用千分位，輸入框不用千分位。不做locale-aware輸入猜測。
- splitAmount(total,weights) -> BigInt[]；total>0，weights是2–50個0..1000安全整數；Number只表示有界權重與index。
- settle(shares,paid) -> {balances:BigInt[],transfers:Array<{fromIndex,toIndex,amount:BigInt}>}。驗精確長度、非負BigInt、合計同額，輸入不mutation。off模式不呼叫settle。
- calculateBill(draft) -> result；僅舊內部相容，不由v2 app呼叫。其手填total>0／可選paid／mismatch gate僅保留舊core測試。錯誤不含使用者原始姓名。
- buildReport(result,locale) -> string；固定格式和LF；各控制消費同一result/同一函式，不用DOM innerText組報告。報告份數使用本次有效權重：平均模式一律1，不顯示隱藏的份數草稿；份數模式才用使用者份數。

## 分配的獨立可驗證算法

weights總和W>0；對每人算product=total*BigInt(weight)，base=product/W，remainder=product%W。remaining=total−sum(base)，由remainder降序、index升序排序，前remaining人各加1。remaining小於人數，零權重餘數0且不會在合法remaining範圍內額外分得錢。勿每人各自round而破壞總和。

例total=10000（100.00）、weights=[1,1,1]：base[3333,3333,3333]、remaining1，結果[3334,3333,3333]。total=1、weights=[1,1,1]結果[1,0,0]。total=10001、weights=[1,2,0]：base[3333,6667,0]，remainders[2,1,0]，結果[3334,6667,0]。

settle按人員建立順序將負balance絕對值列入debtors，正balance列creditors；取兩端min，保存正amount，扣完一端移指標。迴圈最多n−1個transfer，守恆驗證每人 paid−share + outgoing − incoming = 0。不使用未獲證明的最小筆數宣稱。

## 控制器

清楚區分原字串draft与驗證後result；先使resultRevision失效，再處理任何input/change/add/remove事件。copy/download handler重驗revision；clipboard await完成時若來源改變，舊成功與失敗通知都忽略，不更動新結果。報告view以readonly textarea或pre.textContent，可手動複製。人名不是property key；不能把__proto__等名稱放一般object key作資料分桶。

最多50人，排序可在主執行緒同步執行；不得採Worker只是為了假進度。無資產下載、匯入、持久化或網路取消情境；取消N/A需寫理由，真Blob與clipboard仍按使用者動作及資源生命週期測試。

清除保留workflow，reset三人paid0、weight1、equal、precision2，focus name-1。模式共用姓名／付款／精度；進階mode/weight保留且快速不覆寫，任何修改立即使舊輸出失效。test/quick.test.mjs覆蓋固定例、300快速＋300份數不變量、兩語報告標籤與順序；controller adapter驗證revision、拒絕fallback、Blob及欄位關聯，不當作真browser。

## 證據與參考

- [Splitwise費用分配說明](https://kb.splitwise.com/balances-and-expenses/what-are-different-ways-i-can-split-an-expense)：證明相似工作已有替代方案，不是本產品演算法或需求量的證據。
- [ECMAScript BigInt](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-bigint-objects)：整數運算；必須實測目標瀏覽器BigInt/Intl行為。
- [ECMA-402 NumberFormat](https://tc39.es/ecma402/#numberformat-objects)：顯示格式，不拿格式化字串回做算術。

最大餘數和平手規則是本產品明確決策。以固定案例及守恆不變量驗收，不用同一函式算expected。


---

## 原文件 UX-SEO.md

# 分帳工具介面與SEO

本機候選採Product App及 [設計系統](docs/DESIGN-SYSTEM.md)。金額輸入與分帳表是主體。使用清晰金額欄、對齊小數及一個主要計算動作，不用儀表板卡片、假收入數字或裝飾圖表。實測與人工缺口見 docs/TEST-RESULTS.md。

目前為U14 v2：兩種模式都只填各人姓名／已付，自動加總並永遠計算結算；沒有手填總額與墊款開關。快速平均，進階可按份數。以原生radio模式選項及原tokens實作，不增加品牌重設。

```text
GlossQuote / 分帳與墊款                    English / 工具首頁
[快速結算 ○] [進階分帳 ○]  精度 [2位小數 v]
進階：[平均 v / 依份數]      （同一幣別）
序號  姓名              已付       份數(進階適用時)    移除
1     人員1             0          1                  ...
2     人員2             0          1                  ...
[新增人員]                    [算出誰付給誰] [清除]
結果：誰支付誰 / 自動總額與人數 / 各人明細 / 尾數說明
[複製明細] [下載TXT]             使用說明與FAQ
```

手機每人一個有legend序號的fieldset，姓名／已付永遠存在，份數只在進階份數模式顯示；移除仍可達。初始三人已付0、無結果，範例不自動載入。快速範例甲900／乙300／丙0；進階同額份數2/1/1，兩者仍需明確計算。清除保留模式，回三人0／份數1／平均／2位，focus第一人姓名。兩種報告結算先列；進階英文Share，快速Equal share。引言明示快速平均／進階可按份數，不在加權結果旁宣稱全部平均。

兩語關鍵文案：

| 狀態 | 繁中 | English |
|---|---|---|
| 初始 | 填入每人已付的共同費用，沒付的人也列入並填0。 | Enter what each person paid for shared costs. Include anyone who paid nothing with 0. |
| 精度說明 | 所有金額須使用同一幣別；共同費用請包含稅與服務費。 | Use one currency for all amounts; include tax and fees in the shared costs. |
| 份數全零 | 至少一人的份數必須大於0。 | At least one person must have a share greater than zero. |
| 合計超上限 | 已付合計超過金額上限，請核對各人的金額。 | Payments add up to more than the amount limit. Check each payment. |
| 草稿 | 資料已變更，請重新計算。 | Details changed. Calculate again. |
| 尾數 | 小數尾數依餘數大小分配，相同時由較前的人員取得。 | Leftover units go to the largest remainders; ties follow the people order. |
| 結算 | {from} 支付 {to} {amount} | {from} pays {to} {amount} |
| 無需結算 | 已付金額與應付一致，無需補付。 | Paid amounts match shares. No settlement is needed. |
| 切換語言 | 切換語言會清除目前內容。 | Switching language clears the current content. |

錯誤code到locale字典一致，error旁有field關聯，不把每次keystroke放assertive live region。兩語report帶人員序號、金額精度及尾數說明。格式化金額不是輸入格式；輸入旁明示不用千分位逗號。

## SEO

- 中文title：分帳結算｜填已付金額，算出誰付給誰 — GlossQuote
- 中文H1：算出誰付給誰
- 中文description：填入每人的已付金額，沒付填0，自動加總並平均或依份數分攤，算出誰付給誰多少。本機計算，不需帳號。
- English title：Quick Bill Settlement & Advanced Split — GlossQuote
- English H1：See who pays whom
- English description：Enter what each person paid, including 0. Total shared payments automatically, split equally or by shares, and see who pays whom. Local calculations without an account.
- 兩語各寫真實使用步驟和限制（中文約100–250字、英文100–180words）。
- FAQ：如何分配尾數？/ How is rounding handled? → 最大餘數，相同依順序 / Largest remainders first, then people order.
- FAQ：能直接轉帳嗎？/ Does this send money? → 不能，只產生計算結果 / No, it only calculates amounts.
- FAQ：可混用幣別嗎？/ Can I mix currencies? → 不可，沒有匯率，選0/2小數適合自己的單位 / No currency conversion; choose 0 or 2 decimals for one unit.
- FAQ：快速與進階有什麼不同？/ How do quick and advanced modes differ? → 兩種都自動加總；快速平均，進階可按份數。0份者不分攤，但付款仍列入應收 / Both total payments automatically; quick splits equally, advanced offers shares. Zero-share payers can still receive settlement.

正式候選split.glossquote.com的index.html與en/index.html，self-canonical、zh-Hant/en/x-default及可見WebApplication資料。無假評價或排行，不保證所有幣別小數規則，不描述為自動金流。首頁同語返回/語言切換不帶草稿。其餘正式/preview/404規則见 [RELEASE](docs/RELEASE.md)。


---

## 原文件 ACCEPTANCE.md

# 分帳工具驗收

## U14 v2 current gate

新版為已付自動加總入口；下列預期須在固定新版來源驗證。N=純函式／controller／build，B=真browser，L=正式站。製作／primary／live／外驗證據分開記錄，不從舊88f2036或早期v1繼承通過。

| ID | 必要輸入／操作 | 獨立預期 |
|---|---|---|
| U14-01 | 快速A900/B300/C0 | total1200，各400；B→A100、C→A400 |
| U14-02 | 快速A1200/B600/C0/D0 | total1800，各450；C→A450、D→A300、D→B150，固定順序 |
| U14-03 | A100/B0/C0，精度2及0 | 33.34/33.33/33.33及34/33/33；B/C各付A33.33或33 |
| U14-04 | 全0、全空白、A10/B10 | 合法無轉帳；全0明說沒有人付款；沒有負零或虛构付款 |
| U14-05 | A0.01/B0/C0 | shares0.01/0/0，守恆；無0轉帳或本人付本人 |
| U14-06 | 進階paid900/300/0，份數2/1/1 | total1200，shares600/300/300；C→A300 |
| U14-07 | 同付款，份數0/1/1 | shares0/600/600；B→A300、C→A600，0份付款者仍收款 |
| U14-08 | 全份數0，包括全paid0 | 拒絕、focus可見weight，訊息關聯，輸出停用；合法份數＋全paid0則無轉帳 |
| U14-09 | 隱藏非法份數切快速，返回進階 | 快速成功且不讀權重草稿；返回保留原字串、舊輸出失效、重新計算才拒絕 |
| U14-10 | 名稱／付款／份數／精度／人數／模式變更與clear | 舊report/copy/download立即失效；clear保留模式，3人paid0/weight1/equal/2，focus name-1 |
| U14-11 | 2/50人、0/1000份數、兩精度max與合計超限、非法金額／名稱 | 邊界接受／拒絕精確，sum cap指向可見paid；重名有ID，惡意字串只當文字 |
| U14-12 | 中英文report／copy／TXT | 兩模式都先列轉帳；進階Share不可Equal share；UTF8無BOM/LF/單一末尾LF，固定檔名，revision及Blob回收守衛 |
| U14-13 | 原生radio方向鍵、兩語、320px／200%及AT | 模式／焦點／草稿一致，沒有manual total或paid-toggle；不能用adapter代替真UI |
| U14-14 | test/check/build/build:production/check:production | 全部必要gate PASS；31項包含舊core相容與真server安全負例；source/live/外驗分開 |

至少200組獨立守恆／配額／零份數／固定順序／不mutation，settlement每人paid−share＋outgoing−incoming=0。主代理固定程式驗收見PRIMARY-REVIEW-2026-10-12-U14.md；結果與人工NOT_RUN見docs/TEST-RESULTS.md。

## 舊88f2036及早期v1案例（歷史／calculateBill內部相容）

以下保留原需求與原驗收定義；其中total>0、可選paid、paid mismatch及總額欄focus不再是v2 UI契約，不能把舊B/L結果標為新版通過。

下表定義必要預期，實際PASS/FAIL/NOT_RUN見 docs/TEST-RESULTS.md；不可把預期直接當通過。N為純函式/建置、B為真Chrome及Edge、L為正式站。每人下列順序就是建立順序；金額例子沒有幣別轉換含義。

| ID/需求 | 層 | 輸入/步驟 | 必要預期 |
|---|---|---|---|
| S01 FR01/03 | N/B | 100.00、2位、3人平均 | 應付33.34、33.33、33.33，和100.00 |
| S02 FR03 | N | 0.01、2位、3人平均 | 0.01、0.00、0.00 |
| S03 FR01/03 | N/B | 100、0位、3人平均 | 34、33、33 |
| S04 FR03 | N/B | 100.01、2位、份數1/2/0 | 33.34、66.67、0.00 |
| S05 FR03 | N | 10.00、份數1/1/1/1 | 四人各2.50，無尾數 |
| S06 FR01 | N/B | 0001.2（2位） | 接受，120n，顯示1.20 |
| S07 FR01 | N/B | 0、負數、+1、1e2、1,000、.5、1.、NaN、1.001 | 全拒絕；無部分/舊結果 |
| S08 FR01 | N | 各精度最大額及多一最小單位 | 最大接受；超出拒絕；總額不可空，已付空可當0 |
| S09 FR02 | N/B | 2/50人及增到51或刪到1 | 2與50接受；越界動作不改資料並說明 |
| S10 FR02 | N/B | 同名兩人、__proto__、<img ...> | 同名保留不同序號/ID，危險名稱只當文字、無prototype或DOM執行 |
| S11 FR02 | N | 空/只有空白姓名、41碼點、控制字元、U+0085/U+2028/U+2029、孤立surrogate | 拒絕；行分隔符在trim前檢查；40碼點含emoji按碼點算不是UTF16 |
| S12 FR03 | N/B | 份數0/0、-1、1.5、1e2、1001、空 | 拒絕；0/1000可以且只後者分擔 |
| S13 FR04/05 | N/B | 100.00三人平均；paid100/0/0 | 2→1:33.33，3→1:33.33，第一人實際分擔33.34 |
| S14 FR04/05 | N | 100.00四人平均；paid0/60/0/40 | 1→2:25.00，3→2:10.00，3→4:15.00，固定順序 |
| S15 FR04/05 | N/B | 60.00、3人平均，paid20/20/20 | transfers空，明示無需補付 |
| S16 FR04 | N/B | 總額100.00，paid99.99或100.01 | 全次拒絕，分別還差/超出0.01，不顯示結算 |
| S17 FR03/05 | N | 總額30.00、shares權重0/1/2、paid30/0/0 | 應付0/10/20；2→1:10，3→1:20 |
| S18 FR04/06 | B | 隱藏paid草稿有非法值；off計算，再on | off只算應付成功；on使結果失效並拒絕非法paid |
| S19 FR01/06 | B | 1.25計算後把精度改0 | 不偷偷round，舊結果清空，提示修改總額 |
| S20 FR06 | B | 計算後修改姓名/人數/份數/模式/paid/toggle | 每種都立即使copy/download失效，重新計算才恢復 |
| S21 FR07 | B | 真copy與拒絕fallback，兩語真下載 | 實際檔名/UTF8無BOM/LF/末尾LF與可見report一致，无舊資料 |
| S22 FR08 | B | 修改所有設定後clear | 回3人/平均/2位/off/空總額、無paid/舊結果，焦點回總額 |
| S23 FR08 | B | 真Network/Storage：計算、下載、隱藏重回、clear | 無輸入內容/遙測上傳；無local/session/IDB/cache；不得僅用ResourceTiming宣稱完整 |
| S24 FR09 | B | 兩語、320px、200%、鍵盤全操作、50人 | 欄位/錯誤/控制可達、長姓名不撑頁、結果可讀 |
| S25 FR09/10 | B/L | 兩語切換與首頁返回 | href同語系，草稿不在URL；切語遺失有說明 |
| S26 FR10 | N/L | preview/production/404/MIME/SEO/headers | 符合RELEASE；公開repo/部署/主驗/外驗分開 |
| S27 FR03/07 | N/B | 份數模式設1/2/0，再切平均後計算/匯出 | 應付按1/1/1，report有效份數也是1/1/1；切回份數仍保留1/2/0草稿且舊結果失效 |

額外必要不變量：至少200組決定性的有界total/weights，驗sum(shares)==total、非負、零份數為0、相同輸入結果固定、理想配額誤差<1個最小單位；settle驗每人 paid−share+outgoing−incoming==0、no self/zero transfer、輸入不變。由獨立計算/數學不變量驗證，不用複製被測輸出当expected。瀏覽器案例不是Node pass可代替。


---

## 原文件 TASKS.md

# 分帳與墊款結算任務佇列

目前U14-DOCS-SOURCE已PASS、owner釋放（2026-10-13）：current文件、PUBLIC main `c82e8a182b36cf9568e28d9179a923e0fdaf7a4b`、固定ZIP及解壓建置核對已交付，狀態READY_FOR_INTEGRATION。29個程式／tests／scripts／設定hash與primary固定版本相符，沿用PRIMARY-REVIEW-2026-10-12-U14.md的31/31結果；未重做程式／UI或重跑未變測試。本輪未部署或改首頁，下一步由primary正式整合及新版外驗；不繼承舊88f2036外部通過。固定來源與所有NOT_RUN見HANDOFF及docs/RELEASE-CANDIDATE。

U14 v2：快速／進階都paid sum，快速平均、進階份數，always settlement，total/paid-toggle已移除；份數0保留付款、全weights0拒絕、total0有效，clear focus第一人，兩語TXT結算先列。要求依OUTCOME-UPGRADE-2026-10-12.md及current PRODUCT／ACCEPTANCE。

下列T00–T06保留原任務範圍與歷史，原「全部未開始」僅是規格建立時狀態；實際完成紀錄見HANDOFF。共通允許本工具HANDOFF/project狀態與dist生成物，證據／發布副本依入口，原owning缺陷不擴到別的工具。

## T00 靜態骨架與開發工具

- 前置：讀入口/契約，檢查現狀與Node24，持久環境guard。
- allowed：package.json、必要package-lock.json（零deps可不建）、.gitignore、public/index.html、public/en/index.html、public/styles/**、public/js/app.mjs、scripts/serve.mjs/check.mjs/build.mjs、test/scaffold.test.mjs。
- 實作：原生ESM兩語停用預覽骨架、public-only loopback server、真check/build/test；noindex/no remote assets。安全server拒絕穿越/hidden/symlink、只GET/HEAD、404正確，build先驗內容再只更新本工具dist，不能清root。
- 驗收：npm test覆蓋server allow/deny、404/MIME/HEAD/405及copy隔離，npm run check，npm run build；記錄命令/exit。非目標：此步不是核心產品與正式SEO。

## T01 純邏輯與精確案例

- 前置：T00 PASS。
- allowed：public/js/core/money.mjs、split.mjs、report.mjs及test/money.test.mjs、split.test.mjs、report.test.mjs，必要test假fixture與PRODUCT/TECHNICAL/ACCEPTANCE中的明確勘誤（不改需求）；scripts/check.mjs只加入新模組實際檢查。
- 實作：TECHNICAL API及固定error codes，對照S01–S17與守恆/不mutation不變量，無DOM/network，輸入不mutation。
- 驗收：npm test、npm run check；每個error/邊界/不變量有獨立expected，不用被測函式計算expected。失敗先修T01，不進UI假成功。

## T02 雙語互動工作區

- 前置：T01 PASS。
- allowed：public/**、test/ui-contract.test.mjs（如必要）、本工具UX-SEO及相關core/test缺陷。
- 實作：按UX設計兩語完整UI、真實成功/錯誤/空狀態、所有草稿變更使舊結果失效、keyboard/focus、copy拒絕fallback、native TXT下載及ObjectURL清理、清除。使用textContent/value，不用innerHTML；不加入無需求的功能。
- 驗收：npm test/check/build；真Chrome及Edge執行主要/錯誤/舊結果/清除/複製/實際下載；320px/200%實測。Node UI靜態檢查不可代替瀏覽器；不能跑的項目標NOT_RUN給主對話補，不虛報。

## T03 邊界與隱私驗收

- 前置：T02功能可測。
- allowed：本工具public/**、test/**、scripts/**與docs/TEST-RESULTS.md；只修ACCEPTANCE範圍相關缺陷。
- 實作：對照全部案例、最大輸入、惡意字串、真Network/Storage/頁面hidden與回復、輸出race。若工具缺少完整Network觀測，記錄精確缺口，不以CSP/ResourceTiming冒充。
- 驗收：受影響自動gate，真瀏覽器案例逐條PASS/FAIL/NOT_RUN附版本/輸入/觀察/證據。必要gate缺口交主對話補完，不靜默跳過；明確允許人工待驗者可列在候選包，但未達完整驗收不叫MVP全過。

## T04 正式發布工具鏈與SEO

- 前置：T03無未處理必要FAIL；待補人工觀察保持可見。
- allowed：scripts/build.mjs/check.mjs、test/release.test.mjs、public/**的staticSEO/404/headers、wrangler.jsonc、package.json scripts、docs/RELEASE.md。
- 實作：按RELEASE固定origin的production/preview build、self canonical/zh-Hant/en/x-default、sitemap/robots、靜態安全headers、雙語首頁互連、strict404、可重現資產清單。首次做Workers配置讀適用官方/skill，保持免費靜態託管，不server運算。
- 驗收：npm test/check、npm run build、npm run build:production、npm run check:production；preview仍noindex，prod URL/meta/header/content精確匹配，絕不出包personal/docs/tests/node_modules；本步不執行正式deploy。

## T05 公開GitHub與候選交接

- 前置：必要自動gate及可執行瀏覽器gate通過，人工缺口明列且不假稱全通過。發布完整可用候選，不公開空骨架當成完成品。
- allowed：本工具README/HANDOFF/project.json/docs/**、必要發布manifest產生腳本，專用發布副本及證據；不修改根repo或其他工具。
- 實作：reviewed source copy、明確allowlist/secret檢查、只包含本工具source及必要文件；使用既有gh授權建立/更新指定PUBLIC repo，不force。核對remote commit/publicity與fixed source ZIP hash；必要node_modules/dist私人證據都不公開。
- 驗收：讀remote visibility/HEAD，發布copy與對應source檔hash一致；記docs/RELEASE-CANDIDATE含命令/版本/所有未驗/正式候選網址。記READY_FOR_INTEGRATION（有必要blocker則BLOCKED），主對話read actual files再部署；不得自己修改首頁/讀token。

## T06 原對話修正與發布配合

- 前置：主對話/使用者提供具體驗收回報。
- allowed：回到缺陷的T00–T05 owning paths，只處理原需求修正；相關文件、測試與source publication一併更新。
- 驗收：重現原失敗→修正→受影響regression→GitHub固定新commit→主對話部署/正式複驗→外部確認。未獲使用者/驗收者確認前不是產品「完成」，也不把主對話等待誤寫成缺使用者發布授權。

