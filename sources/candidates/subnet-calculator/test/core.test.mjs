import assert from "node:assert/strict";
import test from "node:test";

import {
  CLASSIFICATION_TABLE,
  analyze,
  binaryView,
  checkMembership,
  classify,
  formatAddress,
  historicalClass,
  maskToPrefix,
  parseAddress,
  parseCidr,
  parseNetmask,
  parsePrefix,
  prefixToMask,
  splitSubnet,
} from "../public/js/core/subnet.mjs";

const ip = (text) => parseAddress(text);
const dotted = (value) => formatAddress(value);

// --- SPEC section 4 worked fixtures, verbatim ---

test("fixture 192.168.1.64/26 in full", () => {
  const r = analyze(ip("192.168.1.64"), 26);
  assert.equal(dotted(r.netmask), "255.255.255.192");
  assert.equal(dotted(r.wildcard), "0.0.0.63");
  assert.equal(dotted(r.network), "192.168.1.64");
  assert.equal(dotted(r.broadcast), "192.168.1.127");
  assert.equal(r.total, 64);
  assert.equal(r.usable, 62);
  assert.equal(dotted(r.firstUsable), "192.168.1.65");
  assert.equal(dotted(r.lastUsable), "192.168.1.126");
  assert.equal(r.classification, "PRIVATE");
  assert.equal(r.historicalClass, "C");
});

test("fixture 192.0.2.5/31: RFC 3021, both addresses usable", () => {
  const r = analyze(ip("192.0.2.5"), 31);
  assert.equal(dotted(r.network), "192.0.2.4");
  assert.equal(dotted(r.broadcast), "192.0.2.5");
  assert.equal(r.total, 2);
  assert.equal(r.usable, 2);
  assert.equal(r.usableRule, "rfc3021");
  assert.equal(dotted(r.firstUsable), "192.0.2.4");
  assert.equal(dotted(r.lastUsable), "192.0.2.5");
  assert.equal(r.classification, "DOCUMENTATION");
});

test("fixture 203.0.113.9/32: host route, all addresses equal", () => {
  const r = analyze(ip("203.0.113.9"), 32);
  assert.equal(dotted(r.network), "203.0.113.9");
  assert.equal(dotted(r.broadcast), "203.0.113.9");
  assert.equal(dotted(r.firstUsable), "203.0.113.9");
  assert.equal(dotted(r.lastUsable), "203.0.113.9");
  assert.equal(r.total, 1);
  assert.equal(r.usable, 1);
  assert.equal(r.usableRule, "host");
});

test("fixture 0.0.0.0/0: exact integer totals, no float notation", () => {
  const r = analyze(ip("0.0.0.0"), 0);
  assert.equal(dotted(r.network), "0.0.0.0");
  assert.equal(dotted(r.broadcast), "255.255.255.255");
  assert.equal(r.total, 4294967296);
  assert.equal(r.usable, 4294967294);
  assert.equal(String(r.total), "4294967296");
});

test("usable-rule branch at /30 keeps the classic minus two", () => {
  const r = analyze(ip("10.0.0.0"), 30);
  assert.equal(r.total, 4);
  assert.equal(r.usable, 2);
  assert.equal(r.usableRule, "standard");
  assert.equal(dotted(r.firstUsable), "10.0.0.1");
  assert.equal(dotted(r.lastUsable), "10.0.0.2");
});

// --- Parser sweep (SPEC section 7b) ---

test("parser rejects each octet error class, naming the position", () => {
  const cases = [
    ["192.168.1", "ADDRESS_PARTS", undefined],
    ["192.168.1.1.1", "ADDRESS_PARTS", undefined],
    ["192.168..1", "ADDRESS_EMPTY_OCTET", 3],
    ["192.168.1.x", "ADDRESS_NON_DIGIT", 4],
    ["192.168.1.-1", "ADDRESS_NON_DIGIT", 4],
    ["192.168.1.+1", "ADDRESS_NON_DIGIT", 4],
    ["192.168.01.1", "ADDRESS_LEADING_ZERO", 3],
    ["192.168.1.256", "ADDRESS_OCTET_RANGE", 4],
    [" 192.168.1.1", "ADDRESS_NON_DIGIT", 1],
    ["0x10.0.0.1", "ADDRESS_NON_DIGIT", 1],
    ["1e2.0.0.1", "ADDRESS_NON_DIGIT", 1],
  ];
  for (const [input, code, position] of cases) {
    assert.throws(
      () => parseAddress(input),
      (error) => error.code === code && (position === undefined || error.params.position === position),
      input,
    );
  }
  assert.equal(ip("0.0.0.0"), 0);
  assert.equal(ip("255.255.255.255"), 4294967295);
});

test("IPv6 input is refused with its own named error", () => {
  assert.throws(() => parseAddress("::1"), (e) => e.code === "IPV6_NOT_SUPPORTED");
  assert.throws(() => parseAddress("2001:db8::1"), (e) => e.code === "IPV6_NOT_SUPPORTED");
});

test("prefix parsing: -1, 33 and non-integers are named errors", () => {
  assert.equal(parsePrefix("0"), 0);
  assert.equal(parsePrefix("32"), 32);
  assert.throws(() => parsePrefix("-1"), (e) => e.code === "PREFIX_INVALID");
  assert.throws(() => parsePrefix("33"), (e) => e.code === "PREFIX_RANGE");
  assert.throws(() => parsePrefix("24.5"), (e) => e.code === "PREFIX_INVALID");
  assert.throws(() => parsePrefix(""), (e) => e.code === "PREFIX_INVALID");
});

