# ZIP 交件清單核對

預案 spec-zip-delivery-check-20261111；工作 labs-zip-delivery-check-spec-20261111。這是研究簡報，未ready。

## 使用者的具體工作

收件人拿到ZIP和約定的附件清單，需要在歸檔或回覆前知道少了哪些、多了哪些、名稱大小寫是否不符。選真實ZIP並貼上必填預期檔案相對路徑清單，得到完整交件差異表及zip-delivery-report.json。範圍是中央目錄聲稱的檔名與清單比對，不是解壓、安全掃描、CRC或內容完整性證明。畫面把已檢/未檢並列，不能寫『檔案安全』或『ZIP完整無損』。

## 區隔與格式來源

既有archive-path-preflight（a5e7356dae36d2aac3db068352a916d76c7594c3/docs/specs/archive-path-preflight/SPEC.md）只收手貼F/D路徑；file-bundler製作新ZIP。本案必須讀實際ZIP中央目錄及外部預期集合，若拿掉預期清單就應回既有工具擴充。承接前用最新中央來源/registry/PR再次排重。

主統籌2026-11-11已開讀 [PKWARE APPNOTE 6.3.10](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)。只引用原文網址，不把完整規範收入交付。作者逐條核EOCD、central-directory欄位與有界偏移，禁止憑記憶猜欄位。

## 必要範圍

單磁碟、非ZIP64、中央目錄未加密；ASCII或UTF-8旗標名稱。256MiB ZIP、中央目錄4MiB、最多4,000成員；File.slice只讀必要有界尾段與中央目錄，成員資料定向讀取、解壓、解析與保存次數為零，不inflate、不落地解壓。尾段搜尋窗可能重疊成員bytes，這些bytes只參與記錄簽章搜尋，不能宣稱絕對零接觸成員資料。作者需明列實際slice上界與總讀取量。EOCD候選與comment length、central offset/size/count需一致；歧義多候選、截斷、溢位、重疊/越界、ZIP64 sentinel/records、多磁碟、編碼不支援明確拒絕或未檢，不能默默跳過。作者需釘extra field合法性與未知項的覆蓋界線，不能把未檢local-header/CRC當通過。

預期清單為UTF-8純文字一列一個檔案相對路徑，最多4,000列/1MiB；不能trim改名。檔案vs目錄、尾slash、CRLF/BOM、root/..、百分比字元、Unicode、重複與大小寫碰撞需確定規則。預期含不安全路徑應先拒絕，ZIP含風險名稱列診斷、不存成實體路徑。ASCII或UTF-8名稱按原始精確字串配對，大小寫僅輔助提示。

固定例：預期 docs/guide.md、notes.txt；ZIP中央目錄有 docs/Guide.md、notes.txt、icons/a.png。精確相符1、缺件1、多件2，docs/Guide.md作大小寫提示但不抵銷缺件或多件。再驗同名兩條中央目錄、file/dir同基名、../escape、空ZIP、零byte成員、EOCD comment含假簽章、截斷centralentry、offset+size溢界。整檔超限在任何slice前拒絕；中央目錄/筆數超限可讀一次有界尾段，不能繼續讀中央目錄或定向成員資料。另以103-byte短ZIP反例明示尾段重疊3-byte成員資料而沒有定向讀取或解壓。作者產生合成ZIP metadata bytes與獨立逐欄推導，不能把產品parser輸出當expected。

## 規格品質與使用環境

Windows桌面Chrome/Edge主流程，小型行動選檔可驗；不需要原生解壓或安裝。兩語靜態頁、Worker與取消/世代/舊輸出失效、零upload/storage/telemetry，初載後離線。UI清楚顯示『目錄清單相符』與未核內容。完整報告schema/排序/bytes固定，不裁剪下載。

交四檔與八節，九產品面向，明確容量/錯誤優先/二進位offset安全/時間記憶體上界，兩語SEO、Node24內建離線測試及雙次建置hash。所有產品瀏覽器/原生檔案/下載/Network/Storage/真機仍NOT_RUN，本輪不製作產品或操作本地UI。
