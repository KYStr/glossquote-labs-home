# 三次貝茲緩動曲線探索器 / Cubic Bézier Easing Explorer

日期：2026-10-30。這是完整製作規格的開工 brief，不是已通過獨立完整度的規格、產品、測試結果或上線聲明。

## 1 目標

網站維護者要為介面轉場挑選「何時移動得快或慢」的節奏，單看四個控制點數字不易理解時間與進度的差別。工具接收一組有界控制點，產生可讀的曲線、固定時間採樣表、與線性參考並排的手動單次動態，以及可帶走的 CSS 緩動值。這是明確使用情境與產品假設，沒有宣稱訪談或市場數據。

成功是非作者只看頁內說明，就能輸入、產生、辨認回彈／超出終點、暫停或停止、修正錯誤並取走同一快照的 CSS。不是自動推薦「最佳動畫」，也不保證貼到任何網站後會有相同距離、時間或內容效果。

## 2 固定來源與去重

主頁基線：[README 26525d5](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。盤點參照：[registry353](https://github.com/KYStr/glossquote-labs-home/blob/7287cded27092f66c4b72d7aa96282c6b82d4b1f/coordination/work-registry.json)，共73份規格／79項任務。它是選題時快照，不代替之後最新承接；reserved、已被製作消耗、展示目錄都不算可取庫存。沒有以無回報推定 owner 已釋放，沒有重做已完成的本地首次盤點。

| 固定近似來源 | 原用途 | 本件差異 |
| --- | --- | --- |
| [專注計時](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/07-focus-timer/SPEC.md) | 分鐘倒數、暫停與到期提示 | 本件探索無因次時間→進度映射，不是個人計時或提醒工具 |
| [單位換算](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/05-unit-converter/SPEC.md) | 長度、面積、質量、容量、溫度 | 本件無單位選單或物理換算，解的是曲線上的輸入時間對應輸出進度 |
| [線性漸層](https://github.com/KYStr/glossquote-labs-home/blob/aaa8ff63e8673efccc0c21ff2d32632a510f7f42/docs/specs/linear-gradient-builder/SPEC.md) | 角度、色彩停止點與背景CSS | 本件不做色彩或背景，不以同名「linear」混淆時間映射 |
| [卡片陰影](https://github.com/KYStr/glossquote-labs-home/blob/ee9683cb60a4823e14768a26e24b782f59c6acac/docs/specs/box-shadow-builder/SPEC.md) | 有序陰影層與卡片外觀 | 本件不做陰影、不輸出box-shadow，控制的是進度而非繪製效果 |
| [格線配置](https://github.com/KYStr/glossquote-labs-home/blob/c38da35bd984b504bf69f1f9ba339f24857a3d2f/docs/specs/css-grid-layout-planner/SPEC.md) | 半開矩形、跨格與空間配置CSS | 本件沒有行列、區塊配置或版面設計，橫軸是時間不是空間欄位 |

上述方向的既有來源與責任保留。本件不是替它們補功能、重命名或借現成預案計數；正式 claim 前仍須核最新 registry、PR 與重複文件路徑。

## 3 有界產品範圍

- 一組四控制點 x1/y1/x2/y2；x限制0至1，y限制−1至2，以有限十進位文字輸入，最多小數三位。完整規格必須固定原字串長度、格式、端點、負零、結構、首錯順序和正規化，不接受任意CSS。
- 起點(0,0)、終點(1,1)固定。產生明確的時間／進度圖、九個固定時間採樣及數值摘要；不可把曲線參數t直接冒成輸入時間，也不能把超出0–1的合法輸出截成0–1。
- 明確按產生才建立有效結果；編輯立即失效。以同一合法快照供靜態圖、數值、兩條動態軌跡及CSS，不讓各區域重讀正在修改的raw。
- 動態只由明確手勢播放一次，固定短時長、有暫停／繼續／停止，不自動循環。使用者偏好減少動態時提供無動畫採樣操作，不能逼使用者播放才能讀取數值或CSS。
- 複製固定CSS文字，有失敗時可鍵盤選取的備援。第一版不提供下載或檔案API，避免為單一短值增加不必要URL資源；完整規格要固定複製期限、晚到回條與背景撤銷語義。
- 繁中與英文、鍵盤、320 CSS px與真200%縮放；圖形要有文字／表格替代，不只靠色彩辨識。以安全DOM/SVG與原生樣式呈現，沒有Canvas/WebGL需求。
- 無外傳、輸入持久化、帳戶、遠端字型／服務、追蹤、匯入CSS／圖片／SVG、任意腳本、音效、GIF／影片匯出、分享輸入URL或新依賴。沒有自由拖曳控制點的必要條件，數值鍵盤入口必須完整。

## 4 語義與實作基線

[W3C CSS Easing Level 1 固定2023-02-13版 §2.2](https://www.w3.org/TR/2023/CRD-css-easing-1-20230213/#cubic-bezier-easing-functions)定義控制點的x限制及輸入／輸出對應。產品的y界、三位小數、採樣數及固定短播放是本brief的範圍選擇，不冒稱標準要求，也不宣稱涵蓋域外延伸、steps()或任意easing函式。

未來實作採純解析／計算／格式層、可測生命週期控制層及真DOM適配層。控制點解析以整數千分值建立一致快照；曲線反解必須有明確有界算法、誤差與退化端點測試，不以看起來像曲線作正確性依據。原生播放或樣式計算的驗證須獨立於產品自己的solver；不得用同函式產生expected再宣稱驗收。

Node.js24內建工具與零新增依賴；清楚交付離線test/check/build、安全有界preview命令、資產／來源說明和擴充／復原指南。任何source自寫code逐行具體中文註解；既有第三方原文不得為湊此要求改hash。沒有新repo、部署、workflow、服務、費用、憑證或授權條款決策。

## 5 完整規格必須交付的八節

1. goal：對象、問題、可觀察成功、假設、非目標。
2. scope：固定來源、近似方向差異、功能與有界排除，不占用既有owner。
3. userFlow：初值／產生／編輯失效、播放暫停停止、減少動態切換、複製、清除、語言與生命週期。
4. inputsOutputs：精確raw/schema/首錯、正規化與CSS bytes、採樣和曲線算法、有效／無效例及誤差界。
5. implementation：三層責任、取消與晚到、防DOM/CSS注入、雙語可及性、來源、建置與非作者擴充方法。
6. acceptance：九產品面向各有方法、預期及可反駁同候選證據；逐項至少90，必要未測保持null／NOT_RUN，無平均補分。
7. tests：正常例、合法端點與相鄰、奇異導數、超出進度、反序x控制點、重複操作及隱藏／恢復；純測不代原生。
8. handoff：固定兩檔／open draft PR、非作者八節核、同ID修版；production另有合法task/claim，不自ready／代簽。

九產品面向固定為functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility。它們不是本brief已獲得的分數。文件八節ready和產品九面向accepted分開；來源可讀不等於產品可玩／可用，產品程式、測試、瀏覽器與品質評估此時均未執行。

## 6 交件範圍

這次工作只補一份新的完整規格與作者查核，公開必要產品資訊及固定來源，交非作者獨立審查；不是新工具實作。不得寫入私人檔案路徑、工作識別、內部對話、真實輸入、密鑰或無關個人資訊。任何外部操作失敗保留真狀態與原owner，不用其他入口繞過；PR建立不包含批准、合併或部署。
