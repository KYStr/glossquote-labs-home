// mulberry32 PRNG, pinned by SPEC.md section 4.
// All arithmetic is explicit 32-bit unsigned (Math.imul / >>>) so draws are
// identical in every browser and in Node. The constants appear exactly once,
// here. A floating-point shortcut that changes one draw is a defect.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= (t + Math.imul(t ^ (t >>> 7), t | 61)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Index draw for a pool of size n: floor(value * n), per SPEC section 4.
export function drawIndex(next, n) {
  return Math.floor(next() * n);
}

// "New seed" button semantics (SPEC section 2d): increment by 1, wrapping
// at the uint32 max back to 0.
export function incrementSeed(seed) {
  return seed >= 4294967295 ? 0 : seed + 1;
}
