// Code 128 symbol width patterns, values 0-106, transcribed from ISO/IEC 15417.
// Each entry is the sequence of bar/space element widths (in modules),
// starting with a bar. Values 0-105 have 6 elements summing to 11 modules;
// value 106 (Stop) has 7 elements summing to 13 modules, ending with the
// termination bar. This file is data only: it is auditable against the
// standard table, and test/patterns.test.mjs pins its length, invariants,
// anchor values and a checksum so a transcription slip fails loudly.
export const CODE128_WIDTHS = Object.freeze([
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
  "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
  "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
  "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
  "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
  "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
  "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
  "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
  "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
  "211214", "211232", "2331112",
]);

export const CODE128_START_B = 104;
export const CODE128_START_C = 105;
export const CODE128_STOP = 106;
export const CODE128_SWITCH_TO_C = 99;
export const CODE128_SWITCH_TO_B = 100;

// Expand one symbol value to its module string ('1' = bar, '0' = space).
export function code128SymbolModules(value) {
  const widths = CODE128_WIDTHS[value];
  let modules = "";
  let isBar = true;
  for (const digit of widths) {
    modules += (isBar ? "1" : "0").repeat(Number(digit));
    isBar = !isBar;
  }
  return modules;
}
