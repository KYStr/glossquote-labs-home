// Pure core for the IPv4 Subnet Calculator: strict dotted-quad parsing,
// exact 32-bit mask arithmetic, the classification table as data, split
// enumeration with a display cap, and membership (SPEC section 4).
// Zero DOM access; every result is an exact integer or a dotted string
// derived from one — no floating-point approximations anywhere.

function fail(code, params) {
  const error = new Error(code);
  error.code = code;
  if (params) error.params = params;
  throw error;
}

export const SPLIT_DISPLAY_CAP = 256;

// --- Parsing (SPEC section 4, normative) ---

// A dotted quad is exactly four dot-separated octets; each octet is a
// canonical decimal integer 0-255: no sign, no spaces, no leading
// zeros unless the octet is exactly "0" (leading zeros are rejected
// because of historical octal ambiguity). Every failure names the
// 1-based octet position.
export function parseAddress(text) {
  if (typeof text !== "string" || text.includes(":")) fail("IPV6_NOT_SUPPORTED");
  const parts = text.split(".");
  if (parts.length !== 4) fail("ADDRESS_PARTS", { count: parts.length });
  let value = 0;
  parts.forEach((part, index) => {
    const position = index + 1;
    if (part === "") fail("ADDRESS_EMPTY_OCTET", { position });
    if (!/^[0-9]+$/.test(part)) fail("ADDRESS_NON_DIGIT", { position });
    if (part.length > 1 && part.startsWith("0")) {
      fail("ADDRESS_LEADING_ZERO", { position });
    }
    const octet = Number(part);
    if (octet > 255) fail("ADDRESS_OCTET_RANGE", { position });
    value = value * 256 + octet;
  });
  return value >>> 0;
}

export function parsePrefix(text) {
  if (typeof text !== "string" || !/^[0-9]+$/.test(text)) {
    fail("PREFIX_INVALID", { value: String(text) });
  }
  const prefix = Number(text);
  if (prefix > 32) fail("PREFIX_RANGE", { value: prefix });
  return prefix;
}

// A pasted CIDR "a.b.c.d/n" in the address field is split at the
// single "/"; a malformed suffix is an error in the prefix field's
// terms (SPEC section 4).
export function parseCidr(text) {
  const slash = typeof text === "string" ? text.indexOf("/") : -1;
  if (slash === -1) return null;
  const addressText = text.slice(0, slash);
  const suffix = text.slice(slash + 1);
  if (suffix.includes("/")) fail("PREFIX_INVALID", { value: suffix });
  const prefix = parsePrefix(suffix);
  return { address: parseAddress(addressText), prefix };
}

// A netmask field is a dotted quad under the same octet rules,
// additionally required to be contiguous: some number of 1 bits
// followed by only 0 bits (SPEC section 4).
export function parseNetmask(text) {
  const mask = parseAddress(text);
  let seenZero = false;
  for (let bit = 31; bit >= 0; bit -= 1) {
    const isOne = ((mask >>> bit) & 1) === 1;
    if (!isOne) seenZero = true;
    else if (seenZero) fail("NETMASK_NOT_CONTIGUOUS");
  }
  return maskToPrefix(mask);
}

export function prefixToMask(prefix) {
  if (prefix === 0) return 0;
  return (0xffffffff << (32 - prefix)) >>> 0;
}

export function maskToPrefix(mask) {
  let prefix = 0;
  for (let bit = 31; bit >= 0; bit -= 1) {
    if (((mask >>> bit) & 1) === 1) prefix += 1;
    else break;
  }
  return prefix;
}

export function formatAddress(value) {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ].join(".");
}

// --- Classification (SPEC section 4, normative; first match wins) ---

// The table ships as reviewable data: network, prefix, code.
export const CLASSIFICATION_TABLE = Object.freeze([
  { network: "0.0.0.0", prefix: 8, code: "THIS_NETWORK" },
  { network: "10.0.0.0", prefix: 8, code: "PRIVATE" },
  { network: "100.64.0.0", prefix: 10, code: "CGNAT" },
  { network: "127.0.0.0", prefix: 8, code: "LOOPBACK" },
  { network: "169.254.0.0", prefix: 16, code: "LINK_LOCAL" },
  { network: "172.16.0.0", prefix: 12, code: "PRIVATE" },
  { network: "192.0.2.0", prefix: 24, code: "DOCUMENTATION" },
  { network: "192.168.0.0", prefix: 16, code: "PRIVATE" },
  { network: "198.51.100.0", prefix: 24, code: "DOCUMENTATION" },
  { network: "203.0.113.0", prefix: 24, code: "DOCUMENTATION" },
  { network: "224.0.0.0", prefix: 4, code: "MULTICAST" },
  { network: "240.0.0.0", prefix: 4, code: "RESERVED" },
]);

