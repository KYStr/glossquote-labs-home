# 加班費計算機 R3 維護交接

- 維護任務 `labs-remaining-audit-repair-20261110`，修正 FUNC-R3-02、FUNC-R3-03。
- 修正前的來源固定於 [328dee40](https://github.com/KYStr/glossquote-labs-home/tree/328dee40ef0de631d7d50a443e5d5eb2e7668164/tools/overtime-pay-calculator)。
- 原規格任務為 `labs-overtime-pay-calculator-spec-20261109`，原規格、字面案例及作者檢查固定於 [eb7950f](https://github.com/KYStr/glossquote-labs-home/tree/eb7950f87f826a1758d430e7ba7c822d44dc64f8/docs/specs/overtime-pay-calculator)，[原規格 PR](https://github.com/KYStr/glossquote-labs-home/pull/138)。
- [R3 維護里程碑](https://github.com/KYStr/glossquote-labs-home/commit/87d22b52f54bb2c9e92deaf195e9e257d8bf41a2) 釘定此次修正。現行規格為 [R3 SPEC](../../docs/specs/overtime-pay-calculator/SPEC.md)，識別碼 `spec-overtime-pay-calculator-20261109-r3`。其 [字面案例](../../docs/specs/overtime-pay-calculator/fixtures.json) 與 [測試副本](test/fixtures.json) 位元一致。

新表單保留按月試算。使用者逐筆填日期、日別和工時，核心依日計算與捨入，再加總日別與全月。雙語畫面和固定名稱 JSON 報告提供逐日明細。試算採一般月薪制每日 8 小時及月薪對應 240 小時，假日限符合條件的未調移國定假日。計入工時大於 46 小時會顯示提醒與條件摘要。

核心先驗外層、陣列、列的 own data descriptors，拒絕 accessor、舊 schema、額外鍵、稀疏陣列和異常原型。控制器深拷貝並凍結背景快照，以 Worker 與世代共同隔離過期回應。兩語入口、固定 worker 來源、報告序列化、noindex 和預覽安全標頭由既有建置提供。

[實作者驗證](VERIFICATION.md) 記錄命令、雜湊及未驗項。後續同一候選送審、獨立審查、檢視發布和外部重驗由主代理留證。
