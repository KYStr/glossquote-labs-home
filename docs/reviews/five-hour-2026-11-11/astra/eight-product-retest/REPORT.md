# PR331 八款產品兩項已知缺陷獨立複驗

**兩項已知缺陷在固定候選的離線受控範圍通過；完整產品不得 accepted。** 必要瀏覽器/UI/無障礙/隱私/相容性檢查仍未跑，requiredChecksComplete=false。這不是文件八節review，也不是產品九面向全部通過。

候選 [PR331](https://github.com/KYStr/glossquote-labs-home/pull/331)，固定 **612eb289281b526267a1d968b71a4579ac9c4165**。原來源PR283 **448bd9fc9865fe65f6014b66f4a2e2d54b76f539**，首次相同bytes遷移 **9834f940d7e5fcb4a0b7e381607e56b2ef2e6f46**。實際獨立reviewer為 local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/five_hour_astra_review。

## 獨立執行結果

| 工具 | 舊回覆拒絕 | controller對照 | URL失敗/正常清理 |
|---|---:|---:|---:|
| age-calculator | 8/8 | 3/3 | 2/2 |
| bill-split-calculator | 8/8 | 3/3 | 2/2 |
| clothing-size-converter | 8/8 | 3/3 | 2/2 |
| dew-point-calculator | 8/8 | 3/3 | 2/2 |
| feels-like-temperature | 8/8 | 3/3 | 2/2 |
| period-cycle-calculator | 8/8 | 3/3 | 2/2 |
| race-time-predictor | 8/8 | 3/3 | 2/2 |
| salary-converter | 8/8 | 3/3 | 2/2 |

本人重用原獨立反例設計，僅換成新固定pins與8款動態計數。Node v24.14.0：race-probe.mjs **88/88 exit0**，url-probe.mjs **16/16 exit0**，共104情境。四種過渡為run-again/cancel-run/edit-run/reset-run，各送舊成功及舊validation error；另驗目前成功、錯誤payload generation、舊onerror，且拒絕舊訊息後真目前回覆仍能結束工作。URL案例讓new Worker同步throw相同sentinel，確認原exception與同一URL的revoke；另正常terminate對照。

原baseline相同八款曾有64個舊回覆失敗和8個URL失敗。新候選沒有這些反例；不是只看新增if條件，也沒用作者自己的成功摘要替代本人執行。完整 [race結果](race-results.json)、[URL結果](url-results.json)及 [portable入口](REPRODUCE.md)可反駁。

## 實際來源與差異

本人下載36個固定公開檔（32程式來源與4候選證據），逐檔驗Gitblob/bytes。從GitHub未截斷tree核八個工具整個目錄在migration commit與原PR283的tree SHA完全相同；修正後8個純core及8個worker-handler的16個blobs仍等於原來源，不重新計算未變數學。

遷移後實際差異44檔，只有每款5檔（public controller/app、兩份對應preview產物及BUILD-MANIFEST）加4份維護證據。本人親讀全部16個public程式patch：controller以目前worker身分、目前generation、busy共用guard；app在constructor同步throw時revoke再throw，正常terminate含一次性guard及finally revoke。[來源與完整patch](source-lineage-and-diff.json)保存固定tree/路徑。

作者HANDOFF報告既有382項測試、static/generated checks、兩次build bytes以及自己88 controller/40 URL測試。這些是**provided**；本人沒有重新跑該整套、沒有冒稱原作者的616/646或maker382為本人測試。額外重複terminate/native terminate throw/retry的maker URL案例不在本人16案範圍內。

## 九面向覆蓋

| 面向 | 本人證據／缺口 |
|---|---|
| functionality | 變更controller子範圍PASS；完整產品運算及真browser流程未驗 |
| boundaries | 64舊回覆、24對照、16URL案例PASS；不是全工具所有邊界 |
| privacy | diff無新增傳輸；真Network/Storage NOT_RUN |
| security | guard及假VM清理PASS；真CSP/isolation/resource lifetime未驗 |
| usability | 離線state/flags有驗；真桌面/行動UI NOT_RUN |
| accessibility | 真鍵盤/焦點/朗讀/reflow/device NOT_RUN |
| localization-seo | maker雙語preview/build證據為provided；本人未驗live SEO |
| toolchain-provenance | 本人固定來源/遷移/diff/104案PASS；整套build/check為provided |
| compatibility | Chrome/Edge/實際裝置/原生下載 NOT_RUN_USER_FOCUS_INCIDENT |

機器格式 [coverage.json](coverage.json)。不為缺少必要檢查的產品虛填90分，也不把「修正兩缺陷通過」當作九面向完整accepted。任何正式review須先綁真正submitted candidate和全部makers，必要檢查未完整不得accepted。

## 作者與程序界線

修正task labs-five-hour-product-controller-race-20261111，owner local-codex:01a1c8a9-dc04-7bc2-b1c2-e2e445213844，claim fh-controller-race-01a1c8a9-claim-20261111；r1661實讀仍working且submission=null。本輪只對先公開固定source獨立複驗，未冒稱已正式submit/review。原cloud作者、PR283 maintenance實作者與root整合者全保留；本reviewer只寫證據，不是產品maker，也不代任一owner簽核。未來formal review仍需最新submit/作者閉包核實。

沒有產品改動、registry寫入、合併、ready或部署。注入Worker/VM不開真browser，未測實際終止前後事件派送頻率。Windows環境完整前後指紋一致，原始指紋不公開。MAP8文件正式review另用獨立固定證據，這份結果不可混入其accepted含義。

