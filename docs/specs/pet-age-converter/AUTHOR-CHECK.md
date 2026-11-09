# 寵物年齡換算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格工作 `labs-pet-age-converter-spec-20261109`（由主代理登記）。這是作者本人對文件的檢查，**不是**獨立審查；文件是否 ready 須由非作者 reviewer 對同一固定候選實核八節後決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 去重聲明：已比對本 repo `docs/specs/` 全部既有預案（101 份）與 `tools/`（5 款），無 pet-age-converter 或任何動物年齡換算。最相近者為 `pregnancy-due-date-calculator`（人類孕期日期推算）與 `bmi-tdee-calculator`（人類體重熱量），對象與模型皆不同，差異已寫入 SPEC scope 節。概念註記（#24）原評「Nearest: none」，與盤點結果一致。

- 案例重算：fixtures.json 共 15 筆（12 核心 + 3 controller）。12 筆核心案例先以手算依 SPEC 的月段模型逐筆推出（N12 整數單位、t = floor((10 × N12 + 6) / 12) 捨入式、階段以 N12 與 12 × 門檻比較），寫入後再以獨立的第二遍計算（另一段一次性驗算程式，未交付、非產品程式）全數重算比對，12/12 深度相符，0 不符。重點核對點：`dog-small-second-segment-proration` 的精確值 20.25 經 half-up 為 20.3；`cat-senior-threshold`（精確 H 恰 75）與 `dog-large-mature-threshold`（精確 H 恰 45）驗證門檻含下限；`dog-max-boundary` 驗證總月數上限 360 恰達合法、`dog-over-max` 361 越界。3 筆 controller 案例的 lateResult 物件已核對與對應核心案例的 result 逐字相同。fixtures.json 已驗證可解析為合法 JSON。

- 完整性自查：分段模型以月為段界定義（0–12／12–24／24 以上），折算無歧義；狗四體型與貓的第三段年增量（4／5／6／7／4）、生命階段五段與各體型 T1／T2 門檻、體型中英標籤與常見品種例（明示僅顯示文案）皆已釘入 SPEC；年齡界線為總月數狗 0–360、貓 0–456，歲欄位上限 38、月 0–11；驗證順序（形狀→容量／surrogate→逐欄 species/size/years/months→跨欄總月數）與固定錯誤碼／欄位路徑已釘死，含「狗需體型、貓帶體型值為 ENUM」的不對稱規則；1 位小數 half-up 以整數式定義，階段以精確值判定；雙語字串含 H1／title／description、經驗法則提醒、3 條 FAQ、8 個錯誤碼訊息對照；流程六狀態（empty/dirty/busy/success/error/cancelled）與重設預設值已定義；九面向已於 acceptance 節預宣告。

- 概念註記未釘、由作者決定並釘入 SPEC 的事項：(1) 總月數上限取狗 360（30 歲）、貓 456（38 歲），對應已知最長壽紀錄量級，並以總月數而非歲欄位執行上限、越界報 RANGE／years；(2) 生命階段門檻 T1／T2 的具體數值（概念只要求「per species/size 釘表」）取狗小型 65／85、中型 55／75、大型 45／65、巨型 38／55、貓 55／75，以精確 H 比較、下限含；(3) 貓＋體型值在核心判 ENUM／size，app 層選貓時清空並停用體型欄，兩層並存；(4) 本工具不提供任何下載／匯出產物（概念未要求），controller 案例以 resultAvailable 取代範本的 reportAvailable；(5) 計算為同步純函數，controller 以一次可取消的延後排程執行，不使用 Worker、不假造進度；(6) 三段顯示值各自獨立捨入、合計可差 0.1，不做校正並於 FAQ 揭露。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
