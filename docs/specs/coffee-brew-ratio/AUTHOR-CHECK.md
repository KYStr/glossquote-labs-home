# 手沖咖啡沖煮比例 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格任務 `labs-coffee-brew-ratio-spec-20261109`（由主代理登記）。本文是作者本人的文件核對，**不是**獨立審查；ready 與否由非作者 reviewer 決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：已比對 base commit `a4b56dd2` 的 docs/specs/ 101 份預案 slug、tools/、sources/candidates/、sources/legacy/，無 coffee 相關 slug。最相近者為 legacy 快照 `recipe-scaler`（食譜食材清單依倍率整表縮放；原 repo `KYStr/glossquote-labs-recipe-scaler`）與 `bakers-percentage-calculator`（麵團成分對麵粉重的百分比）。本案差異：以 1:R 比例在粉與水之間雙向求解（水＝粉×R、粉＝水÷R），再依悶蒸倍數拆出悶蒸＋三段注水的累計目標表；無食材清單、無份數縮放、無麵團成分。實質差異已寫入 SPEC scope。

- 案例重算：fixtures.json 共 12 案（9 核心＋3 controller）。6 個成功核心案的預期值先以 SPEC 固定的十分之一單位整數公式手算兩次（粉量模式 W＝floor((D×R+5)/10)；水量模式 D＝floor((20×W+R)/(2×R))；悶蒸 B＝floor((D×M+5)/10)；注水以最大餘數法、尾數補較早段），再以獨立的 Python 實作同公式逐案比對，全數吻合。特別核對：`water-solve-dose` 的 31.25→31.3（half-up .5 進位）、`dose-preset-15` 的 rem=2、`pour-remainder-one` 的 rem=1、`water-custom-ratio` 的 rem=0，三種尾數分配皆有案例；每案第 4 段 cumulativeMl 恰等於 totalWaterMl。3 個錯誤案依驗證順序（mode → amount → ratio → bloomMultiplier）逐一核對第一個錯誤的 code 與 field。fixtures.json 已驗證可解析為 JSON。

- 概念未定、由作者決定的點（已在 SPEC 固定）：(1) 注水尾數採最大餘數法、尾數補給較早的段，不採最後一段吸收全部尾數；(2) 悶蒸以「已捨入的粉量」計算，水量模式亦同，使顯示值永遠自洽；(3) 核心比例範圍放寬為 10.0–20.0（預設按鈕 12–18 為 UI 捷徑），倍數範圍 0.0–5.0，粉量上限 200 g、水量上限 4000 ml，為家庭手沖的合理界線；(4) 數量採單一欄位、標籤隨模式切換，不並列兩欄；(5) 注水段數固定 3 段、不做匯出，與概念的非目標一致。

- 完整性自查：每欄位的型別／語法／單位／預設／上限與錯誤 code＋路徑順序已固定；雙語字串含標題、description、FAQ 與錯誤訊息表；flow 六狀態（empty/dirty/busy/success/error/cancelled）含 edit 失效、晚到結果丟棄、cancel 與 reset 預設值；九面向已在 acceptance 預宣告。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage 及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
