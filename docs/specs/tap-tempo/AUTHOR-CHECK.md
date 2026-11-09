# 點按節拍 BPM 偵測 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，run 4 規格撰寫，規格 task id `labs-tap-tempo-spec-20261109`（由主代理登記，作者未自行註冊、未執行任何 registry 指令）。這是作者本人對文件的檢查，**不是獨立審查**；readiness 須由非作者 reviewer 對同一固定候選另行核對。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：基線 `docs/specs/` 無 tap-tempo 同名或同功能規格（動工前已確認目錄不存在）。最相近為 `metronome` 節拍器規格：它以 WebAudio **播放**使用者設定的速度（點擊聲、拍號、細分），敲擊只是它設定速度的其中一種輸入方式；本工具不發聲、無播放狀態與音訊時鐘，契約是對字面時間戳陣列的分段／窗口／中位數統計，輸出可由 fixtures 逐位重算。實質差異已寫入 SPEC scope 節。概念註記的 dedupe 結論（量測 vs 播放）與 repo 實況一致，無衝突需裁決。

- Fixture 推導：17 筆核心案例中 12 筆含完整結果預期，全部先由作者依 SPEC 固定規則手算（間隔、分段、窗口、排序中位數、精確有理數平均、half-up 捨入逐值推導），再以一份獨立的 Python 精確分數（fractions.Fraction）scratch 實作重算一次，逐欄比對全數相符；scratch 實作是獨立推導工具，未提交、不是產品程式。含必備三案：偶數個間隔中位數取中間兩值平均（`even-median`，400 與 500 → 450）、跨 2000 ms 重置後段落重起（`post-gap-reset`，重置後敲擊 4500 為新段落第一下），以及中位數與平均明顯分離的抖動案（`jitter-median-vs-mean`，120.0 vs 88.2）。5 筆錯誤案例（NON_MONOTONIC ×2／INTEGER_FORMAT／RANGE／SCHEMA／INPUT_LIMIT）按 SPEC 固定驗證順序手工推導；其中 `too-many-taps` 的 513 個字面時間戳由序列化腳本機械寫入檔案，其 expected（INPUT_LIMIT）由規則直接推導。4 筆 controller 案例（含即時敲擊路徑 `state-tapping-live` 的逐步 checkpoint）按 SPEC 狀態機手工推導。

- 完整性自查：核心輸入契約（單一 `taps` 欄位、512 容量先行、逐元素單趟掃描的第一錯誤順位、錯誤 code／field／row 與 JSON Pointer 對應）、重置語義（嚴格大於 2000、重置後敲擊保留為段落第一下、恰好 2000 不重置）、窗口規則（重置後段落的最後至多 8 個間隔、時間順序輸出）、中位數偶數定義、平均由精確值計算而顯示值僅供呈現、三個輸出各自的整數捨入式、結果欄位集合與 null 條件、匯入文字文法與取代／保留語義、顯示格式由整數位值組字串、雙語字串與錯誤訊息、FAQ、flow 七狀態與世代丟棄規則、固定下載名稱與序列化規則，皆已在 SPEC 固定，無留給登入者查證的表格或規則。

- 概念註記未固定、由作者裁決並寫入 SPEC 者：(1) 非遞增錯誤碼採單一 `NON_MONOTONIC`，涵蓋遞減與相等（間隔 0 無有限 BPM），row 為後一元素的 1-based 序號；(2) 時間戳上限固定 10^13 ms（epoch 毫秒可容納），敲擊數上限依主代理指示固定 512；(3) 空陣列與單一元素為核心合法輸入並回 null 估計（即時空狀態須可表示），EMPTY 只由匯入控制器對空文字回出；(4) 新增匯入 textarea 作為字面陣列的產品介面（含文法、代幣上限、成功取代／失敗保留語義）；(5) 不使用 Worker，改以 macrotask 排程＋世代號實現取消語義（計算量極小，與本批 lottery 規格同型，理由寫入 implementation）；(6) 依本批範本納入固定下載報告 `tap-tempo-report.json`，以「已發布且使用間隔數 ≥1」為可用條件；(7) 每秒拍數固定二位小數，`meanIntervalMs` 為捨入後顯示值而 `bpmMean` 由精確平均計算；(8) 即時時間戳來源固定 performance.now＋Math.round，同毫秒與鍵盤自動重複由控制器擋下；(9) 驗證為逐元素交錯單趟（文法→範圍→單調），容量 INPUT_LIMIT 先於掃描。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
