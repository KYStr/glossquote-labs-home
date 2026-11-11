# 薪資換算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（run 5 規格作者；登記、claim 與 submit 由主統籌執行）。作者文件核對，待非作者 readiness，不得自稱獨審。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 已比對本 repo `docs/specs/` 既有 101 份預案，無薪資基準換算工具。近似的 `meeting-cost-calculator`（多人會議人事成本）、`rational-arithmetic`（一般有理數運算）固定規格差異見 SPEC scope。概念筆記 #3 的三條慣例（annual＝monthly×12＋獎金月數、hourly＝monthly÷240、daily＝monthly÷30）全數採納並逐條標為慣例揭露；240 的基礎（30 天 × 8 小時）在 FAQ 中對勞基法的提及僅寫「實務常用同一基礎」，未宣稱法定公式，與一手來源無衝突可修正。

- 字面案例 18 筆：核心 15 筆（成功 9、錯誤 6）、controller 3 筆。每個 expected 以兩種方法獨立推導：
  - 方法一（手算）：依 SPEC 正規月薪 M 與逐項四捨五入手算。要點核對：`monthly-basic` M＝40,000，daily 40,000÷30＝1,333.33…→1,333、hourly 166.66…→167、annualTotal＝40,000×14＝560,000。`annual-fractional-monthly` M＝1,000,000÷13，daily＝1,000,000÷390＝2,564.10…→2,564、hourly＝1,000,000÷3,120＝320.51…→321、annualBase＝12,000,000÷13＝923,076.92…→923,077。`max-monthly-max-bonus` annualTotal＝99,999,999×36＝3,599,999,964。恰 .5 進位兩例：45,000÷240＝187.5→188、183.5→184。
  - 方法二（獨立重算）：另以 Python `fractions.Fraction` 精確有理數腳本，依 SPEC 的欄位順序、逐欄檢查次序（容量→surrogate→EMPTY→文法→範圍）、基準上限與 round half up 公式（2p＋q）÷（2q）重寫，與 fixtures.json 逐案深度比對：15/15 核心案例完全一致、0 不符。controller 兩筆 lateResult 與 `monthly-basic` 的 result 逐欄相等亦經腳本核對。
  - 邊界另核：合法最大值 annualTotal＝10,799,998,920（日薪上限 9,999,999×30×36）< 2^53，JSON 數字精確；金額 0 → RANGE、四基準上限 +1 越界、獎金 24 合法／24.1 RANGE／24.55 INPUT_LIMIT（原始長度 5 超過上限 4）／0.55 DECIMAL_FORMAT 已列入 SPEC tests 的另測清單。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
