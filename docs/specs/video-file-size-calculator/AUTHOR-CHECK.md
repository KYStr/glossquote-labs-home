# 影片檔案大小估算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格工作 `labs-video-file-size-calculator-spec-20261109`（由主代理登記，作者不執行 registry 指令）。此為作者本人對文件的檢查，**不是獨立審查**；非作者 reviewer 仍須逐節重算 fixtures 後才能 mark-spec-ready。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：已比對本 repo `docs/specs/`（101 份）、`sources/legacy/` 與同批概念清單。最相近者與差異：`download-time-calculator`（同批概念 #33）算的是「已知大小的檔案要傳多久」（網路傳輸時間），此案算的是「位元率 × 片長先導出大小、再反推容量可錄多久」，未知量與輸入皆不同；`web-media-saver`（legacy）是實際保存/取出媒體 bytes 的動作工具，無估算；`frame-timecode` 只換算 timecode 格式。無同功能既有工具，不取代任何既有 owner。

- Fixtures 共 13 筆（核心 10、controller 3），超過下限 6 筆；含指定的係數案例（`codec-h265-factor`、`prores-480p`）、反推案例（`inverse-card-64gib`、`inverse-tiny-target`）與長時案例（`custom-av1-long`，10 小時）。全部 expected 先由作者依 SPEC 公式手算，再以獨立的精確分數（整數分子/分母）計算逐筆重算一次，兩次結果一致才寫入；未使用任何產品實作產生 expected。重算核對點：四種係數下 videoBps 恆整數（10,000 可被分母 20 整除）；`prores-480p` 的 sizeMB 恰為 705.525 → half-up 705.53；`inverse-card-64gib` 的 floor 餘數 7,077,888 bits 不足再湊 1 秒（需 8,192,000 bits）。

概念 note 與本次任務指示未完全一致或未定之處，作者裁定如下（皆已寫入 SPEC 為固定契約）：

1. **預設位元率表以任務指示為準**：概念 #34 的表（1080p30 10、1080p60 16、4K30 35、4K60 60、8K30 80 Mbps）與任務指示的表（4K60 45、4K30 35、1080p60 12、1080p30 8、720p30 5、480p 2.5 Mbps）不同；採任務指示的六列（標明 H.264 常見經驗值），不設 8K 預設。
2. **音訊選項**：概念 #34 列 128/192/320 kbps，任務指示另加 256 與「無音訊」；固定為 `0/128/192/256/320` 五值。
3. **容器額外開銷不入核心**：概念 #34 提到 container overhead 預設 2%，但任務指示固定的公式為 (視訊+音訊) × 片長 ÷ 8、不含開銷項；從任務公式，容器開銷列為非目標並在揭露句提及容器會使實際大小不同。
4. **ProRes 係數由作者定值**：兩份 note 皆未給 ProRes 數值。固定 ProRes 422 = ×15（對 H.264 經驗基準），並明示 ProRes 實際為依解析度/幀率的目標位元率、此係數是四者中落差最大的經驗換算。
5. **編碼係數兩種來源都套**：依任務指示裁定——預設表是 H.264 基準值，自訂位元率同樣視為 H.264 基準，係數只套視訊、不套音訊。
6. **片長文法**：固定 `^\d{1,3}:[0-5]\d:[0-5]\d$`（時可前導零），999:59:59 上限由文法自然給出；0 秒為 RANGE；不提供純秒數或 MM:SS 輸入形。
7. **捨入管線**：bytes 為 exact bits/8 的 half-up 整數；四個顯示值各自從「未捨入」的精確 bytes 換算、half-up 至兩位小數、固定兩位小數不去尾零；反推模式向下取整至整秒，headroom 以輸出整數相減（targetBytes − usedBytes，恆 ≥ 0）。
8. **不生效欄位語義**：依 mode/bitrateSource 不生效的欄位只做型別、長度與 surrogate 檢查，不做文法/範圍/enum，切換模式不清除也不誤報保留值。
9. **目標大小上限**：不用逐單位數值上限，固定為換算後精確 bytes ≤ 2^53−1，保證全部輸出為安全整數。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，九面向分數 null。未固定候選或未獨評前不計 ready。
