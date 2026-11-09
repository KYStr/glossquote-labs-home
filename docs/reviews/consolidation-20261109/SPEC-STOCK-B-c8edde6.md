# B 組二十份預案獨立審查

固定候選 [PR 73 的文件 commit](https://github.com/KYStr/glossquote-labs-home/commit/c8edde6a8d2a83d69a5ef863057184d0ee5022d0)，Git tree `70466cc65e3698c2c93c66c8c7605d1492b88634`。非作者 reviewer 為 `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/stock_a`。作者為另一位實際 actor。

20 份文件的 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff 各節均已核對，可進入文件 ready 登記。產品實作、真實 Chrome/Edge、Network/Storage、裝置、正式 SEO、部署皆 NOT_RUN，產品九面向分數未評。這裡的八節核對限文件，與後續製作和產品驗收分開。

## 文件品質和來源

- completeness 100。每件有明確的工作物、桌面與窄畫面使用流程、輸入型別與上限、精確或明示捨入、單位、排序及定義好的空、編輯、忙碌、取消、失敗、清除狀態。每件有六個字面核心案例和兩個控制器案例，合計 120 和 40。適用的運算上限、Worker、純本機 CSP、雙語與頁面可及性，以及需要已驗證隔離的 Chrome/Edge、正式站驗證都寫成後續 gate。
- traceability 100。以公開 Git 固定 tree 檢查 81 個實際 blobs（80 份文件加 manifest）與 200 個相對連結。既有 130 份規格和 A 組 20 個範圍一併比對。對最相近的既有工具，這批的輸入、主工作和輸出有實質差異。例如票號區間處理定寬含端號碼、超段紙票張數與重複額外張數，A 組的數值區間為半開十進數、拒絕越域、重疊長度只計一次。套牌相容配置以逐張庫存做最大流，與原容器幾何容量不同。
- 重現資料來源。以 `git show <commit>:docs/consolidation/2026-11-09/spec-stock-b-manifest.json` 取得路徑，按相同 commit 讀取四份文件。Node 24.14.0 的非作者結構檢查核對八節、九個必要面向、120 core/40 flow 形狀、相對連結和原樣 Git blob。下表用小範圍窮舉、直接單位換算、逐事件或數列重算，未使用作者檢查器產生觀測值。

## 每件核對與獨立算例

| 預案 slug | 文件核對 | 固定案例與重算 |
| --- | --- | --- |
| `frame-row-marking` | 八節可放行 | `center`。將 500 mm 餘量除 3，對絕對框邊及偏移的整數分數獨立取十分位。 |
| `curtain-repeat-cut` | 八節可放行 | `matched`。逐毫米枚舉一個花距的首個合法落剪點，得到 190/2,110，結尾 3,730。 |
| `cash-float-tray` | 八節可放行 | `tie`。窮舉小清單。5+3 與 4+4 都到 8、同為兩件，高面額決勝。 |
| `table-seating` | 八節可放行 | `backtrack`。B 只能坐 T1，放 B 後 T1 剩 2，小於 A 的 3。A 與固定的 C 合計 4 正好填滿 T2。 |
| `gift-exchange-match` | 八節可放行 | `directed`。窮舉 3! 個收禮排列，刪掉自送及 A→B，首個合法排列 C,A,B。 |
| `parcel-billable-weight` | 八節可放行 | `two-services`。按 cm³、kg、g 分步換算，再對每件進位。服務 A 共 2,500g，B 的 P 超長，總計 null。 |
| `knit-gauge-planner` | 八節可放行 | `tie-up`。95mm 對應 19 針，在 16 和 22 正中。50mm 對應 10 行，在 8 和 12 正中。兩者取高。 |
| `laundry-machine-handoff` | 八節可放行 | `delayed-wash`。窮舉每個 (洗起、烘起) 整分鐘，而非倒掃前綴。A 可在 510/550，B 需到 570/590。 |
| `plant-watering-route` | 八節可放行 | `farthest`。窮舉此例四種補水集合。僅在 C 補一次的路線成功，補量 650mL。 |
| `loan-kit-turnover` | 八節可放行 | `turnover-overlap`。A 到 40 才可重用，B 在 30 開始。30–40 需求 5，短 1。 |
| `film-roll-budget` | 八節可放行 | `priority-rounds`。可用 20，最低配額 9，剩 11。高優先兩列分 6 和 5，低優先保持 4。 |
| `bicycle-gear-table` | 八節可放行 | `half-up`。1,250 mm × 10 rpm × 60 ÷ 1,000,000 = 0.75 km/h，half-up 到 0.8。 |
| `event-ticket-ranges` | 八節可放行 | `mixed`。獨立展開 1–10，唯一缺 7、4 重一張、11 在外。固定寬度補零另依 fixture。 |
| `court-queue-rotation` | 八節可放行 | `cap`。A 擊敗 B 留場，排隊 C,D,B。再擊敗 C 達兩連場，依上場序 A,C 加回，D,B 下一場。 |
| `game-night-scorecard` | 八節可放行 | `high-tiebreak`。A、B 都保留 16 分，A 最佳 10 大於 B 的 8。C 14 分。 |
| `pickup-window-route` | 八節可放行 | `wait-and-tie`。AB：25 離 A、33 離 B、38 返回。BA：15 離 B、30 離 A、38 返回。原序平手取 AB。 |
| `card-sleeve-fit` | 八節可放行 | `reassign`。窮舉兩種全配。B 對 S2 的寬差 30 超上限 20，必留 S1 給 B，A 改 S2。 |
| `bead-string-pattern` | 八節可放行 | `mirrored`。K,R,G,B,B,G,R,K 的 G 第二次出現在第 6 位，庫存只有 1。 |
| `service-block-breakpoints` | 八節可放行 | `multiple-crossings`。逐筆列 0..4 次，A 為 0,600,600,1200,1200，B 為 0,350,700,1050,1400。 |
| `battery-swap-plan` | 八節可放行 | `gaps-and-shortage`。獨立展開開機分鐘並每隔實測續航取一點。A 在 0、50，B 在 10、30，第四筆無備組。 |

## 已退回並複驗的容量更正

舊候選 `000dc6304187dfa62d3cb9e873730a352e7ea621` 的 cash-float-tray 把兩代動態規劃狀態寫成共 10,001。反例為 target=10,000、面額 100 與 1 各 99 件。第一代有 0、100、…、9,900 共 100 個和，第二代覆蓋 0…9,999 共 10,000 個和。並存 10,100 超過原說明。

修訂版改為每代至多 10,001、合計至多 20,002，且 boundaries 也同步。按固定 Git tree 比較，修訂只變更 cash-float-tray 的 SPEC、AUTHOR-CHECK 和 B manifest。兩代的容量反例現在落在界內，原字面 fixtures 和另 19 件原樣。未發現其餘阻止文件 ready 的問題。
