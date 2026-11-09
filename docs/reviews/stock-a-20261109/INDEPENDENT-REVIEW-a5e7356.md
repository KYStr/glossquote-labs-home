# A 組修訂後文件覆核

審查者 `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/stock_b`。覆核固定候選 `a5e7356dae36d2aac3db068352a916d76c7594c3`。 [PR 72](https://github.com/KYStr/glossquote-labs-home/pull/72)

與原審 `aab724b71589664b26c8d92735a637ac37f0c4b2` 比對。81 個固定 PR 檔案中，78 個 Git blob 相同。變更限 `text-file-line-endings` 的 SPEC、AUTHOR-CHECK 與 A manifest。3 個變更的本機 bytes、SHA-256、固定 tree 和 PR blob 相符。保留其餘 19 份的原審結果。

退修項只涉及重跑條件。修訂明訂首次輸出須可作合法輸入，且 strip 模式重跑時不會將先前保留的開頭 U+FEFF 再辨識成 BOM。以 Node 24.14.0 重算 5 件原有成功的位元組案例。4 件一般案例再次處理後 bytes 相同。雙 BOM 的兩次結果依序是 EFBBBF0A、0A。65,536 bytes 的 LF 轉換後為 131,072 bytes，重選回 INPUT_LIMIT。原輸入上限和首次轉換結果維持原契約。

**結論**。20 份預案的八節均核實，可由審查者本人依協作規則辦理文件 ready。實作、產品驗收、真實隔離 Chrome／Edge、正式 HTTPS 與部署仍為 NOT_RUN。

- [原審逐份證據](INDEPENDENT-REVIEW.md)
- [修訂候選 Git blob 差異](candidate-delta-a5e7356d.json)
- [更新後逐份八節結論](readiness-a5e7356.json)
- [受影響位元組案例重算](recompute-a-revision.mjs)
