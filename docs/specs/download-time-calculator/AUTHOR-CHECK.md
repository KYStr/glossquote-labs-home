# 下載時間計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格工作 `labs-download-time-calculator-spec-20261109`（由主代理登記）。這是作者對自己文件的檢查，**不是獨立審查（NOT an independent review）**；八節是否完整、案例是否正確，仍待非作者 reviewer 對同一固定 head 重算核對。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：已比對 base commit `docs/specs/` 全部 101 份預案、`tools/` 與 `sources/`，無 download／傳輸時間同名或同功能預案。最相近者為 `sources/legacy/` 的 `url-inspector`（分析 URL 組成與參數，不涉及檔案大小與傳輸時間）與 `docs/specs/subnet-calculator`（IP 子網路定址計算，不做 bit／byte 傳輸量換算），實質差異已寫入 SPEC scope 節。

- 案例重算：15 筆字面案例（12 核心＋3 controller）。9 筆成功核心案例先以本文固定規則手算（單位係數、800 倍分子式、half-up、完成時刻用未捨入時長並捨去秒數），再以一份獨立的精確有理數（Python `Fraction`）腳本逐案重算，9/9 與手算一致，包括 `efficiency-90` 的 8000/27 秒、`finish-unrounded` 的 59.6 秒（顯示秒數進位為 60、完成時刻仍為 10:00）、`half-up-tie` 的恰 1.5 秒。3 筆錯誤案例依固定驗證順序逐欄推導第一個錯誤。expected 未由任何產品實作產生。

- 與 concept note #33 的出入（依任務指示與事實修正，記錄在此供 reviewer 核對）：
  1. 效率預設值採 **100**（不折減），非 note 的 90；效率定位為使用者自選的折減係數，FAQ 已固定說明 90 的用法。
  2. 不設「十進位／二進位」切換開關；SI（KB/MB/GB/TB）與 IEC（KiB/MiB/GiB/TiB）為分開的單位列舉，兩套換算都精確，避免切換語義含糊。另補 B 與 TiB 使兩套單位對稱完整。
  3. 速度單位固定為 Mbps 與 MB/s 兩種（note 以 Mbps 為主）；常用速度 chips 固定 10/50/100/300/500/1000 Mbps 且僅為填值捷徑。
  4. 開始時間「留空＝現在」由 controller 在執行前解析成本機 HH:MM 快照，核心只收具體時刻，維持核心純函數與案例可重現。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
