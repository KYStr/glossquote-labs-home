# 寵物餵食量計算 / Pet Feeding Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-pet-feeding-calculator-20261109`

飼主幫已絕育的成貓換新飼料，包裝上只標每 100 公克 400 大卡；他知道貓 4.5 公斤，卻不知道一天該餵多少克、分兩餐各多少，只能憑感覺抓。獸醫營養指引其實有公開公式：先以 RER = 70 × 體重^0.75 算靜止能量需求，再乘生命階段倍率得每日需求（DER），最後除以飼料熱量密度。本工具把這條公開算法做成可核對的試算：選物種與生命階段、輸入體重與飼料熱量，得到每日熱量、克數（與杯數）及逐餐分配，並常駐揭露這只是估算、須依體態調整。

MVP 範圍。狗、貓兩物種；倍率表為釘版字面資料（來源 MSD Veterinary Manual 公開表，2026-11-09 查證，交叉核對 OSU VMC、Pet Nutrition Alliance、Small Animal Clinical Nutrition 5th ed.）；每 100 公克熱量必填、每杯熱量選填；每日 1–6 餐逐餐分配且合計恆等於全日量。非目標為懷孕／哺乳／工作犬／重症（公開來源僅給階段或窩數相依範圍，無單一可釘版值）、增重處方、體態評分判讀、體重追蹤、混合餵食、單位換算（僅公斤）與任何醫療建議。

首個可觀察案例。已絕育成犬 10 kg、飼料每 100 公克 360 大卡、每日 2 餐（`dog-neutered-default`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/pet-feeding-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
