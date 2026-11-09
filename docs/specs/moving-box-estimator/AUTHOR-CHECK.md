# 搬家紙箱估算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格工作 `labs-moving-box-estimator-spec-20261109`（由主代理登記；作者未執行任何 registry／coordination 指令）。文件基線為 `codex/initial-publication` 的 `8f1714ab261e9cf33daf2ab9fc71dc26b66da5b6`。此為作者文件核對，待非作者 readiness，不是獨立審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：已比對 `docs/specs/` 101 份預案、`tools/`、`sources/candidates` 與 `sources/legacy` 快照，以及 registry 現行 specs／tasks，無同 slug 或同功能工具。最相近者與實質差異已寫入 SPEC 的 scope 節：`spec-55-moving-boxes`（搬家裝箱與物品定位，記錄每箱內容物與位置；reserved，其 task blocked 且有原 owner，本預案不取代、不重領）、`spec-22-packing-list`（行李清單與重量試算，旅行清單與克重）、`spec-parcel-billable-weight-20261109`（快遞計費重量）。本工具只在裝箱之前估採買數量，輸入輸出與三者皆不重疊。

- 概念筆記未固定、由作者定案並寫入 SPEC 的決策：加量開關定為五個——概念指定的書很多 +8 小箱、廚房大 +6 中箱、已居住 5 年以上 +20%，另加衣物多 +5 中箱、易碎品多 +4 小箱；套用順序固定為尺寸加量先算、+20% 上調後算（上調基數含加量，上調箱數全計中箱）；尺寸拆分固定小 30%／中 50%／大 20%，小與中無條件進位、大箱取餘數，三尺寸恆合計為總箱數；耗材固定膠帶每 10 箱 1 捲、包裝紙每 10 箱 1 捲且易碎品多時多備 1 捲，皆無條件進位。基準箱數依概念筆記視為中箱當量的總箱數，再依比例拆分。

- 8 筆字面核心案例、3 筆 controller 案例。每筆成功案例先以分數手算（百分比與進位逐項展開），再以獨立算式重算一次，兩次結果一致；每個成功案例皆核對 small+medium+large = totalBoxes。`four-bedroom-all-options` 核對點為「最大戶型、全開關、上調 ⌈103/5⌉=21」；`studio-plain` 核對點為「拆分進位與餘數歸大箱」。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
