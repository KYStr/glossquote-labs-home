# 含稅未稅換算 / Tax-Included Converter — BRIEF

**維護候選，待獨立文件審查。產品檢查 NOT_RUN。** · `spec-tax-included-converter-20261109`

接案者或小商家可在桌面報價、或在手機和客戶核對金額時，取得新臺幣整元的未稅、稅額與含稅金額。用未稅金額正算報價，或從已知含稅總額拆出估算數字。畫面與 JSON 會保留同一份結果。

MVP 保留單筆雙向換算、5% 預設及手填稅率、多筆未稅明細按總額計稅與逐項稅額合計差額。含稅拆分先將估算的未稅金額四捨五入，再以減法取得估算稅額。畫面與 JSON 同時呈現以估算未稅正算的含稅總額，以及正算總額減輸入含稅的差額。估算用於報價與填票前核對；正式開票、申報、特殊稅制與稅率資格判定在產品範圍之外。

未稅 100,000 元、5% 得稅 5,000 元、含稅 105,000 元。含稅 10 元、5% 的估算為未稅 10 元、稅 0 元、含稅 10 元；正算含稅 11 元，差額 +1 元。另有含稅 13 元、4% 的半元反例及負差額案例。見 [字面案例](fixtures.json) 和 [完整契約](SPEC.md)。

取得正式 production claim 後，未來產品在 `tools/tax-included-converter/` 實作。先驗核心與狀態，再完成雙語靜態頁、JSON 匯出、離線命令與隔離瀏覽器驗證，固定 PR/commit 交九面向獨評。本維護修正針對 [原 PR #242 固定版本](https://github.com/KYStr/glossquote-labs-home/tree/21410d31a0d51098e6bc71ede98cc36e9b841f72/docs/specs/tax-included-converter) 的文件缺陷。來源和實際核對見 [維護作者檢查](AUTHOR-CHECK.md)，放行流程見 [預案品質說明](../../SPECIFICATION-STOCK.md)。
