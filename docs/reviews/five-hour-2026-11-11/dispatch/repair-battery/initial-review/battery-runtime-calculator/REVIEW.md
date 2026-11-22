> 派工用初審文字快照。原始腳本及完整離線證據保留於本輪交接包；以下非HTTP本地連結以文字保留，並非已發布檔案。原報告 SHA-256：117f2f627888389a0e108f06f5694065c16c0cc5ea40a06cfb576283f4f596d4。

# 電池續航計算規格獨立審查

**文件審查 FAIL · 整體 暫不可放行**

審查人 `local-codex:01a1c87c-f8d5-7e92-8aed-25f805df2a6a`，核對到候選作者、owner 和 contributors 均與本人不同。原 task `labs-battery-runtime-calculator-spec-20261109`，spec `spec-battery-runtime-calculator-20261109`，候選 `13ccc1ccb1d24ca1ec70b1912ad25c65521aa2e9`。登記冊 r1530，讀取時間 2026-11-11 02:51:28 UTC。PR 與 4 份候選檔案逐一核對，詳見遠端讀回（本地證據：../remote-readback.json）。 [固定 PR #253](https://github.com/KYStr/glossquote-labs-home/pull/253)

## 八節

| 必要面向 | 分數 | 結果 | 證據 |
| --- | ---: | --- | --- |
| goal | 97 | PASS | §goal 列桌面筆電、行動電池組、停電路由器三種情境。`phone-basic` 可直接核對 37 Wh、222 分。 |
| scope | 97 | PASS | §scope 固定四模式、放電深度與非目標。活動換電池規格輸入實測分鐘與時段、輸出換組時間表，和本件額定容量／負載估算工作不同。 |
| userFlow | 84 | FAIL | §userFlow 的範例、五種切換後狀態、取消、重設與離頁都可驗。電壓欄欠缺和容量額定口徑的配對提示，反推文案還把模型內進位寫成無條件續航保證。見 BAT-02。 |
| inputsOutputs | 78 | FAIL | §inputsOutputs 固定欄位、首錯與精確算式，但其合法域包含無法透過既定 JSON Number 忠實表示的整數。見 BAT-01。 |
| implementation | 85 | FAIL | 本地純核心、定標整數、Worker 世代和資源撤銷可行。最大輸出的精確整數契約與最終 Number 轉換互相衝突。見 BAT-01。 |
| acceptance | 96 | PASS | §acceptance 預宣告全部九面向、同 head、各項至少 90、必要檢查完整。§tests 指定瀏覽器、正式 SEO 與 Network/Storage 的實測方法。 |
| tests | 88 | FAIL | 28 個純核心與 3 個狀態 fixture 全數吻合。`boundary-max` 只用高負載驗 Wh 模式，缺反推與 pack 合法極端組合，未捕捉 BAT-01。 |
| handoff | 98 | PASS | §handoff 固定文件、原 owner、兩階段里程碑與 `tools/battery-runtime-calculator/`。開啟的 PR 253 只改四份規格文件。 |

## 字面案例

Node v24.14.0，exit 0，31/31 個相符，58 ms。程式只從固定 fixture 讀輸入，算出結果後才比對作者 expected。 驗算腳本（本地證據：verify.mjs） · 逐筆輸入、獨立預期與實際比對（本地證據：fixture-results.json）

`exact-not-display` 以 12.9645 Wh ÷ 0.43215 W 得 30 小時。`state-replace-late` 以第二次工作的電壓錯誤及世代失效核對晚到成功不覆蓋錯誤。反例獨立於作者 fixture。

## 阻擋放行

### BAT-01 合法輸入破壞整數結果與匯出契約

定位 SPEC.md §inputsOutputs、§implementation、§tests；fixtures.json；AUTHOR-CHECK.md。

重現輸入

```json
{
  "mode": "solve",
  "voltage": "3",
  "loadWatts": "1000000",
  "targetRuntimeHours": "100000",
  "depthOfDischargePercent": "0.00001"
}
```

觀察結果。 必要容量精確進位後是 333333333333333333334 mAh，JSON Number 序列化成 333333333333333300000，反解 double 只代表 333333333333333311488。另一 pack 合法案例的正確總分鐘 857142857142857143，double 代表 857142857142857088，輸出時分部也無法還原總分鐘。兩例的完整輸入、差值及欄位見 fixture-results.json 的 extra。

修正驗收。 計算、畫面與匯出共用能表達同一精確整數的契約，反推最小整數不低估且時、分、總分鐘恆相等。若要保留 Number，需明定可驗證的有效域和越界回應。若保留目前輸入域，需釘版可無損的輸出型別。修訂相應 schema、雙語錯誤或格式，將兩例加入字面 fixture 並重跑。

### BAT-02 額定電壓配對與反推保證會誤導商品頁情境

定位 SPEC.md §userFlow 欄位與反推文字、§inputsOutputs 欄位語義、§tests FAQ。

重現輸入

```json
{
  "mode": "runtime-mah",
  "capacityMah": "6000",
  "voltage": "5",
  "loadWatts": "10"
}
```

觀察結果。 範例 6000 mAh 若是 5 V 額定輸出容量，應配 5 V 得 30 Wh、3 小時；畫面只標「電壓」且主例使用 3.7 V，照主例混填會得到 22.2 Wh、2 小時 13 分。以電芯額定容量算供裝置的續航時，轉換損耗另外存在。反推文案「確保不低於目標續航所需」亦未限定理想模型。

修正驗收。 兩語就地提示 mAh 與 V 採同一額定口徑，說明負載所在端以及未建模的轉換損耗。反推文案把進位保證限定於模型內的計算值。用相同電量的額定資料與反推畫面核對文案，保留原有四模式。

## 非必要改善

- 時、分與一位小時小數各自捨入。`half-up-tie` 顯示 2.3 小時和 2 小時 15 分時，畫面可用「約」幫使用者辨認顯示精度。

## Production 繼承契約

**REG-01 · FAIL，阻擋 ready。** 登記冊 r1530 的 `spec.acceptanceCriteria` 是原規格製作 task 的八節。前表的文件評分維持獨立。

- 原規格製作 task 的面向。 `goal`、`scope`、`userFlow`、`inputsOutputs`、`implementation`、`acceptance`、`tests`、`handoff`。
- 已登記 spec 的面向。 `goal`、`scope`、`userFlow`、`inputsOutputs`、`implementation`、`acceptance`、`tests`、`handoff`。
- 應繼承的產品面向。 `functionality`、`boundaries`、`privacy`、`security`、`usability`、`accessibility`、`localization-seo`、`toolchain-provenance`、`compatibility`。

由主統籌依維護流程更正登記，保留原規格 task、候選和 owner；讀回相符九面向後才重評 ready/可開工。

## 九項產品檢查

以下是規格已列的未來驗證路徑。產品檢查均為 NOT_RUN，分數均為 null。

| 面向 ID | 文件中的驗證路徑 | 結果 |
| --- | --- | --- |
| functionality | 四模式結果和 JSON 報告；§tests 28 筆核心案例，修訂需加 BAT-01。 | NOT_RUN |
| boundaries | 第一錯誤、逢五進位、最大端點和 3 筆控制器案例。 | NOT_RUN |
| privacy | 載入後重跑和重設，查 Network、Storage、URL、console。 | NOT_RUN |
| security | 敵意資料、CSP、固定檔名、上限、Worker 與 Blob URL 撤銷。 | NOT_RUN |
| usability | 兩語桌面與行動實作後驗空、忙、錯、改、取消和下載。 | NOT_RUN |
| accessibility | 鍵盤、焦點、狀態、320 CSS px、實際 200% zoom、對比和觸控。 | NOT_RUN |
| localization-seo | 兩獨立 HTML、同語首頁、候選 noindex、正式雙語 canonical/hreflang。 | NOT_RUN |
| toolchain-provenance | Node 24、check/test/build、雙次重建 bytes、候選 SHA 與 PR head。 | NOT_RUN |
| compatibility | 隔離 Chrome 與 Edge 兩語路徑、Worker、Blob 下載與 reflow。 | NOT_RUN |

## 來源

- 額定續航與活動換組排程的輸入、輸出不同。 [固定活動換電池規格 §goal、§scope](https://github.com/KYStr/glossquote-labs-home/blob/c8edde6a8d2a83d69a5ef863057184d0ee5022d0/docs/specs/battery-swap-plan/SPEC.md)
- 以容量對應電壓換算 Wh，區分電芯、額定輸出與電路損耗。 [Anker 官方容量說明](https://service.anker.com/eu/article-description/Why-Is-the-Rated-Capacity-Marked-on-a-Power-Bank-Lower-Than-Expected)
- 確認倍率會影響可用容量，Peukert 是本案排除的近似模型。 [Victron BMV-700H 手冊](https://www.victronenergy.com/media/pg/BMV-700H/en/battery-capacity-and-peukert-exponent.html)
- 50% DoD 是特定深循環範例的設計假設，可用容量仍隨溫度和循環條件改變。 [Rolls Flooded Battery 技術說明](https://support.rollsbattery.com/en/support/solutions/articles/246381-flooded-battery-capacity-temperature)

GitHub 審查登記尚待主統籌分配寫入時段。
