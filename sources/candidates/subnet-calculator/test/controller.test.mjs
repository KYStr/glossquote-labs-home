import assert from "node:assert/strict";
import test from "node:test";

// Mode-pipeline suite: split and membership are the two modes beside
// analysis. They run against the pure core exactly as the page's
// controller drives them (parse -> compute -> render model), including
// the display-cap contract and the error states that replace results.

import {
  checkMembership,
  formatAddress,
  parseAddress,
  splitSubnet,
} from "../public/js/core/subnet.mjs";

const ip = (text) => parseAddress(text);
const dotted = (value) => formatAddress(value);

// --- Split mode (SPEC section 4) ---

test("fixture: 192.168.0.0/24 split at /26 gives exactly 4 children", () => {
  const result = splitSubnet(ip("192.168.0.0"), 24, 26);
  assert.equal(result.count, 4);
  assert.equal(result.capped, false);
  assert.deepEqual(result.children.map((c) => dotted(c.network)), [
    "192.168.0.0", "192.168.0.64", "192.168.0.128", "192.168.0.192",
  ]);
  assert.deepEqual(result.children.map((c) => dotted(c.broadcast)), [
    "192.168.0.63", "192.168.0.127", "192.168.0.191", "192.168.0.255",
  ]);
  assert.equal(dotted(result.children[0].firstUsable), "192.168.0.1");
  assert.equal(dotted(result.children[0].lastUsable), "192.168.0.62");
  assert.equal(result.children[0].usable, 62);
});

test("split count is O(1) arithmetic at and over the display cap", () => {
  // q - p = 20: count 1,048,576, only the first 256 listed (SPEC 7e).
  const wide = splitSubnet(ip("10.0.0.0"), 8, 28);
  assert.equal(wide.count, 1048576);
  assert.equal(wide.capped, true);
  assert.equal(wide.children.length, 256);
  assert.equal(dotted(wide.children[255].network), "10.0.15.240");
  // The extreme: /0 -> /32 must be instant and never enumerate.
  const all = splitSubnet(ip("0.0.0.0"), 0, 32);
  assert.equal(all.count, 4294967296);
  assert.equal(all.children.length, 256);
  assert.equal(dotted(all.children[1].network), "0.0.0.1");
  // Exactly at the cap: 256 children, not capped.
  const exact = splitSubnet(ip("10.0.0.0"), 16, 24);
  assert.equal(exact.count, 256);
  assert.equal(exact.capped, false);
  assert.equal(exact.children.length, 256);
  // One over the cap.
  const over = splitSubnet(ip("10.0.0.0"), 16, 25);
  assert.equal(over.count, 512);
  assert.equal(over.capped, true);
});

test("split children follow the usable rules at the child prefix", () => {
  const toHost = splitSubnet(ip("192.168.0.0"), 24, 32);
  assert.equal(toHost.count, 256);
  assert.equal(toHost.children[5].usable, 1);
  assert.equal(dotted(toHost.children[5].firstUsable), "192.168.0.5");
  const toPair = splitSubnet(ip("192.168.0.0"), 24, 31);
  assert.equal(toPair.children[0].usable, 2); // RFC 3021 at /31
  assert.equal(dotted(toPair.children[0].firstUsable), "192.168.0.0");
  assert.equal(dotted(toPair.children[0].lastUsable), "192.168.0.1");
});

test("child prefix must be longer than the parent prefix", () => {
  assert.throws(
    () => splitSubnet(ip("192.168.0.0"), 24, 24),
    (e) => e.code === "CHILD_PREFIX_NOT_LONGER" && e.params.parent === 24 && e.params.child === 24,
  );
  assert.throws(
    () => splitSubnet(ip("192.168.0.0"), 24, 16),
    (e) => e.code === "CHILD_PREFIX_NOT_LONGER",
  );
});

test("split starts at the parent network address, not the typed host", () => {
  const result = splitSubnet(ip("192.168.0.99"), 24, 26);
  assert.equal(dotted(result.children[0].network), "192.168.0.0");
});

// --- Membership mode (SPEC section 4 fixtures) ---

test("membership fixtures: inside and outside, range restated", () => {
  const inside = checkMembership(ip("192.168.1.64"), 26, ip("192.168.1.100"));
  assert.equal(inside.inside, true);
  assert.equal(dotted(inside.network), "192.168.1.64");
  assert.equal(dotted(inside.broadcast), "192.168.1.127");
  const outside = checkMembership(ip("192.168.1.64"), 26, ip("192.168.1.128"));
  assert.equal(outside.inside, false);
  // Boundary addresses: network and broadcast themselves are inside.
  assert.equal(checkMembership(ip("192.168.1.64"), 26, ip("192.168.1.64")).inside, true);
  assert.equal(checkMembership(ip("192.168.1.64"), 26, ip("192.168.1.127")).inside, true);
  assert.equal(checkMembership(ip("192.168.1.64"), 26, ip("192.168.1.63")).inside, false);
});
