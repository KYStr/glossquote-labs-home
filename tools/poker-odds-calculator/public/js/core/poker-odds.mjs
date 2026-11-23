// Pure core for the Poker Odds Calculator
// (spec-poker-odds-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind.
//
// Rules implemented, in the SPEC's own order:
// - Validation (§inputsOutputs steps 1-4): per-field capacity, then
//   lone-surrogate, then empty/grammar, in field order holeCards,
//   boardCards, opponents, pot, toCall; then CARD_COUNT, then
//   DUPLICATE_CARD, then RANGE.
// - Hand evaluation (§5): best 5 of 5-7 cards; categories 1-9 with
//   the SPEC's tiebreak order; wheel straight tops at 5; a
//   straight flush topping at A is category 9 (royal flush is a
//   display name only).
// - Outs (§6): union over unseen cards of the six pinned conversion
//   rules; overcard pairing and board-pairing two-pair-to-three-pair
//   are never counted. Preflop outs is null; river outs is 0.
// - Hit rates (§7): exact hypergeometric fractions; the rule of 2/4
//   is a display-only integer approximation, never used for equity
//   or the hint.
// - Equity (§8): scenarios C(R,2k) x C(R-2k,c) <= 2,000,000 use
//   exact enumeration in deck order; otherwise Monte Carlo 100,000
//   trials with mulberry32, fixed seed 20261121.
// - Final hand distribution (§9): hero's final category over all
//   board completions (exact) or trials (Monte Carlo).
// - Pot odds (§10): ratio reduced by GCD; break-even and the
//   call/fold/marginal hint compare unrounded exact fractions.
//   toCall 0 is a free call (ratio null, break-even "0.00").
// Percentages are round-half-up to exactly 2 decimals, as strings;
// rounding happens only for display, never for the hint comparison.

export const FIELDS = ["holeCards", "boardCards", "opponents", "pot", "toCall"];

export const DEFAULTS = {
  holeCards: ["As", "Ks"],
  boardCards: ["Qs", "7s", "2c"],
  opponents: "1",
  pot: "",
  toCall: "",
};

// The worked example is fixtures.json case 1 (flush-draw-flop)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  holeCards: ["As", "Ks"],
  boardCards: ["Qs", "7s", "2c"],
  opponents: "1",
  pot: "",
  toCall: "",
};

export const MAX_RAW_HOLE_CARDS = 15;
export const MAX_RAW_BOARD_CARDS = 29;
export const MAX_RAW_INTEGER = 10;
export const OPPONENTS_MIN = 1;
export const OPPONENTS_MAX = 9;
export const AMOUNT_MIN = 0;
export const AMOUNT_MAX = 1000000000;

export const EXACT_SCENARIO_LIMIT = 2000000;
export const MONTE_CARLO_TRIALS = 100000;
export const MONTE_CARLO_SEED = 20261121;

export const CATEGORY_SLUGS = [
  "high-card",
  "pair",
  "two-pair",
  "three-of-a-kind",
  "straight",
  "flush",
  "full-house",
  "four-of-a-kind",
  "straight-flush",
];

export const CATEGORY_NAMES = {
  "high-card": { zh: "高牌", en: "High card" },
  pair: { zh: "一對", en: "Pair" },
  "two-pair": { zh: "兩對", en: "Two pair" },
  "three-of-a-kind": { zh: "三條", en: "Three of a kind" },
  straight: { zh: "順子", en: "Straight" },
  flush: { zh: "同花", en: "Flush" },
  "full-house": { zh: "葫蘆", en: "Full house" },
  "four-of-a-kind": { zh: "四條", en: "Four of a kind" },
  "straight-flush": { zh: "同花順", en: "Straight flush" },
};

export const ROYAL_FLUSH_NAMES = { zh: "皇家同花順", en: "Royal flush" };

// Pinned §goal disclaimer (verbatim, both languages). Shown in the
// results area of both pages.
export const DISCLAIMER_ZH =
  "本工具僅供娛樂與機率教學參考，不構成任何投注建議。所有機率皆假設一副公平洗勻的 52 張牌，且對手手牌未知、均勻隨機；實際結果無法保證。";
