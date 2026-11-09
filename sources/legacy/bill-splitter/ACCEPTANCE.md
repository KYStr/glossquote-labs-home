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
