# 文字檔換行與 BOM 檢查 — 作者檢查

作者 `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/stock_a`，來源工作 `labs-spec-stock-a-20261109`，本人 claim `stock-a-claim-20261109`。作者文件核對，待非作者 readiness。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 已比對 r807 130 份預案。近似的 `spec-01-text-workbench`、`spec-04-csv-workbench` 固定規格差異見 scope。

- 7 筆字面核心案例、3 筆 controller 案例。`mixed-bom` 核對點為「檔頭保留，混合 CRLF/CR/LF 轉 LF」。

- double-bom 反例重算為 EFBBBF0A 再得 0A。65,536 個 LF 轉 CRLF 後是 131,072 bytes，重選該副本超限。重跑 bytes 相同只驗首次輸出仍是合法輸入且沒有在 strip 模式重辨前次保留首 BOM 的情境。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