export const DISCLAIMER_EN =
  "This tool is for entertainment and probability education only, not betting advice. All probabilities assume a fair, randomly shuffled 52-card deck and that opponents' hole cards are unknown and uniformly random; actual outcomes are not guaranteed.";

const RANK_CHARS = "23456789TJQKA";
const SUIT_CHARS = "cdhs";
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked.
// Returns the raw input, or null when the shape is not exactly the
// five fields with the right types (card fields are arrays of
// strings; the rest are strings).
function readRawInput(input) {
  if (!isPlainObject(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== FIELDS.length) return null;
  const raw = {};
  for (const field of FIELDS) {
    if (!keys.includes(field)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    const value = descriptor.value;
    if (field === "holeCards" || field === "boardCards") {
      if (!Array.isArray(value)) return null;
      const cards = [];
      for (let index = 0; index < value.length; index += 1) {
        const entry = Object.getOwnPropertyDescriptor(value, index);
        if (entry === undefined || !("value" in entry)) return null;
        if (typeof entry.value !== "string") return null;
        cards.push(entry.value);
      }
      raw[field] = cards;
    } else {
      if (typeof value !== "string") return null;
      raw[field] = value;
    }
  }
  return raw;
}

function hasLoneSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Parse one card code (case-insensitive rank, case-insensitive
// suit). Returns the card id in deck order (rank ascending,
// suits c, d, h, s) or -1 when the code is not a valid card.
function parseCard(code) {
  if (code.length !== 2) return -1;
  const rank = RANK_CHARS.indexOf(code[0].toUpperCase());
  if (rank === -1) return -1;
  const suit = SUIT_CHARS.indexOf(code[1].toLowerCase());
  if (suit === -1) return -1;
  return rank * 4 + suit;
}

export function formatCardCode(cardId) {
  return RANK_CHARS[cardId >> 2] + SUIT_CHARS[cardId & 3];
}

// --- Exact integer helpers (BigInt: no float rounding anywhere) ---

function chooseBigInt(n, k) {
  if (k < 0 || k > n) return 0n;
  const small = k > n - k ? n - k : k;
  let result = 1n;
  for (let i = 1; i <= small; i += 1) {
    result = (result * BigInt(n - small + i)) / BigInt(i);
  }
  return result;
}

function chooseNumber(n, k) {
  return Number(chooseBigInt(n, k));
}

// Round-half-up of (numerator / denominator * 100) to exactly two
// decimals, returned as a string with exactly two decimal places.
function formatPct(numerator, denominator) {
  const num = BigInt(numerator);
  const den = BigInt(denominator);
  const hundredths = (2n * num * 10000n + den) / (2n * den);
  const whole = hundredths / 100n;
  const frac = hundredths % 100n;
  return `${whole.toString()}.${frac.toString().padStart(2, "0")}`;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const rest = x % y;
    x = y;
    y = rest;
  }
  return x;
}

// --- Hand evaluation ---
// Cards are ids 0-51 in deck order: rank ascending (2..A), suits
// c, d, h, s. evaluateHand returns [categoryRank, ...tiebreak]
// with ranks as values 2-14; compareHands compares category first,
// then tiebreak values in order. Scratch arrays are module-level
// and reset on every call (evaluation is synchronous).

const scratchRankCount = new Array(13).fill(0);
const scratchSuitCount = [0, 0, 0, 0];
const scratchSuitMask = [0, 0, 0, 0];

// Top rank value of a straight present in the rank mask (bits 0-12
// for ranks 2-A), or 0 when there is none. The wheel A-2-3-4-5 tops
// at 5.
function straightTop(mask) {
  for (let top = 12; top >= 4; top -= 1) {
    if (((mask >> (top - 4)) & 0b11111) === 0b11111) return top + 2;
  }
  if ((mask & 0b1000000001111) === 0b1000000001111) return 5;
  return 0;
}

function topRanksExcluding(rankCount, count, excluded) {
  const out = [];
  for (let rank = 12; rank >= 0 && out.length < count; rank -= 1) {
    if (rankCount[rank] > 0 && !excluded.has(rank)) out.push(rank + 2);
  }
  return out;
}

export function evaluateHand(cardIds) {
  for (let i = 0; i < 13; i += 1) scratchRankCount[i] = 0;
  scratchSuitCount[0] = 0;
  scratchSuitCount[1] = 0;
  scratchSuitCount[2] = 0;
  scratchSuitCount[3] = 0;
  scratchSuitMask[0] = 0;
  scratchSuitMask[1] = 0;
  scratchSuitMask[2] = 0;
  scratchSuitMask[3] = 0;
  let rankMask = 0;
  for (const id of cardIds) {
    const rank = id >> 2;
    const suit = id & 3;
    scratchRankCount[rank] += 1;
    scratchSuitCount[suit] += 1;
    scratchSuitMask[suit] |= 1 << rank;
    rankMask |= 1 << rank;
  }

  let flushSuit = -1;
  for (let suit = 0; suit < 4; suit += 1) {
    if (scratchSuitCount[suit] >= 5) flushSuit = suit;
  }
  if (flushSuit !== -1) {
    const top = straightTop(scratchSuitMask[flushSuit]);
    if (top !== 0) return [9, top];
  }

  let quadRank = -1;
  const trips = [];
  const pairs = [];
  for (let rank = 12; rank >= 0; rank -= 1) {
    const count = scratchRankCount[rank];
    if (count === 4) quadRank = rank;
    if (count >= 3) trips.push(rank);
    if (count >= 2) pairs.push(rank);
  }
  if (quadRank !== -1) {
    const kicker = topRanksExcluding(scratchRankCount, 1, new Set([quadRank]));
    return [8, quadRank + 2, ...kicker];
  }
  if (trips.length >= 1 && (pairs.length >= 2 || trips.length >= 2)) {
    const tripRank = trips[0];
    const pairRank =
      trips.length >= 2 ? trips[1] : pairs.find((rank) => rank !== tripRank);
    return [7, tripRank + 2, pairRank + 2];
  }
  if (flushSuit !== -1) {
    const ranks = [];
    for (let rank = 12; rank >= 0 && ranks.length < 5; rank -= 1) {
      if ((scratchSuitMask[flushSuit] >> rank) & 1) ranks.push(rank + 2);
    }
    return [6, ...ranks];
  }
  const straight = straightTop(rankMask);
  if (straight !== 0) return [5, straight];
  if (trips.length >= 1) {
    const kickers = topRanksExcluding(scratchRankCount, 2, new Set([trips[0]]));
    return [4, trips[0] + 2, ...kickers];
  }
  if (pairs.length >= 2) {
    const kicker = topRanksExcluding(
      scratchRankCount,
      1,
      new Set([pairs[0], pairs[1]]),
    );
    return [3, pairs[0] + 2, pairs[1] + 2, ...kicker];
  }
  if (pairs.length === 1) {
    const kickers = topRanksExcluding(scratchRankCount, 3, new Set([pairs[0]]));
    return [2, pairs[0] + 2, ...kickers];
  }
  return [1, ...topRanksExcluding(scratchRankCount, 5, new Set())];
}

export function compareHands(a, b) {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left !== right) return left < right ? -1 : 1;
  }
  return 0;
}

