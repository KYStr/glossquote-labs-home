# 電視尺寸與觀賞距離 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（build4 spec authoring）。本文件是作者對自己文件的核對，**不是獨立審查**；readiness 須由非作者 reviewer 對同一固定候選重算案例、核對八節後決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 去重聲明：已比對本批概念清單與既有工具。最相近者為 aspect-ratio-calculator（由長寬比與一邊算另一邊的純幾何換算）與 print-size（印刷 DPI 尺寸）。本案差異：固定 16:9 幾何之外，另固定 THX／SMPTE 經驗倍率表、四個距離、五級 fit 判定與「距離反推吋數」模式，兩者皆無。本案不是 aspect-ratio 的改名或子集。

- 倍率組的決定（概念 note 給了兩個不一致的候選，本文固定一組並記錄）：(1) 不採概念 note 的「×1.2 到 ×1.6」理想範圍，改固定一組常見公開倍率：最近 ×1.2、理想 ×1.5–×2.0、最遠 ×2.5；理由是 1.6 同時被指為理想上限與最遠會自相矛盾。(2) 不採概念 note 的「4K ×0.8 因子」，依本案任務指示固定為：4K 只把最近距離倍率由 1.2 改為 1.0，理想／最遠與反推其餘除數不變。(3) 倍率一律標示為源自 THX 36–40°、SMPTE 30° 視角建議的經驗法則，明文禁止以 tan 精確角度換算覆寫（精確換算的倍率與此組不同，混用會讓 fixtures 無法重算）。

- 幾何：W/H 用精確分數 16/√337、9/√337（√337 = √(16²+9²)），近似係數 0.8715755371／0.4902612396 只供閱讀。任務指示的概算 0.8716／0.4903 與精確值在輸出 1 位小數下對本文 fixtures 無差異，但契約以精確式為準。

- Fixture 重算：13 筆案例（10 核心＋3 controller）。7 筆含計算的核心案例先以高精度十進算術（Decimal，50 位）依本文公式手算，寫入後再以第二份獨立計算（有理／高精度路徑加浮點交叉核對寬高）逐值深比對，全數一致。距離乘積皆為有限位小數，以整數縮放核對；`forward-10-boundary` 的最遠距離 63.5 cm 是刻意保留的 half-up 平局點。其餘 W/H 值距平局點皆遠於 1e-3，不靠浮點誤差決定。

- 完整性自查：驗證順序（結構→容量→surrogate→文法／列舉→範圍→跨欄）與固定錯誤碼＋JSON Pointer 路徑已釘死；輸入上限（raw 8 單元、10–120 吋、30–1500 cm）已釘死；fit 五狀態的端點歸屬以未捨入值比較已釘死；雙語字串、狀態機（empty/dirty/busy/success/error/cancelled、edit 使舊結果失效、晚到 settle丟棄、cancel）已釘死；九面向已於 acceptance 預先宣告。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
