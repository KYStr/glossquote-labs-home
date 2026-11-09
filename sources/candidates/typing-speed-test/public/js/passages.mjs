// Bundled passage sets for the Typing Speed Test.
//
// Every passage was written for this tool (see PASSAGES.md for the
// source lines). English passages are 600-900 characters of plain
// prose using only letters, spaces and the punctuation set
// . , ; : ' ? ! with single spaces and no digits. Chinese passages
// are 300-500 characters, common-use characters with punctuation
// limited to ，。、；：？！「」 and no spaces. The core suite validates
// every passage against these rules, including BMP-only content with
// no combining sequences, so code points and UTF-16 units coincide.

export const PASSAGES = Object.freeze({
  en: Object.freeze([
    Object.freeze({
      id: "en-market",
      title: "The Morning Market",
      text: "Early in the morning, the market wakes before the rest of the town. Farmers unload crates of greens, oranges, and fresh bread while the light is still soft and grey. A woman arranges flowers in buckets of water, and their colours brighten the whole lane. The fish seller calls out his prices in a cheerful voice, and the baker laughs as he slides warm loaves onto the wooden counter. People arrive with baskets on their arms, greeting neighbours they have known for years. Nothing here is hurried, yet everything moves with a quiet purpose. By the time the sun climbs over the rooftops, the square is full of voices, and the day has truly begun.",
    }),
    Object.freeze({
      id: "en-river",
      title: "A Walk by the River",
      text: "There is a path beside the river where the willows lean over the water and the gravel crunches softly underfoot. In the early evening, couples stroll there with their hands in their pockets, and old men sit on the benches to watch the boats drift past. A heron stands in the shallows, patient as a statue, waiting for a fish to wander near. Children throw flat stones across the surface and argue about whose stone skipped the farthest. When the lamps come on, the water carries their light in long trembling lines, and the whole scene feels calm, ordinary, and quietly beautiful in a way that asks nothing of anyone.",
    }),
    Object.freeze({
      id: "en-library",
      title: "The Little Library",
      text: "On the corner of our street stands a little library that smells of paper, dust, and rain on warm stone. Its shelves are narrow and its chairs are worn, but its readers defend it fiercely. The librarian knows every regular by name and keeps a mental list of who loves maps, who loves poems, and who pretends not to love romances. Students crowd the long tables in winter, sharing lamps and silence. When a storm knocks out the lights, she lights candles and reads aloud, and nobody leaves until the page is finished. It is not a grand place, yet the town would be poorer without it, and everyone knows it.",
    }),
    Object.freeze({
      id: "en-kitchen",
      title: "Grandmother's Kitchen",
      text: "My grandmother's kitchen was small, warm, and always faintly sweet with the smell of steamed rice. She cooked by memory and by instinct, tasting with the back of a spoon and adjusting with a pinch of this or a splash of that. Recipes, she said, were only suggestions for people who had not yet learned to listen to a pot. On Sundays she made dumplings by the hundred, her fingers folding the edges faster than our eyes could follow. We children were given the crooked ones to practise on, and she praised our lopsided work as if it were art. Years later, her flavours remain the standard every meal is judged by.",
    }),
    Object.freeze({
      id: "en-train",
      title: "The Night Train",
      text: "The night train leaves the city after dinner and crosses the dark plains while its passengers sleep in their seats. The conductor walks the aisle with a lantern, punching tickets and nodding to the regulars he knows by sight. Outside the windows, farmhouses appear and vanish like brief islands of light. In the dining car, a few travellers linger over tea and quiet conversation, watching the moon keep pace with the train. Toward dawn the sky pales, the wheels slow their rhythm, and the train sighs into a small station where nobody waits but the stationmaster and his cat, both half asleep. The porters yawn, stretch, and check their watches against the big clock.",
    }),
    Object.freeze({
      id: "en-sailing",
      title: "Learning to Sail",
      text: "Learning to sail teaches patience before it teaches anything else. The wind does not care about your schedule, and the water rewards attention and punishes pride. On my first lesson, I tangled the ropes, soaked my shoes, and turned the boat in a slow, embarrassed circle while my instructor drank his coffee and waited. Gradually the language of the harbour began to make sense: the flags, the bells, the way gulls gather where the tide turns. By the end of summer I could cross the bay alone, nervous and proud, with the sail full and the shore sliding steadily past the bow. The lesson, I decided, was worth every bruise and every early morning.",
    }),
  ]),
  zh: Object.freeze([
    Object.freeze({
      id: "zh-market",
      title: "清晨的市場",
      text: "清晨的市場比小鎮醒得更早。農夫把一箱箱青菜和鮮果搬下車，麵包店的老闆將剛出爐的麵包整齊排上木架。賣花的阿姨把花束插進水桶，整條巷子忽然亮了起來。魚販的叫賣聲又響又亮，買菜的人提著竹籃，彼此招呼，聊起昨天的天氣和家裡的孩子。這裡沒有人催促誰，事情卻一件一件自然完成。阿婆挑著青菜，總要多問一句今年的雨水夠不夠；少年騎車經過，車鈴在人群裡輕輕響。豆腐攤的蒸氣慢慢升起，混著蔥花的香氣。等到太陽爬上屋頂，廣場滿是人聲，新的一天就這樣熱熱鬧鬧地開始了。賣菜的阿伯嗓門最大，卻總是多送客人一把蔥。有人為了一點小錢講價講得臉紅，轉身卻請隔壁攤的孩子吃糖。市場的鐘敲了七下，上班的人潮從巷口湧入，買了早餐就匆匆離去。",
    }),
    Object.freeze({
      id: "zh-river",
      title: "河邊的傍晚",
      text: "河邊有一條小路，柳樹把枝條垂向水面，碎石在腳下輕輕作響。傍晚時分，情侶沿著河岸散步，老人坐在長椅上看船慢慢漂過。一隻白鷺站在淺水裡，一動也不動，像在等一條迷路的魚。孩子們把扁石頭丟向水面，比誰的石頭跳得最遠，笑聲一陣一陣傳開。路燈亮起之後，水面拖著長長的光影，微微晃動。賣糖水的小販推車經過，銅鈴聲由遠而近，又慢慢遠去。這樣的傍晚平凡安靜，卻讓人捨不得太早回家。橋洞下有位老人天天來釣魚，釣到的多半放回水裡，他說他釣的是時間，不是魚。跑步的人從身後經過，腳步聲輕快又規律。母親推著嬰兒車慢慢走，孩子睡得正熟。河水映著晚霞，先是金色，再來是粉紅，最後慢慢沉進藍灰色的夜裡。風一起，蘆葦整片彎下腰，又慢慢直起來。",
    }),
    Object.freeze({
      id: "zh-library",
      title: "街角的圖書館",
      text: "我們這條街的轉角有一間小圖書館，空氣裡有紙張和灰塵的味道。書架不高，椅子也舊了，讀者卻都很維護它。館員記得每位常客的名字，知道誰愛看地圖，誰愛讀詩，誰假裝不愛看小說。冬天裡，學生擠滿長桌，共用燈光和安靜。停電的夜晚，她點起蠟燭朗讀，故事沒講完，誰也不肯先走。雨天時，屋簷滴水，窗上起霧，書頁翻動的聲音格外清楚。這間圖書館不大，卻是全鎮人心中少不了的地方。她還在牆邊設了一張小桌，專門放讀者推薦的書，卡片上寫滿心得，有的工整，有的潦草，卻都真心。放學時分，小學生背著書包湧進來，先搶靠窗的位子。有人在這裡準備考試，有人在這裡躲雨，也有人只是來聞一聞書的味道，坐一下就走。鎮上的人說，這裡是全鎮最安靜，也最溫暖的地方。",
    }),
    Object.freeze({
      id: "zh-kitchen",
      title: "外婆的廚房",
      text: "外婆的廚房不大，一年到頭飄著白飯的香氣。她做菜全憑記憶和手感，用湯匙背沾一點湯汁嚐味道，再決定加一撮鹽還是半勺醬油。她常說，食譜只是寫給還沒學會聽鍋子說話的人看的。星期天她包水餃，一次包上百顆，手指翻飛，我們的眼睛都跟不上。歪歪扭扭的練習品分給孩子，她還誇我們做得像藝術品。湯滾的時候，她掀開鍋蓋，白霧一下子漫滿整間廚房。多年以後，吃過再多好菜，我心裡的那把尺，還是外婆留下的味道。她總是先嚐一口才肯端上桌，眉頭一皺，大家就知道鹽放少了。她捨不得倒掉剩菜，隔天變著花樣再端出來，居然比第一天還好吃。灶邊掛著她用了幾十年的木鏟，邊緣磨得發亮。我們笑她節省，她說，日子就是這樣一餐一餐省出來，也是這樣一餐一餐好起來的。",
    }),
    Object.freeze({
      id: "zh-train",
      title: "夜行列車",
      text: "夜行列車在晚餐後離開城市，穿過漆黑的平原，乘客在座位上睡得東倒西歪。列車長提著燈走過走道，一一剪票，對熟客點頭招呼。窗外，農舍的燈火出現又消失，像短暫浮起的小島。餐車裡，幾位旅客捧著熱茶低聲談天，看月亮跟著列車一起前進。遠處偶爾傳來一聲汽笛，很快又被輪軌的節奏蓋過。天快亮時，天空慢慢泛白，車輪的聲音緩了下來，列車停進一座小站，月台上只有站長和他的老貓，都還帶著睡意。有人在座位上改作業，有人小聲講著電話，怕吵醒身邊的人。查票之後，車廂漸漸安靜，只剩翻書聲和低低的鼾聲。窗上的霧氣被孩子畫出笑臉，又慢慢融化。過了隧道，星星忽然全亮了，像誰把燈一盞一盞打開。我把額頭靠在冰涼的窗上，看平原一路退向北方。",
    }),
    Object.freeze({
      id: "zh-sailing",
      title: "學開帆船",
      text: "學開帆船，先學的是耐心，其次才是技術。風不在乎你的行程，海水獎勵專心，懲罰驕傲。第一堂課，我把繩子纏成一團，鞋子全濕了，船在原地慢慢打轉，教練端著咖啡在旁邊等。日子久了，港口的語言漸漸聽懂了：旗子的方向，浮標的鈴聲，海鷗在潮水轉彎處聚集的樣子。等到夏末，我能獨自駕船橫過海灣，心裡又緊張又驕傲。帆吃滿了風，船身微微傾斜，岸邊的燈塔和漁船緩緩向後退去，那一刻的安靜，比任何掌聲都長久。教練說，看風要看水面，也要看旗，更要看自己的手穩不穩。回程時起了小浪，船身一晃，我差點把午餐還給大海，大家都笑了，我也笑著把舵握得更緊。靠岸之後，我把繩子一圈一圈收好，像收好一整個夏天的記憶。從那天起，我開始懂得等待，也懂得把握。",
    }),
  ]),
});