// --- Outs (§6) ---

function computeOuts(holeIds, boardIds, currentCategory) {
  if (boardIds.length === 0) return null;
  if (boardIds.length === 5) return 0;
  const known = new Set([...holeIds, ...boardIds]);
  let outs = 0;
  for (let id = 0; id < 52; id += 1) {
    if (known.has(id)) continue;
    const next = evaluateHand([...holeIds, ...boardIds, id])[0];
    const current = currentCategory;
    if (current < 6 && next >= 6) {
      outs += 1;
    } else if (current < 5 && next >= 5) {
      outs += 1;
    } else if (current === 2 && next === 4) {
      outs += 1;
    } else if (current === 3 && next === 7) {
      outs += 1;
    } else if (current === 4 && next >= 7) {
      outs += 1;
    } else if (current >= 6 && next === 9) {
      outs += 1;
    }
  }
  return outs;
}

// --- mulberry32 (SPEC-pinned) ---

export function createMulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Lexicographic combinations of an array, in array order.
function* combinations(items, k) {
  const n = items.length;
  if (k === 0) {
    yield [];
    return;
  }
  if (k > n) return;
  const index = Array.from({ length: k }, (_, i) => i);
  for (;;) {
    yield index.map((i) => items[i]);
    let i = k - 1;
    while (i >= 0 && index[i] === n - k + i) i -= 1;
    if (i < 0) return;
    index[i] += 1;
    for (let j = i + 1; j < k; j += 1) index[j] = index[j - 1] + 1;
  }
}

