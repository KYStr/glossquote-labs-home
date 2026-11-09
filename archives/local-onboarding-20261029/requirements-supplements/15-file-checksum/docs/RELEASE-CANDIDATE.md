# 發布候選

## 目前核實 — 2026-10-19 / PUBLIC SOURCE PASS，部署與首頁待主代理

Repo https://github.com/KYStr/glossquote-labs-file-checksum 已核實PUBLIC／main；固定遠端commit **eab1da8e69e896be00ff1be54095641352a280a7**。已下載公開來源ZIP，146,418 bytes、SHA-256 **dd0004043394fe78395adf2876d0c3e22ce0608d810e7f35bac012f117055293**；41檔與每個Git raw blob、manifest、remote tree及解壓bytes一致，路徑／類型／CRC32通過。

解壓副本check／兩模式build／production check／required releasegate均exit0，17／15／10個產物保持T04 bytes。全套142不在owner重跑，主代理正在從同一固定ZIP獨立驗收。來源已公開，hosting／首頁／外部複驗仍待主代理；只保留T02／T03 scoped GO，不稱full MVP。完整收據見工作區[HANDOFF](../HANDOFF.md)及孵化器T05 evidence；本節是發布後本機交接文件，不在既定public commit內，未為文件收據額外重推。

## T05發布前快照 — 2026-10-19 / reviewed source

T04已由主代理讀實際diff／scope-proof並獨立驗release 12/12、check PASS，T05公開來源已放行。此快照限固定41檔來源，只改T05發布文件；public／runtime／build／tests／wrangler原bytes不變。目標repo為https://github.com/KYStr/glossquote-labs-file-checksum，候選正式origin為https://checksum.glossquote.com；不把source公開稱已上線。

固定commit由Git HEAD識別，PUBLIC與來源ZIP的實測收據由原對話／主代理保留，避免來源文件自引自己的commit／ZIP。T04原142/142結果沿用，主代理會從固定公開ZIP再跑完整驗收。來源ZIP必須實際下載／解壓，全部41檔與Git blob、manifest逐byte相等；解壓副本check／preview及production build／production check／required releasegate後，產物須等於T04固定清單。沒有部署或首頁動作，外部複驗尚未開始，瀏覽器PARTIAL／NOT_RUN與scoped GO邊界維持。

## T04交接歷史 — 2026-10-19 / FROZEN

主代理已依station-v3原始R1及focused-r2實測給T02／T03 scoped GO，僅放行T04，不是完整MVP接受。T04工具鏈已實作：preview十五檔／production十七檔、固定 **https://checksum.glossquote.com** 的雙語SEO／JSON-LD／robots／sitemap、安全headers及strict404。public十檔、正式八個JS／CSS保持原bytes；正式head加入SEO，body只移除預覽未發布片語且保留切換語言提醒，沒有改核心／controller／Worker／UI功能。

npm test **142/142**，0 fail／cancel／skip／todo；R2的check、build:production、check:production、required release:check均exit0；preview build沿用R1且25個preview／legacy檔案bytes未變。環境guard before／pre-final／after完整指紋相等，沒有持久環境變更。純Node HTTP model另列自動層，不當Cloudflare／瀏覽器PASS。初次新增測試的FAQ範圍斷言FAIL及修正後PASS log皆保留。

凍結來源／產物／精確manifests／diff／scope-proof／logs在孵化器 `.runs/file-checksum/t04-20261019/`，詳見[HANDOFF](../HANDOFF.md)及[發布契約](RELEASE.md)。主代理瀏覽器已補兩語真128MiB、實際+1邊界及精確65-byte managed downloads；H24本地Blob terminal與H26舊document取樣仍PARTIAL，其他manual／focus incident NOT_RUN保留，原R1三個FAIL不刪除。

**T05 push未放行，尚非READY_FOR_INTEGRATION／已上線產品。** 正式產物瀏覽器／平台live驗收、public source與固定commit、部署／首頁及外部複驗未完成。此輪沒有瀏覽器／Computer Use、Git auth／憑證、push／部署／首頁動作，也不另造交付ZIP；主代理持有後續整合與單一外層ZIP交付。

## 歷史 — 2026-10-13 / HASH-T02-R1 FROZEN，瀏覽器補驗待辦

R1僅更正HANDOFF／本文件／project.json的驗收分類與結果，32個runtime hash和ACCEPTANCE／TASKS保持原值，沿用130/130及check/build證據而未重跑。**H11真128MiB計算及H12實際128MiB+1拒絕是T02已授權必要驗收，仍NOT_RUN**。正式原生picker以3-byte假檔預檢496ms，仍要求extension file URL權限；未擴權、繞過或把合成metadata當真選檔，也未建立／讀取大檔。

