# 最大肌力 1RM 計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格任務 `labs-one-rep-max-spec-20261109`（由主代理登記）。此為作者本人對文件的檢查，**不是獨立審查**；ready 須由非作者 reviewer 對同一固定候選核對八節與字面案例後決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：概念-note 指定 nearest 為 none。已對照 docs/specs/ 既有目錄與已知工具清單，無 1RM 或肌力估算工具；最相近的 bmi-tdee-calculator（身體組成／熱量）、running-pace-calculator（跑步配速）、water-intake-calculator（每公斤攝取量）皆為不同輸入與不同模型，差異已寫入 scope。

- 案例重算：11 筆核心案例的 expected 由作者先依 SPEC 規則手算，再以獨立的精確有理數腳本（分數運算，非浮點）重算一次，兩次結果全數一致，含三處 0.5 階梯平局向上取（57.25→57.5、89.25→89.5、26.75→27.0）。另核對：兩公式在 r=10 倍率同為 4/3 而交會（(30+r)(37−r)=1080 的正根 r=10），故 formula-crossover 兩估計相等；225 lb 的 wKg = 102.05828325 為精確值、未先捨入。3 筆 controller 案例沿用範本的 checkpoint 形狀。

- 概念-note 未固定而由作者決定的事項（皆已在 SPEC 固定，留待獨評核可）：(1) 輸入採公斤／磅雙單位（×0.45359237 精確換算），輸出一律公斤；(2) 捨入分工——epleyKg／brzyckiKg 為小數一位，oneRepMaxKg 與百分比表重量為 0.5 公斤階梯，百分比表以已捨入的 oneRepMaxKg 為基準再取階梯，平局一律向上；(3) reps=1 時兩估計皆定義為重量本身（Epley 原始式在 r=1 給 w×31/30，不採用）；(4) 百分比—參考次數表的值（95→2、90→4、85→6、80→8、75→10、70→12、65→16、60→20、55→24、50→30）取自通用 %1RM–次數關係圖並在 SPEC 固定，實作不得另查；以 Epley 反推交叉核對（65%≈16.2 次、50%=30 次）數量級一致；(5) 高次數提醒門檻固定為 reps>10；(6) 計算為 O(1)，不使用 Worker，改以世代號＋下一個事件迴圈工作的延遲執行實現 busy／cancel／晚到丟棄語義。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage 及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