function tallyOutcome(heroEval, oppEvals) {
  let tied = false;
  for (const oppEval of oppEvals) {
    const cmp = compareHands(heroEval, oppEval);
    if (cmp < 0) return "loss";
    if (cmp === 0) tied = true;
  }
  return tied ? "tie" : "win";
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  // Step 1: per-field capacity, surrogate, empty, grammar — in
  // field order holeCards, boardCards, opponents, pot, toCall.
  const holeRaw = raw.holeCards.join(" ");
  if (holeRaw.length > MAX_RAW_HOLE_CARDS) return failure("INPUT_LIMIT", "holeCards");
  for (const code of raw.holeCards) {
    if (hasLoneSurrogate(code)) return failure("UNICODE", "holeCards");
  }
  if (raw.holeCards.length === 0) return failure("EMPTY", "holeCards");
  const holeIds = [];
  for (const code of raw.holeCards) {
    const id = parseCard(code);
    if (id === -1) return failure("CARD_FORMAT", "holeCards");
    holeIds.push(id);
  }

  const boardRaw = raw.boardCards.join(" ");
  if (boardRaw.length > MAX_RAW_BOARD_CARDS) return failure("INPUT_LIMIT", "boardCards");
  for (const code of raw.boardCards) {
    if (hasLoneSurrogate(code)) return failure("UNICODE", "boardCards");
  }
  const boardIds = [];
  for (const code of raw.boardCards) {
    const id = parseCard(code);
    if (id === -1) return failure("CARD_FORMAT", "boardCards");
    boardIds.push(id);
  }

  if (raw.opponents.length > MAX_RAW_INTEGER) return failure("INPUT_LIMIT", "opponents");
  if (hasLoneSurrogate(raw.opponents)) return failure("UNICODE", "opponents");
  if (raw.opponents.length === 0) return failure("EMPTY", "opponents");
  if (!INTEGER_PATTERN.test(raw.opponents)) return failure("INTEGER_FORMAT", "opponents");

  if (raw.pot.length > MAX_RAW_INTEGER) return failure("INPUT_LIMIT", "pot");
  if (hasLoneSurrogate(raw.pot)) return failure("UNICODE", "pot");
  if (raw.pot.length > 0 && !INTEGER_PATTERN.test(raw.pot)) {
    return failure("INTEGER_FORMAT", "pot");
  }

  if (raw.toCall.length > MAX_RAW_INTEGER) return failure("INPUT_LIMIT", "toCall");
  if (hasLoneSurrogate(raw.toCall)) return failure("UNICODE", "toCall");
  if (raw.toCall.length > 0 && !INTEGER_PATTERN.test(raw.toCall)) {
    return failure("INTEGER_FORMAT", "toCall");
  }

  // Step 2: card counts.
  if (holeIds.length !== 2) return failure("CARD_COUNT", "holeCards");
  if (![0, 3, 4, 5].includes(boardIds.length)) {
    return failure("CARD_COUNT", "boardCards");
  }

  // Step 3: duplicate cards. The field is where the repeated card
  // first appears again (a repeat inside the hole cards is
  // holeCards; any repeat on the board is boardCards).
  const seen = new Set();
  for (const id of holeIds) {
    if (seen.has(id)) return failure("DUPLICATE_CARD", "holeCards");
    seen.add(id);
  }
  for (const id of boardIds) {
    if (seen.has(id)) return failure("DUPLICATE_CARD", "boardCards");
    seen.add(id);
  }

  // Step 4: ranges.
  const opponents = Number(raw.opponents);
  if (opponents < OPPONENTS_MIN || opponents > OPPONENTS_MAX) {
    return failure("RANGE", "opponents");
  }
  const pot = raw.pot === "" ? null : Number(raw.pot);
  if (pot !== null && (pot < AMOUNT_MIN || pot > AMOUNT_MAX)) {
    return failure("RANGE", "pot");
  }
  const toCall = raw.toCall === "" ? null : Number(raw.toCall);
  if (toCall !== null && (toCall < AMOUNT_MIN || toCall > AMOUNT_MAX)) {
    return failure("RANGE", "toCall");
  }

  // --- Computation ---
  const boardCount = boardIds.length;
  const cardsToCome = 5 - boardCount;
  const remainingCards = 52 - 2 - boardCount;
  const currentEval = evaluateHand([...holeIds, ...boardIds]);
  const currentCategory = currentEval[0];
  const outs = computeOuts(holeIds, boardIds, currentCategory);

  let hitNextPct = null;
  let hitTwoCardPct = null;
  let approxNextPct = null;
  let approxTwoCardPct = null;
  if (boardCount === 3) {
    hitNextPct = formatPct(outs, remainingCards);
    const totalPairs = chooseNumber(remainingCards, 2);
    const missPairs = chooseNumber(remainingCards - outs, 2);
    hitTwoCardPct = formatPct(totalPairs - missPairs, totalPairs);
    approxNextPct = outs * 2;
    approxTwoCardPct = outs * 4;
  } else if (boardCount === 4) {
    hitNextPct = formatPct(outs, remainingCards);
    hitTwoCardPct = hitNextPct;
    approxNextPct = outs * 2;
    approxTwoCardPct = outs * 2;
  }

  // Equity: exact enumeration when the scenario count is at most
  // 2,000,000, otherwise seeded Monte Carlo (100,000 trials).
  const scenarioCount = chooseBigInt(remainingCards, 2 * opponents) *
    chooseBigInt(remainingCards - 2 * opponents, cardsToCome);
  const useExact = scenarioCount <= BigInt(EXACT_SCENARIO_LIMIT);

  const knownSet = new Set([...holeIds, ...boardIds]);
  const unseen = [];
  for (let id = 0; id < 52; id += 1) {
    if (!knownSet.has(id)) unseen.push(id);
  }

  const distributionCounts = {};
  for (const slug of CATEGORY_SLUGS) distributionCounts[slug] = 0;
  let wins = 0;
  let ties = 0;
  let losses = 0;
  let scenarios = 0;

  if (useExact) {
    for (const completion of combinations(unseen, cardsToCome)) {
      const completionSet = new Set(completion);
      const fullBoard = [...boardIds, ...completion];
      const heroEval = evaluateHand([...holeIds, ...fullBoard]);
      distributionCounts[CATEGORY_SLUGS[heroEval[0] - 1]] += 1;
      const rest = unseen.filter((id) => !completionSet.has(id));
      for (const oppCards of combinations(rest, 2 * opponents)) {
        const oppEvals = [];
        for (let o = 0; o < opponents; o += 1) {
          oppEvals.push(
            evaluateHand([oppCards[2 * o], oppCards[2 * o + 1], ...fullBoard]),
          );
        }
        const outcome = tallyOutcome(heroEval, oppEvals);
        if (outcome === "win") wins += 1;
        else if (outcome === "tie") ties += 1;
        else losses += 1;
        scenarios += 1;
      }
    }
  } else {
    const rand = createMulberry32(MONTE_CARLO_SEED);
    scenarios = MONTE_CARLO_TRIALS;
    for (let trial = 0; trial < MONTE_CARLO_TRIALS; trial += 1) {
      const remaining = unseen.slice();
      const draw = () => {
        const index = Math.floor(rand() * remaining.length);
        return remaining.splice(index, 1)[0];
      };
      const oppEvals = [];
      const oppHands = [];
      for (let o = 0; o < opponents; o += 1) {
        oppHands.push([draw(), draw()]);
      }
      const completion = [];
      for (let i = 0; i < cardsToCome; i += 1) completion.push(draw());
      const fullBoard = [...boardIds, ...completion];
      const heroEval = evaluateHand([...holeIds, ...fullBoard]);
      distributionCounts[CATEGORY_SLUGS[heroEval[0] - 1]] += 1;
      for (const hand of oppHands) {
        oppEvals.push(evaluateHand([hand[0], hand[1], ...fullBoard]));
      }
      const outcome = tallyOutcome(heroEval, oppEvals);
      if (outcome === "win") wins += 1;
      else if (outcome === "tie") ties += 1;
      else losses += 1;
    }
  }

  const distributionDenominator = useExact
    ? chooseNumber(remainingCards, cardsToCome)
    : MONTE_CARLO_TRIALS;
  const finalHandDistribution = {};
  for (const slug of CATEGORY_SLUGS) {
    finalHandDistribution[slug] = formatPct(
      distributionCounts[slug],
      distributionDenominator,
    );
  }

  // Pot odds (§10): only when both amounts are filled. The hint
  // compares unrounded exact fractions, never the displayed values.
  let potOddsRatio = null;
  let breakEvenPct = null;
  let hint = null;
  if (pot !== null && toCall !== null) {
    if (toCall === 0) {
      potOddsRatio = null;
      breakEvenPct = "0.00";
      hint = "call";
    } else {
      const divisor = gcd(pot, toCall);
      potOddsRatio = `${pot / divisor}:${toCall / divisor}`;
      breakEvenPct = formatPct(toCall, pot + toCall);
      // equity = (2*wins + ties) / (2*scenarios); break-even =
      // toCall / (pot + toCall). Cross-multiply with BigInt.
      const left = BigInt(2 * wins + ties) * BigInt(pot + toCall);
      const right = BigInt(toCall) * BigInt(2 * scenarios);
      if (left > right) hint = "call";
      else if (left < right) hint = "fold";
      else hint = "marginal";
    }
  }

  return {
    ok: true,
    result: {
      currentCategory: CATEGORY_SLUGS[currentCategory - 1],
      currentCategoryRank: currentCategory,
      outs,
      remainingCards,
      cardsToCome,
      hitNextPct,
      hitTwoCardPct,
      approxNextPct,
      approxTwoCardPct,
      method: useExact ? "exact" : "monte-carlo",
      scenarios,
      wins,
      ties,
      losses,
      winPct: formatPct(wins, scenarios),
      tiePct: formatPct(ties, scenarios),
      lossPct: formatPct(losses, scenarios),
      equityPct: formatPct(2 * wins + ties, 2 * scenarios),
      finalHandDistribution,
      potOddsRatio,
      breakEvenPct,
      hint,
    },
  };
}

// Fixed report download: poker-odds-calculator-report.json. The
// content is the result's compact JSON with object keys sorted
// recursively by UTF-16 code units, array order unchanged, exactly
// one trailing LF, UTF-8 without BOM. The serializer is
// hand-written: it never calls a value's toJSON and accepts only
// the plain data shapes a result can hold (null, booleans, safe
// integers, strings, arrays, plain objects).
export const REPORT_FILENAME = "poker-odds-calculator-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("report values must be safe integers");
    }
    return String(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeValue(entry)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    // Default string sort compares UTF-16 code units, as the SPEC pins.
    const keys = Object.keys(value).sort();
    const parts = keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new Error("report objects must hold plain data only");
      }
      return `${JSON.stringify(key)}:${serializeValue(descriptor.value)}`;
    });
    return `{${parts.join(",")}}`;
  }
  throw new Error("unsupported report value");
}

export function buildReport(result) {
  if (!isPlainObject(result)) {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  let text;
  try {
    text = `${serializeValue(result)}\n`;
  } catch {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > REPORT_LIMIT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, filename: REPORT_FILENAME, text, byteLength };
}