真正點擊產品中英anchor往返兩項PASS，URL及新頁空草稿／結果已觀察，僅補H27語言子項。原生下載另以有真bytes的3-byte合成File獨立一次測試；NativeWorker/WebCrypto結果精確為abc literal，UI及65-byte Blob／URL回收可觀察，但10秒download event無回傳（10,026ms），實體path／bytes／artifact SHA仍NOT_RUN。不能因此稱H22或T02全面驗收通過。新固定manifest／JSON／JPG／guard在 `.runs/file-checksum/t02-r1-20261013/`，舊T02證據與更正前文件保留，詳見[HANDOFF](../HANDOFF.md)。

Owner已釋放待R1主驗，仍未READY_FOR_INTEGRATION；T03及source發布未放行，完整Goal未宣告完成。

## T02 初次交接（歷史，H11/H12分類已由R1更正）

T01 已正式主驗接受，T02 已依 CHECKSUM-T02-UI 授權完成兩語互動與真 Blob Worker 接線。最終 npm test 130/130、0 fail/skip，npm run check/build exit 0，10 個 preview 資產；guard 完整 snapshots 前後相等。依使用者偏好以瀏覽器 API 測 Edge，23 項觀察 PASS，沒有本輪原生 Computer Use 操作。固定來源／runtime／build manifests、真實 logs、圖片和逐項 NOT_RUN 在 `.runs/file-checksum/t02-20261013-01a12e45/`，範圍與限制見 [HANDOFF](../HANDOFF.md)。

Owner 已釋放，等待 T02 主代理獨立驗收。**尚非發布候選、未 READY_FOR_INTEGRATION。** Chrome API 不可用；Edge 原生選檔受既有擴充功能權限限制；原生下載僅有請求 UI，未觀察實體落盤65bytes；真200% browser zoom沒有API；舊頁pagehide資源觀測不可讀。這些必要缺口保持 NOT_RUN，不能以 synthetic File、Node或viewport窄化替代。H11真128MiB digest及H12實際+1拒絕屬已授權T02必要補驗，仍NOT_RUN；真Network／Storage／Offline／60秒／BFCache留在未授權T03。正式SEO、public repo/commit/ZIP、免費hosting／首頁／外驗未執行。

threadId／Sol max 設定請求保持原值，backend 未獨立確認。App Goal 實際仍 blocked，本輪以正式 T02 指示續作，未宣告整體產品完成。

## T01 交接紀錄（歷史） — 2026-10-12 / FROZEN

T00 已正式主驗接受後，原功能對話實際獲 CHECKSUM-T01-CORE-WORKER 授權。T01 固定 checksum API、immutable session、exact Worker 協定、自足 Worker／bytes 生成檔及自動測試完成；npm test 112/112、0 skip，check/build exit 0，Windows 完整 guard 指紋未變。固定 manifest、完整 gate／scope／未驗項在 `.runs/file-checksum/t01-20261012-01a12e45/` 與 [HANDOFF](../HANDOFF.md)。threadId／Sol max 請求不變，backend 未獨立確認，Goal active。

此仍不是發布候選、尚未 READY_FOR_INTEGRATION。兩語 UI 保持停用；T01 owner 釋放供主代理親驗，T02 尚未批准。Node／fake scope／reducer 證據只算自動層，真 Blob Worker、主要 UI/下載/大檔、production SEO、公開 repo/固定 commit/byte-preserving ZIP、免費 hosting/首頁及外驗全部 NOT_RUN。沒有公開或部署停用骨架。

## T00 交接紀錄（歷史）

原功能對話已實際建立：threadId=`01a12e45-d062-76b3-9263-bc7a7fb29f42`、host=local；gpt-6.1-sol/max 請求獲工具接受，backend 身份未獨立確認。停用雙語骨架及真正 dev/test/check/build 已實作；最終 npm test 69/69、0 skip，npm run check/build 均 exit 0。主驗 active-robots 缺陷已重現、修正並以相同原 repro 驗 4/4；最終文件清單與環境前後指紋在 `.runs/file-checksum/t00-20261012-01a12e45/`，詳見 [HANDOFF](../HANDOFF.md)。

此為 T00 主驗交接，**不是可發布產品候選，尚未 READY_FOR_INTEGRATION**。主代理獨立 gate 已通過，等待最終 runtime manifest 匹配與實際 T01 指示。核心/Worker、產品瀏覽器測試、正式 SEO、GitHub PUBLIC/固定 commit/來源 ZIP、hosting、首頁及外部複驗全部 NOT_RUN；不得公開空骨架當完成品。Goal 已實際建立、維持 active；owner 釋放供唯讀主驗。

## 規格期紀錄（歷史原文）

SPEC_ONLY，非發布候選。程式/測試/source公開/hosting全NOT_RUN，尚無commit或部署ID。預定repo https://github.com/KYStr/glossquote-labs-file-checksum；候選https://hash.glossquote.com/index.html及/en/index.html。預定值不是成功證據。

交付時填實際檔案hash與固定來源ZIP（排除node_modules、.runs、秘密）、public remote HEAD、必要命令/exit、瀏覽器證據/限制、production manifest、headers與雙語SEO，以及待主代理驗收事項。通過後READY_FOR_INTEGRATION；必要FAIL则BLOCKED；只有主代理真部署並驗證才寫live。外部複驗确认仍必須另外記錄。
