// Run with: npm test   (uses Node's built-in test runner, no extra packages)
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatEGP, normalizeAmountInput, toMinor } from "./money.ts";

test("toMinor parses whole and decimal amounts exactly", () => {
  assert.equal(toMinor("1250"), 125000);
  assert.equal(toMinor("1250.5"), 125050);
  assert.equal(toMinor("1250.05"), 125005);
  assert.equal(toMinor("1.15"), 115); // the classic float trap: 1.15 * 100 = 114.999...
  assert.equal(toMinor("0.01"), 1);
});

test("toMinor accepts thousands separators and Arabic digits", () => {
  assert.equal(toMinor("1,250,000.75"), 125000075);
  assert.equal(toMinor("١٬٢٥٠٫٥"), 125050);
  assert.equal(toMinor("۱۲۵۰"), 125000);
});

test("toMinor rejects invalid amounts", () => {
  for (const bad of ["", "0", "0.00", "-5", "1.234", "abc", "1.2.3", "1e5", " . "]) {
    assert.equal(toMinor(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});

test("normalizeAmountInput converts digits and separators", () => {
  assert.equal(normalizeAmountInput(" ٣٬٤٥٦٫٧ "), "3456.7");
});

test("formatEGP shows two decimals in both languages", () => {
  const en = formatEGP(125050, "en");
  assert.match(en, /1,250\.50/);
  const ar = formatEGP(125050, "ar");
  assert.match(ar, /١٬٢٥٠٫٥٠/);
});