test("CIDR paste forms split at the single slash", () => {
  const parsed = parseCidr("192.168.1.64/26");
  assert.equal(parsed.address, ip("192.168.1.64"));
  assert.equal(parsed.prefix, 26);
  assert.equal(parseCidr("192.168.1.64"), null);
  assert.throws(() => parseCidr("192.168.1.64/33"), (e) => e.code === "PREFIX_RANGE");
  assert.throws(() => parseCidr("192.168.1.64/x"), (e) => e.code === "PREFIX_INVALID");
  assert.throws(() => parseCidr("192.168.1.64/"), (e) => e.code === "PREFIX_INVALID");
  assert.throws(() => parseCidr("192.168.1.64/26/1"), (e) => e.code === "PREFIX_INVALID");
});

test("all 33 valid masks are contiguous; named invalid ones are not", () => {
  for (let prefix = 0; prefix <= 32; prefix += 1) {
    const maskText = dotted(prefixToMask(prefix));
    assert.equal(parseNetmask(maskText), prefix, maskText);
    assert.equal(maskToPrefix(prefixToMask(prefix)), prefix);
  }
  for (const bad of ["255.255.0.255", "255.255.255.1", "127.0.0.0", "255.255.253.0", "0.0.0.1"]) {
    assert.throws(() => parseNetmask(bad), (e) => e.code === "NETMASK_NOT_CONTIGUOUS", bad);
  }
});

// --- Independent cross-check (SPEC section 7c) ---
// A second, string-based implementation written separately from the
// core: addresses as 32-character bit strings, masks by slicing.

function bitsOf(text) {
  return text.split(".").map((o) => Number(o).toString(2).padStart(8, "0")).join("");
}
function dottedOf(bits) {
  return [0, 8, 16, 24].map((i) => parseInt(bits.slice(i, i + 8), 2)).join(".");
}
function stringAnalyze(text, prefix) {
  const bits = bitsOf(text);
  const network = bits.slice(0, prefix).padEnd(32, "0");
  const broadcast = bits.slice(0, prefix).padEnd(32, "1");
  return { network: dottedOf(network), broadcast: dottedOf(broadcast) };
}

test("arithmetic cross-check against a bit-string implementation", () => {
  let seed = 7;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let round = 0; round < 300; round += 1) {
    const text = [0, 1, 2, 3].map(() => Math.floor(random() * 256)).join(".");
    const prefix = Math.floor(random() * 33);
    const expected = stringAnalyze(text, prefix);
    const actual = analyze(ip(text), prefix);
    assert.equal(dotted(actual.network), expected.network, `${text}/${prefix}`);
    assert.equal(dotted(actual.broadcast), expected.broadcast, `${text}/${prefix}`);
    assert.equal(actual.total, 2 ** (32 - prefix));
  }
});

// --- Classification (SPEC sections 4 and 7d) ---

test("one address per classification row, in table order", () => {
  const cases = [
    ["0.0.0.0", "THIS_NETWORK"], ["0.255.255.255", "THIS_NETWORK"],
    ["10.1.2.3", "PRIVATE"],
    ["100.64.0.0", "CGNAT"], ["100.127.255.255", "CGNAT"],
    ["127.0.0.1", "LOOPBACK"],
    ["169.254.1.1", "LINK_LOCAL"],
    ["172.16.0.0", "PRIVATE"], ["172.31.255.255", "PRIVATE"],
    ["192.0.2.5", "DOCUMENTATION"],
    ["192.168.0.1", "PRIVATE"],
    ["198.51.100.7", "DOCUMENTATION"],
    ["203.0.113.9", "DOCUMENTATION"],
    ["224.0.0.1", "MULTICAST"],
    ["240.0.0.1", "RESERVED"],
    ["255.255.255.255", "LIMITED_BROADCAST"],
    ["8.8.8.8", "PUBLIC"],
    ["172.15.255.255", "PUBLIC"], ["172.32.0.0", "PUBLIC"],
    ["100.63.255.255", "PUBLIC"], ["100.128.0.0", "PUBLIC"],
    ["11.0.0.0", "PUBLIC"], ["192.167.0.1", "PUBLIC"],
  ];
  for (const [text, code] of cases) {
    assert.equal(classify(ip(text)), code, text);
  }
  assert.equal(CLASSIFICATION_TABLE.length, 12);
});

test("historical class by first octet, kept separate", () => {
  const cases = [["0.0.0.0", "A"], ["127.0.0.1", "A"], ["128.0.0.0", "B"],
    ["191.255.0.0", "B"], ["192.0.0.0", "C"], ["223.0.0.0", "C"],
    ["224.0.0.0", "D"], ["239.0.0.0", "D"], ["240.0.0.0", "E"], ["255.0.0.0", "E"]];
  for (const [text, klass] of cases) {
    assert.equal(historicalClass(ip(text)), klass, text);
  }
});

test("binary view marks the boundary in text counts", () => {
  const view = binaryView(ip("192.168.1.64"), 26);
  assert.deepEqual(view.groups, ["11000000", "10101000", "00000001", "01000000"]);
  assert.equal(view.networkBits, 26);
  assert.equal(view.hostBits, 6);
  const root = binaryView(ip("0.0.0.0"), 0);
  assert.equal(root.networkBits, 0);
  assert.equal(root.hostBits, 32);
});
