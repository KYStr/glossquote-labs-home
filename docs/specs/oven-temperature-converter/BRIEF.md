# 烤箱溫度換算 / Oven Temperature Converter — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-oven-temperature-converter-20261109`

週末在家烤蛋糕的人，手機上開著英國食譜，家裡烤箱旋鈕只有攝氏刻度：食譜寫 Gas Mark 4、還註明 fan 180°C，她手上有三個對不上的數字，卡在不知道該轉到哪一格。輸入其中一個溫度與單位，再標明這是一般烤箱還是旋風（熱風）烤箱的設定，一次拿到一般與旋風兩種烤箱的 °C、°F 與 Gas Mark 設定，外加一張完整的 Gas Mark 對照表可直接對照旋鈕。

MVP 範圍。°C、°F、Gas Mark 三向換算，以固定的標準 Gas Mark 對照表（¼–10，含 °C/°F 成對值）為 Gas 的唯一依據；公式 °F = °C × 9/5 + 32；Gas Mark 以最接近的表列 °C 選列，平手取較高溫列；旋風調整 −20°C／−25°F 依輸入單位在換算前套用，一般↔旋風雙向。非目標為烘焙時間換算、食譜份量縮放、肉品中心溫度或食品安全溫度、烤箱品牌專屬刻度、儲存或分享結果。

首個可觀察案例。一般烤箱 Gas Mark 4（`gas-input-basic`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、完整對照表、build/check、同一候選的九面向證據。目標 `tools/oven-temperature-converter/`，固定分支與 PR 交驗。
