// ECC block structure per (level, version 1..40): ec = error-correction
// codewords per block; groups = [blockCount, dataCodewordsPerBlock] in
// interleaving order (short blocks first). Derived during authoring by
// matching this encoder's full matrices against an independent QR
// implementation for the maximum-capacity payload at every version and
// level under all eight masks (160/160 identical); the independent
// implementation is not a dependency of this tool. See VERIFICATION.md.

export const ECC_BLOCKS = Object.freeze({
  L: Object.freeze([
    { ec: 7, groups: [[1, 19]] }, // L1
    { ec: 10, groups: [[1, 34]] }, // L2
    { ec: 15, groups: [[1, 55]] }, // L3
    { ec: 20, groups: [[1, 80]] }, // L4
    { ec: 26, groups: [[1, 108]] }, // L5
    { ec: 18, groups: [[2, 68]] }, // L6
    { ec: 20, groups: [[2, 78]] }, // L7
    { ec: 24, groups: [[2, 97]] }, // L8
    { ec: 30, groups: [[2, 116]] }, // L9
    { ec: 18, groups: [[2, 68], [2, 69]] }, // L10
    { ec: 20, groups: [[4, 81]] }, // L11
    { ec: 24, groups: [[2, 92], [2, 93]] }, // L12
    { ec: 26, groups: [[4, 107]] }, // L13
    { ec: 30, groups: [[3, 115], [1, 116]] }, // L14
    { ec: 22, groups: [[5, 87], [1, 88]] }, // L15
    { ec: 24, groups: [[5, 98], [1, 99]] }, // L16
    { ec: 28, groups: [[1, 107], [5, 108]] }, // L17
    { ec: 30, groups: [[5, 120], [1, 121]] }, // L18
    { ec: 28, groups: [[3, 113], [4, 114]] }, // L19
    { ec: 28, groups: [[3, 107], [5, 108]] }, // L20
    { ec: 28, groups: [[4, 116], [4, 117]] }, // L21
    { ec: 28, groups: [[2, 111], [7, 112]] }, // L22
    { ec: 30, groups: [[4, 121], [5, 122]] }, // L23
    { ec: 30, groups: [[6, 117], [4, 118]] }, // L24
    { ec: 26, groups: [[8, 106], [4, 107]] }, // L25
    { ec: 28, groups: [[10, 114], [2, 115]] }, // L26
    { ec: 30, groups: [[8, 122], [4, 123]] }, // L27
    { ec: 30, groups: [[3, 117], [10, 118]] }, // L28
    { ec: 30, groups: [[7, 116], [7, 117]] }, // L29
    { ec: 30, groups: [[5, 115], [10, 116]] }, // L30
    { ec: 30, groups: [[13, 115], [3, 116]] }, // L31
    { ec: 30, groups: [[17, 115]] }, // L32
    { ec: 30, groups: [[17, 115], [1, 116]] }, // L33
    { ec: 30, groups: [[13, 115], [6, 116]] }, // L34
    { ec: 30, groups: [[12, 121], [7, 122]] }, // L35
    { ec: 30, groups: [[6, 121], [14, 122]] }, // L36
    { ec: 30, groups: [[17, 122], [4, 123]] }, // L37
    { ec: 30, groups: [[4, 122], [18, 123]] }, // L38
    { ec: 30, groups: [[20, 117], [4, 118]] }, // L39
    { ec: 30, groups: [[19, 118], [6, 119]] }, // L40
  ]),
  M: Object.freeze([
    { ec: 10, groups: [[1, 16]] }, // M1
    { ec: 16, groups: [[1, 28]] }, // M2
    { ec: 26, groups: [[1, 44]] }, // M3
    { ec: 18, groups: [[2, 32]] }, // M4
    { ec: 24, groups: [[2, 43]] }, // M5
    { ec: 16, groups: [[4, 27]] }, // M6
    { ec: 18, groups: [[4, 31]] }, // M7
    { ec: 22, groups: [[2, 38], [2, 39]] }, // M8
    { ec: 22, groups: [[3, 36], [2, 37]] }, // M9
    { ec: 26, groups: [[4, 43], [1, 44]] }, // M10
    { ec: 30, groups: [[1, 50], [4, 51]] }, // M11
    { ec: 22, groups: [[6, 36], [2, 37]] }, // M12
    { ec: 22, groups: [[8, 37], [1, 38]] }, // M13
    { ec: 24, groups: [[4, 40], [5, 41]] }, // M14
    { ec: 24, groups: [[5, 41], [5, 42]] }, // M15
    { ec: 28, groups: [[7, 45], [3, 46]] }, // M16
    { ec: 28, groups: [[10, 46], [1, 47]] }, // M17
    { ec: 26, groups: [[9, 43], [4, 44]] }, // M18
    { ec: 26, groups: [[3, 44], [11, 45]] }, // M19
    { ec: 26, groups: [[3, 41], [13, 42]] }, // M20
    { ec: 26, groups: [[17, 42]] }, // M21
    { ec: 28, groups: [[17, 46]] }, // M22
    { ec: 28, groups: [[4, 47], [14, 48]] }, // M23
    { ec: 28, groups: [[6, 45], [14, 46]] }, // M24
    { ec: 28, groups: [[8, 47], [13, 48]] }, // M25
    { ec: 28, groups: [[19, 46], [4, 47]] }, // M26
    { ec: 28, groups: [[22, 45], [3, 46]] }, // M27
    { ec: 28, groups: [[3, 45], [23, 46]] }, // M28
    { ec: 28, groups: [[21, 45], [7, 46]] }, // M29
    { ec: 28, groups: [[19, 47], [10, 48]] }, // M30
    { ec: 28, groups: [[2, 46], [29, 47]] }, // M31
    { ec: 28, groups: [[10, 46], [23, 47]] }, // M32
    { ec: 28, groups: [[14, 46], [21, 47]] }, // M33
    { ec: 28, groups: [[14, 46], [23, 47]] }, // M34
    { ec: 28, groups: [[12, 47], [26, 48]] }, // M35
    { ec: 28, groups: [[6, 47], [34, 48]] }, // M36
    { ec: 28, groups: [[29, 46], [14, 47]] }, // M37
    { ec: 28, groups: [[13, 46], [32, 47]] }, // M38
    { ec: 28, groups: [[40, 47], [7, 48]] }, // M39
    { ec: 28, groups: [[18, 47], [31, 48]] }, // M40
  ]),
  Q: Object.freeze([
    { ec: 13, groups: [[1, 13]] }, // Q1
    { ec: 22, groups: [[1, 22]] }, // Q2
    { ec: 18, groups: [[2, 17]] }, // Q3
    { ec: 26, groups: [[2, 24]] }, // Q4
    { ec: 18, groups: [[2, 15], [2, 16]] }, // Q5
    { ec: 24, groups: [[4, 19]] }, // Q6
    { ec: 18, groups: [[2, 14], [4, 15]] }, // Q7
    { ec: 22, groups: [[4, 18], [2, 19]] }, // Q8
    { ec: 20, groups: [[4, 16], [4, 17]] }, // Q9
    { ec: 24, groups: [[6, 19], [2, 20]] }, // Q10
    { ec: 28, groups: [[4, 22], [4, 23]] }, // Q11
    { ec: 26, groups: [[4, 20], [6, 21]] }, // Q12
    { ec: 24, groups: [[8, 20], [4, 21]] }, // Q13
    { ec: 20, groups: [[11, 16], [5, 17]] }, // Q14
    { ec: 30, groups: [[5, 24], [7, 25]] }, // Q15
    { ec: 24, groups: [[15, 19], [2, 20]] }, // Q16
    { ec: 28, groups: [[1, 22], [15, 23]] }, // Q17
    { ec: 28, groups: [[17, 22], [1, 23]] }, // Q18
    { ec: 26, groups: [[17, 21], [4, 22]] }, // Q19
    { ec: 30, groups: [[15, 24], [5, 25]] }, // Q20
    { ec: 28, groups: [[17, 22], [6, 23]] }, // Q21
    { ec: 30, groups: [[7, 24], [16, 25]] }, // Q22
    { ec: 30, groups: [[11, 24], [14, 25]] }, // Q23
    { ec: 30, groups: [[11, 24], [16, 25]] }, // Q24
    { ec: 30, groups: [[7, 24], [22, 25]] }, // Q25
    { ec: 28, groups: [[28, 22], [6, 23]] }, // Q26
    { ec: 30, groups: [[8, 23], [26, 24]] }, // Q27
    { ec: 30, groups: [[4, 24], [31, 25]] }, // Q28
    { ec: 30, groups: [[1, 23], [37, 24]] }, // Q29
    { ec: 30, groups: [[15, 24], [25, 25]] }, // Q30
    { ec: 30, groups: [[42, 24], [1, 25]] }, // Q31
    { ec: 30, groups: [[10, 24], [35, 25]] }, // Q32
    { ec: 30, groups: [[29, 24], [19, 25]] }, // Q33
    { ec: 30, groups: [[44, 24], [7, 25]] }, // Q34
    { ec: 30, groups: [[39, 24], [14, 25]] }, // Q35
    { ec: 30, groups: [[46, 24], [10, 25]] }, // Q36
    { ec: 30, groups: [[49, 24], [10, 25]] }, // Q37
    { ec: 30, groups: [[48, 24], [14, 25]] }, // Q38
    { ec: 30, groups: [[43, 24], [22, 25]] }, // Q39
    { ec: 30, groups: [[34, 24], [34, 25]] }, // Q40
  ]),
  H: Object.freeze([
    { ec: 17, groups: [[1, 9]] }, // H1
    { ec: 28, groups: [[1, 16]] }, // H2
    { ec: 22, groups: [[2, 13]] }, // H3
    { ec: 16, groups: [[4, 9]] }, // H4
    { ec: 22, groups: [[2, 11], [2, 12]] }, // H5
    { ec: 28, groups: [[4, 15]] }, // H6
    { ec: 26, groups: [[4, 13], [1, 14]] }, // H7
    { ec: 26, groups: [[4, 14], [2, 15]] }, // H8
    { ec: 24, groups: [[4, 12], [4, 13]] }, // H9
    { ec: 28, groups: [[6, 15], [2, 16]] }, // H10
    { ec: 24, groups: [[3, 12], [8, 13]] }, // H11
    { ec: 28, groups: [[7, 14], [4, 15]] }, // H12
    { ec: 22, groups: [[12, 11], [4, 12]] }, // H13
    { ec: 24, groups: [[11, 12], [5, 13]] }, // H14
    { ec: 24, groups: [[11, 12], [7, 13]] }, // H15
    { ec: 30, groups: [[3, 15], [13, 16]] }, // H16
    { ec: 28, groups: [[2, 14], [17, 15]] }, // H17
    { ec: 28, groups: [[2, 14], [19, 15]] }, // H18
    { ec: 26, groups: [[9, 13], [16, 14]] }, // H19
    { ec: 28, groups: [[15, 15], [10, 16]] }, // H20
    { ec: 30, groups: [[19, 16], [6, 17]] }, // H21
    { ec: 24, groups: [[34, 13]] }, // H22
    { ec: 30, groups: [[16, 15], [14, 16]] }, // H23
    { ec: 30, groups: [[30, 16], [2, 17]] }, // H24
    { ec: 30, groups: [[22, 15], [13, 16]] }, // H25
    { ec: 30, groups: [[33, 16], [4, 17]] }, // H26
    { ec: 30, groups: [[12, 15], [28, 16]] }, // H27
    { ec: 30, groups: [[11, 15], [31, 16]] }, // H28
    { ec: 30, groups: [[19, 15], [26, 16]] }, // H29
    { ec: 30, groups: [[23, 15], [25, 16]] }, // H30
    { ec: 30, groups: [[23, 15], [28, 16]] }, // H31
    { ec: 30, groups: [[19, 15], [35, 16]] }, // H32
    { ec: 30, groups: [[11, 15], [46, 16]] }, // H33
    { ec: 30, groups: [[59, 16], [1, 17]] }, // H34
    { ec: 30, groups: [[22, 15], [41, 16]] }, // H35
    { ec: 30, groups: [[2, 15], [64, 16]] }, // H36
    { ec: 30, groups: [[24, 15], [46, 16]] }, // H37
    { ec: 30, groups: [[42, 15], [32, 16]] }, // H38
    { ec: 30, groups: [[10, 15], [67, 16]] }, // H39
    { ec: 30, groups: [[20, 15], [61, 16]] }, // H40
  ]),
});
