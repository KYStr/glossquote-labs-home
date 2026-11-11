# FH-QC-A 獨立文件審查：可立即分派的修正

審查者 `/root/five_hour_astra_review`；工具要求 gpt-6-astra / ultra，未另驗後端身分。固定候選 PR 283 `448bd9fc9865fe65f6014b66f4a2e2d54b76f539`。只讀候選；此目錄內 candidate 是 39 個 GitHub blob 驗證後的逐 byte 複本。未改來源、registry、PR 或產品。

本輪自行執行 `python independent-fixtures.py`，Python 3.12.5，exit 0：163/163 核心字面案例精確相符；24/27 controller 文件案例的嵌入計算與 checkpoint 文字相符，另 3 件缺少完整字面狀態；58/58 健保附錄列與精確公式相符。**exit 0 只表示數值複算完成，不表示下面規格缺陷通過。** 沒有執行或借用作者 616／646 測試，沒有產品 GUI 驗證。

## FH-QC-A-01：完賽時間的已知距離列規則與 fixture 矛盾（阻止放行）

- 影響：`docs/specs/race-time-predictor/SPEC.md` 第 45、69、131 行；`fixtures.json` 的 `custom-source`（第 194 行）、`min-custom-boundary`（第 239 行）。
- 第 45 與 69 行無條件要求預測表包含已知距離本身。第 66／70 行卻固定只有 5k、10k、half、marathon 和選填 targetCustomM。
- 重現：`{knownPreset:"custom",knownCustomM:"15000",knownTime:"1:07:30",targetCustomM:""}`。字面 expected 的列距離是 `[5000,10000,21097.5,42195]`，沒有 15000。400m 下限案例同樣沒有已知列。數值本身均獨算相符。
- 最小修正：保留既定四標準＋選填目標的輸出形狀，把恆等性文字限定為「目標距離等於已知距離時」或「已知標準距離時」，同步 success／tests 文案，另列 custom source 無同距離列是有效結果。若決定新增已知列，屬輸出契約改動，需所有 fixtures、產品與驗收同步。
- 驗證：重算受影響 fixtures，並對 standard/custom source × 有／無 custom target 的列存在條件做明確字面斷言。證據 `fixture-results.json` 的 semanticProbes。

## FH-QC-A-02：健保要求不存在的浮點捨入反例（阻止放行）

- 影響：`docs/specs/nhi-premium-calculator/SPEC.md` 第 154、203 行。
- 文件聲稱 `457.545` 若浮點成 `457.54499…`，會四捨五入成 457，並要求測試用一般浮點路徑得到 457。兩者都大於 457.5，四捨五入到整數皆為 458。
- 自行重現：Python `floor(29500*0.0517*0.3+0.5)` = 458；`floor(457.54499+0.5)` = 458。正確精確值 `91509/200` = 457.545。原核心 fixtures 和 58 級附錄均正確。
- 最小修正：保留整數／BigInt 的既定精度契約，刪除錯誤反例及不可能的必測條件；保留 150000 元的 2326.5 → 2327 來區分 half-up 與銀行家捨入，並用精確有理數逐級對照證明正確性。不得製造浮點失敗來湊證據。
- 驗證：核對修訂只改錯誤說明與測試要求；58 級／既有數值不變可重用已固定獨算證據。

## FH-QC-A-03：運動熱量的狀態／交接與必要驗證契約不完整（阻止放行）

- 影響：`docs/specs/calories-burned-calculator/SPEC.md` §§3.2、4.2–4.4、5–6、8，及 `fixtures.json` 第 146–190 行。
- 三個 controller cases 只給步驟名稱；`replace` 沒有替換輸入、run/cancel 的完成時序未固定，`assertInitial` 沒有 state/result/reportAvailable 的字面 expected。第三者不能判斷不同實作是否相同；也不能證明晚到結果未覆蓋較新的成功或錯誤。
- §4.2/4.3 保留 last accepted result，卻未固定 dirty/error/cancel 時舊結果標示、下載是否失效、下載綁哪一份輸入。沒有下載 Blob URL 撤銷／pagehide／bfcache 草稿生命週期。舊結果可保留作明確 stale 顯示，但不可含糊地當目前結果下載。
- 八節有標題不等於八項內容完整：沒有可執行的 build/check/serve/test 命令、Node 24 零 runtime 依賴明文、里程碑與停止／發布責任；§5–6 的瀏覽器、裝置、Network/Storage、320px、真實 200% zoom、對比與觸控驗證方法不明確。handbook 引用無可取得的連結。此處不是要求立即執行產品 GUI，而是文件需預先固定方法與未執行狀態。
- 最小修正：補完整 empty/dirty/busy/success/error/cancel/reset 狀態和報告有效性；補3份真實字面控制案例的草稿、晚到 payload、逐步 expected；補完整命令、共享規範連結與必要可反駁驗證，保留人體估計／MET／數值範圍，不任意更換公式。
- 算術與來源：20/20 核心 fixtures 已獨算通過；14 行 MET 的主要分類頁已直接讀取核對（其中水上與 yoga 將在 final report 再給逐行證據）。缺口集中在完整規格而非 MET 數字。

## FH-QC-A-04：料理奶油每杯 227g 的來源推導未交代（阻止來源放行；不要求擅改模型）

- 影響：`docs/specs/cooking-measurement-converter/SPEC.md` 第 65、74、82 行與 AUTHOR-CHECK 的「全表同源」聲明。
- 目前直接讀取指定 [King Arthur Ingredient Weight Chart](https://www.kingarthurbaking.com/learn/ingredient-weight-chart)：Butter 是半杯 113g（同列亦列 4oz）；直接按所列公克數倍乘為 226g／杯。規格用 227g／杯，但只解釋蜂蜜、水與牛奶，未說明奶油的單位或捨入取捨。既有 227g→1cup fixture 符合規格選值，卻不能證明來源推導。
- 最小修正選擇：補同一出版者直接支持 227g／杯的來源，改述此值為明示的另來源／模型取捨；或明確以原表 4oz 半杯→8oz 每杯、再換克並捨入的推導並承認不是 113×2。只有決定改採 226g 時才同步所有數值測例與產品，不應默默更改既定模型。
- 另有低風險標示改善：`rolled-oats` 89g 對應表中 old-fashioned/quick-cooking oats；該表另有 King Arthur Rolled Oats 113g。可具名所採列，避免把品牌特定列混為同一食材。

## 跨文件／流程缺口（不冒簽、不直接改 ready）

- r1530 的 9 份 spec.document／原 spec task submission 仍指原始各 PR commit，沒有指向 PR283 的修訂版。review／mark-spec-ready 必須對實際登記的固定文件，不能把修訂版證據套到原候選。
- `workdays-calculator` 的 inputsOutputs 已限制反運算成立條件，但 goal 與 BRIEF 仍簡稱兩模式互為反運算。建議補「符合端點條件時」；核心規則與 23 個 fixtures 已一致，這是非阻止性的文案清理。
- 全部 GUI、裝置、真 Network/Storage、下載與正式站結果仍 NOT_RUN。文件通過不等於產品 accepted。沒有部署／合併／ready 變更。
