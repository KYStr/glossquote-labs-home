# 百分比計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，來源工作 run 4 規格補庫（使用者指示再建立 40 件日常小工具），概念編號 2。本文件是作者對自己文件的核對，**不是獨立審查**；ready 與否由非作者 reviewer 決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 去重聲明：已查 `docs/specs/` 全部預案目錄、`tools/`、`sources/candidates/`、`sources/legacy/` 的 slug 清單，沒有 `percentage-calculator`，也沒有其他做「三種百分比關係」的工具。最相近的是 `weighted-percentile`（對資料集算加權百分位統計；本案是單次兩運算元關係）與 `bakers-percentage-calculator`（烘焙配方以麵粉為 100 的比例；運算元與語意不同），差異已寫入 SPEC 的 scope。
- Fixture 複算：共 24 筆（21 核心 + 3 controller）。12 筆數值案例先依 SPEC 規則手算，再以獨立的 Python `fractions` 精確有理數運算第二次複算（包含 10 位 value 與 2 位 display 的 half away from zero 捨入、display 由精確值而非 value 捨入、負基數 change 的字面結果 −150 與 direction increase），兩次一致才寫入。9 筆錯誤案例逐項對照 SPEC 的驗證順序與 field/code；3 筆 controller 案例對照狀態表與預設值。
- 完整性自查：公式、捨入位數與同點規則、驗證順序（mode → first → second → 除零）、固定錯誤碼與欄位、輸入上限（raw 24 字元、絕對值 999,999,999,999）、正規字串與回顯規則、flow 六狀態、雙語標籤／句型／錯誤訊息／FAQ、九面向預宣告、交接與規格任務 id 均已固定，沒有留給製作端自行查表或決定的規則。概念 note 未固定的欄位模型、文法與上限、value 精度 10 位、報告格式與預設值，由作者決定並寫死在 SPEC，請 reviewer 特別核對這幾處。
- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未經非作者獨評前不計 ready。
