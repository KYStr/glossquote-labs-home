# 體脂率計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格 task `labs-body-fat-calculator-spec-20261109`（由主代理登記，作者未執行任何 registry 指令）。這是作者對文件的自我檢查，不是獨立審查；readiness 須由非作者 reviewer 另行核對。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：已比對本 repo `docs/specs/` 既有規格與工具目錄，無既有體脂率工具。最相近者為 `bmi-tdee-calculator`（以身高、體重算 BMI 與 TDEE 熱量）；本案改以圍度量測與美國海軍 log10 公式算體脂率、脂肪重量與淨體重，不輸出熱量，差異已寫入 SPEC scope。

- 單位管線決策（概念 note 未固定，作者決定）：輸入一律公分，圍度組合先在公分下算，再除以 2.54 套原始英吋公式與原始常數（男 86.010／70.041／36.76；女 163.205／97.684／78.387）。不採公分常數變體版，理由是保留已發表常數原值、轉換只有一處且可稽核。已寫入 SPEC scope 與 inputsOutputs。

- 其他作者決定（概念 note 未固定處）：ACE 整數區間固定解讀為 [下限, 下一級下限) 連續區間並套用到一位小數結果；類別由已捨入體脂率決定；脂肪重量用未捨入體脂率算、淨體重 = 體重 − 已捨入脂肪重量，使兩者相加恰等於體重；未捨入體脂率超出 (0, 75) 為固定錯誤 IMPLAUSIBLE_RESULT；男性臀圍非空為 NOT_APPLICABLE、女性臀圍空值為 EMPTY；對數定義域在公分下比較，等號成立也失敗。

- 公式與類別表來源核對：美國海軍圍度法（Hodgdon & Beckett 1984）英吋公式常數與概念 note 一致；ACE 類別表（男性必需 2–5／運動員 6–13／健身 14–17／一般 18–24／肥胖 25+；女性 10–13／14–20／21–24／25–31／32+）照公開發表版本固定於 SPEC。

- Fixture 重算：12 筆字面核心案例、3 筆 controller 案例。5 筆成功案例的期望值以兩套獨立計算各算一次（50 位精度 Decimal 與 IEEE-754 double），未捨入值、捨入後體脂率、脂肪重量、淨體重與類別全部一致。兩個類別邊界案例（男 24.9845…→25.0、女 31.9869…→32.0）與各自捨入進位點（24.95／31.95）的距離皆 ≥ 0.03，不靠刀鋒值。錯誤案例逐一確認在到達目標檢查前，所有在先的欄位與跨欄檢查都通過（如 implausible-result 用身高 100、頸圍 20、腰圍 300、體重 500 皆為合法端點）。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
