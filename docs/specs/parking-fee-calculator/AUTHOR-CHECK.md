# 停車費計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格任務 `labs-parking-fee-calculator-spec-20261109`（由主代理登記，作者未自行 register）。本文件是作者對自己文件的核對，**不是獨立審查**；readiness 須由非作者 reviewer 對同一固定候選另行判定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)，四份文件的 spec id 與案例 ID 互相一致。

- 查重：已比對本 repo `docs/specs/` 全部既有規格目錄與 `tools/` 既有工具，無停車費率主題。本主題無直接近似者；最接近的時間計價工具為 `meeting-cost-calculator`（會議人力成本）與 `electricity-cost-calculator`（用電級距），實質差異已寫入 SPEC 的 scope 節。

- 案例重算：fixtures.json 共 15 筆（12 核心、3 controller）。期望值先依 SPEC 釘死的規則手算，再以獨立的民用日序號（days-from-civil）整數算術重算第二次；9 筆成功核心案例（含跨午夜、每日上限、三日封頂、寬限跨午夜、出場恰在 00:00）逐欄完全一致。3 筆錯誤案例依釘死的驗證順序核對 code 與 field：ORDER/exit、DATETIME_FORMAT/entry、INTEGER_FORMAT/nextPrice。3 筆 controller 案例的 checkpoint 與狀態表逐項對應。

- 概念說明未釘死、由作者決定的語意（皆已寫入 SPEC 為固定規則）：(1) 免費寬限為全有全無：以總停車分鐘判定，超過寬限自入場起全額計費、不扣寬限（與台灣常見停車場「超過免費時間自入場起算」作法一致）；(2) 每日上限採日曆日模型：每個 Asia/Taipei 日曆日獨立起算首段／後續段並各自封頂，不採連續段數跨日延續；(3) dailyCap 填 0 表示無上限；(4) 總停車上限 30 日（43,200 分鐘），日期時間年份範圍 2000–2100；(5) 遺失票卡開啟時以定額取代逐日費用、days 為空，但驗證不放寬且仍回報總分鐘；(6) 出場恰在 00:00 時出場日為 0 分鐘、不列；(7) 寬限免費時逐日列保留 rawFee 與 capped 供核對、fee 為 0。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未經非作者獨評前不計 ready。