const CLASSIFICATION_ROWS = CLASSIFICATION_TABLE.map((row) => ({
  base: parseAddress(row.network),
  mask: prefixToMask(row.prefix),
  code: row.code,
}));

export function classify(address) {
  // The reserved row includes 255.255.255.255, which the SPEC requires
  // to be named when the address is exactly that.
  if (address === 0xffffffff) return "LIMITED_BROADCAST";
  for (const row of CLASSIFICATION_ROWS) {
    if (((address & row.mask) >>> 0) === row.base) return row.code;
  }
  return "PUBLIC";
}

// Historical class by first octet (SPEC section 4): displayed
// separately from the classification and labelled "historical class".
export function historicalClass(address) {
  const first = (address >>> 24) & 0xff;
  if (first <= 127) return "A";
  if (first <= 191) return "B";
  if (first <= 223) return "C";
  if (first <= 239) return "D";
  return "E";
}

// --- Analysis (SPEC section 4 arithmetic, normative) ---

function usableRange(network, broadcast, prefix) {
  const total = 2 ** (32 - prefix);
  if (prefix <= 30) {
    return { total, usable: total - 2, first: network + 1, last: broadcast - 1, rule: "standard" };
  }
  if (prefix === 31) {
    // RFC 3021 point-to-point: both addresses are usable.
    return { total, usable: 2, first: network, last: broadcast, rule: "rfc3021" };
  }
  // Host route: every derived address is the address itself.
  return { total, usable: 1, first: network, last: broadcast, rule: "host" };
}

export function analyze(address, prefix) {
  const mask = prefixToMask(prefix);
  const network = (address & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const range = usableRange(network, broadcast, prefix);
  return {
    address,
    prefix,
    netmask: mask,
    wildcard: (~mask) >>> 0,
    network,
    broadcast,
    total: range.total,
    usable: range.usable,
    firstUsable: range.first,
    lastUsable: range.last,
    usableRule: range.rule,
    classification: classify(address),
    historicalClass: historicalClass(address),
  };
}

// The 32 bits of the address in four octet groups, plus the boundary
// counts, so the page can label network vs host bits in text as well
// as colour (SPEC sections 4 and 5).
export function binaryView(address, prefix) {
  const bits = address.toString(2).padStart(32, "0");
  return {
    groups: [0, 1, 2, 3].map((g) => bits.slice(g * 8, g * 8 + 8)),
    networkBits: prefix,
    hostBits: 32 - prefix,
  };
}

// --- Split mode (SPEC section 4, normative) ---

export function splitSubnet(address, prefix, childPrefix) {
  if (childPrefix <= prefix) {
    fail("CHILD_PREFIX_NOT_LONGER", { parent: prefix, child: childPrefix });
  }
  if (childPrefix > 32) fail("PREFIX_RANGE", { value: childPrefix });
  const parentNetwork = (address & prefixToMask(prefix)) >>> 0;
  const count = 2 ** (childPrefix - prefix); // O(1): never enumerated in full
  const childSize = 2 ** (32 - childPrefix);
  const shown = Math.min(count, SPLIT_DISPLAY_CAP);
  const children = [];
  for (let i = 0; i < shown; i += 1) {
    const childAddress = (parentNetwork + i * childSize) >>> 0;
    const child = analyze(childAddress, childPrefix);
    children.push({
      network: child.network,
      broadcast: child.broadcast,
      firstUsable: child.firstUsable,
      lastUsable: child.lastUsable,
      usable: child.usable,
    });
  }
  return { count, capped: count > SPLIT_DISPLAY_CAP, children };
}

// --- Membership (SPEC section 4, normative) ---

export function checkMembership(address, prefix, other) {
  const mask = prefixToMask(prefix);
  const network = (address & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const inside = ((other & mask) >>> 0) === network;
  return { inside, network, broadcast };
}
