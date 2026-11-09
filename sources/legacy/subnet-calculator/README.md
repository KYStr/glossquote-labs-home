# IPv4 子網計算機 · IPv4 Subnet Calculator

在本機以整數精確運算的 IPv4 子網工具：輸入位址與前綴，立即得到網路位址、
廣播位址、可用主機範圍、位址分類（私有／回送／CGNAT／文件範例等）與二進位
邊界；還能切分子網（總數一律精確顯示、清單上限 256）與檢查位址成員資格。
/31 與 /32 用各自的規則明說，不套用減二公式。零 runtime 依賴、不連網、
不儲存，位址不寫入網址。僅支援 IPv4。

An IPv4 subnet tool computed locally with exact integer arithmetic: enter an
address and prefix for the network address, broadcast address, usable host
range, classification (private / loopback / CGNAT / documentation…) and the
binary boundary; split a network into child subnets (the total is always
exact, the list caps at 256) or check whether an address belongs. /31 and
/32 follow their own stated rules instead of a silent minus-two. Zero
runtime dependencies, no network, no storage; addresses never enter the
URL. IPv4 only.

## 功能 · Features

- 嚴格解析（規格 §4）：八位元組必須是正規十進位 0–255，前導零直接拒絕並
  指明段位（歷史八進位混淆）；遮罩必須連續，不連續是具名錯誤；貼上
  `a.b.c.d/n` 會自動拆進位址與前綴欄位，前綴與遮罩欄位雙向連動
  Strict parsing (SPEC section 4): octets are canonical decimal 0–255;
  leading zeros are rejected with the octet position named (historical
  octal ambiguity); masks must be contiguous, a non-contiguous mask is a
  named error; pasting `a.b.c.d/n` fills both fields, and the prefix and
  netmask fields stay in sync both ways
- 精確算術：所有結果都是精確整數——/0 的總數就是 4,294,967,296，不用
  浮點近似、不寫科學記號；核心另有測試內的位元字串獨立實作交叉驗證
  Exact arithmetic: every result is an exact integer — a /0 totals
  4,294,967,296, never a float approximation or scientific notation; the
  tests cross-check the core against an independent bit-string
  implementation
- 可用主機規則三分支：≤/30 總數減二；/31 依 RFC 3021 兩端都可用並附
  說明；/32 主機路由，所有位址就是它本身
  Three usable-host branches: ≤/30 is total minus two; /31 follows
  RFC 3021 with both addresses usable and says so; /32 is a host route
  where every derived address is the address itself
- 分類表以資料出貨：12 列特殊用途範圍依序比對（本網路、私有、CGNAT、
  回送、鏈路本地、文件範例×3、多播、保留），255.255.255.255 會被點名
  為受限廣播；歷史級別另外標示，不與分類混淆
  The classification table ships as data: 12 special-purpose rows matched
  in order (this-network, private, CGNAT, loopback, link-local, three
  documentation ranges, multicast, reserved), with 255.255.255.255 named
  as the limited broadcast; the historical class is labelled separately
- 切分與成員檢查：子網以母網網路位址為起點升序列出，各自的網路／廣播／
  可用範圍都照子網前綴的規則；成員判定用同一遮罩重算網路位址比對，
  結論附帶範圍重述
  Split and membership: children enumerate ascending from the parent
  network address, each with its own usable range at the child prefix;
  membership recomputes the network under the same mask and restates the
  range with the verdict

## 本機開發 · Local development

```sh
npm run dev    # serve the preview at http://127.0.0.1:4173
npm test       # node:test suites (core fixtures + split/membership pipelines)
npm run check  # project check (structure, CSP, forbidden APIs, normative fixtures)
npm run build  # copy public/ to dist/ byte-identically (preview only; production is refused)
```

## 隱私與安全 · Privacy and security

輸入的位址只以文字節點呈現，不寫入 URL、標題、檔名或任何儲存；工具不發出
網路請求。複製摘要只在使用者按下按鈕時發生，內容由結果模型產生（與畫面
相同），不從 DOM 刮取。

Entered addresses render only as text nodes and are never written to the
URL, title, filenames or any storage; the tool makes no network requests.
The copy summary is written only on the button's user gesture and is
generated from the result model — the same values as on screen — never
scraped from the DOM.
