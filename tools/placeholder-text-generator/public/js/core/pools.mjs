// Auditable data pools, pinned by SPEC.md section 4. Shipped as data, never
// fetched. Any change to these lists is a data change: the audit tests in
// test/pools.test.mjs (count + checksum for Latin, form rules for zh) fail
// loudly on a transcription slip.

// The canonical opening sentence (SPEC sections 2e, 4). Exact, including the
// trailing full stop.
export const OPENING_SENTENCE =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

// Latin word pool: the vocabulary of the traditional Lorem ipsum passage
// (the Cicero-derived text in the public domain, as printed as the standard
// passage by lipsum.com), each distinct word exactly once, lowercase, in
// order of first appearance. The passage transcribed:
//   "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
//    tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
//    veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
//    commodo consequat. Duis aute irure dolor in reprehenderit in voluptate
//    velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint
//    occaecat cupidatat non proident, sunt in culpa qui officia deserunt
//    mollit anim id est laborum."
// Recorded audit values (test/pools.test.mjs): 63 words; SHA-256 of the
// words joined by "\n" (UTF-8, no trailing newline) is
// 8d30bdc345fbcf258b2dc2c73747d2dc6f22e6964271ca1ddfaa5ebfa9ec4bc3.
export const LATIN_WORDS = Object.freeze([
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing",
  "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore",
  "et", "dolore", "magna", "aliqua", "enim", "ad", "minim", "veniam",
  "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi",
  "aliquip", "ex", "ea", "commodo", "consequat", "duis", "aute", "irure",
  "in", "reprehenderit", "voluptate", "velit", "esse", "cillum", "eu",
  "fugiat", "nulla", "pariatur", "excepteur", "sint", "occaecat",
  "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum",
]);

// Traditional Chinese sentence pool: complete neutral sentences authored for
// this tool (SPEC section 4: at least 24; everyday, content-free statements
// about weather, errands, rooms and objects; no opinion, name, brand or
// advice; each ends with 。). Printed in full in the product help, in both
// UI languages, exactly as listed here.
export const ZH_SENTENCES = Object.freeze([
  "今天早上的天空是淺藍色的。",
  "窗邊的桌子上放著一個空杯子。",
  "巷口的麵包店每天早晨開門。",
  "這條街的兩旁種了幾棵大樹。",
  "傍晚的風從河邊慢慢吹過來。",
  "書架上整齊地排著一列舊書。",
  "廚房的水龍頭滴著細細的水聲。",
  "明天可能會下雨也可能不會。",
  "公車剛剛從站牌前面開過去。",
  "房間的角落放著一把木頭椅子。",
  "牆上的時鐘慢慢地走著。",
  "院子裡的花盆排成一列。",
  "早晨的市場已經有人在走動。",
  "那扇門的顏色是淡淡的綠色。",
  "桌上的紙張被風吹動了一下。",
  "樓梯間的燈在夜裡亮著。",
  "河面上有幾片落葉漂著。",
  "這間屋子的窗戶朝向東邊。",
  "巷子盡頭有一面斑駁的牆。",
  "午後的光線落在地板上。",
  "抽屜裡放著幾條摺好的毛巾。",
  "遠處傳來火車經過的聲音。",
  "樹葉在微風裡輕輕晃動。",
  "這條小路通往山腳下的村子。",
  "杯子裡的茶已經慢慢涼了。",
  "陽台上的盆栽葉子綠綠的。",
  "夜裡的街道安靜了下來。",
  "信箱裡躺著一封還沒拆的信。",
  "屋簷下掛著一串風鈴。",
  "田邊的小溝裡流著清水。",
]);
