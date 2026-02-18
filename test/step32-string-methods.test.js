import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execGPJ, runGPJ } from "./helpers.js";

describe("step 32 — String built-in methods", () => {
  // --- at(n) ---

  it('"hello".at(0) → "h"', () => {
    const { stdout } = execGPJ(`console.log("hello".at(0));`);
    assert.equal(stdout, "h\n");
  });

  it('"hello".at(-1) → "o" (negative index)', () => {
    const { stdout } = execGPJ(`console.log("hello".at(-1));`);
    assert.equal(stdout, "o\n");
  });

  it('"hello".at(10) → null (None, out of bounds)', () => {
    const { stdout } = execGPJ(`console.log("hello".at(10));`);
    assert.equal(stdout, "null\n");
  });

  // --- indexOf ---

  it('"hello".indexOf("ll") → 2', () => {
    const { stdout } = execGPJ(`console.log("hello".indexOf("ll"));`);
    assert.equal(stdout, "2\n");
  });

  it('"hello".indexOf("h") → 0 (first char)', () => {
    const { stdout } = execGPJ(`console.log("hello".indexOf("h"));`);
    assert.equal(stdout, "0\n");
  });

  it('"hello".indexOf("xyz") → null (None, not found)', () => {
    const { stdout } = execGPJ(`console.log("hello".indexOf("xyz"));`);
    assert.equal(stdout, "null\n");
  });

  // --- split ---

  it('"a,b,c".split(",") splits on separator', () => {
    const { stdout } = execGPJ(`
val parts = "a,b,c".split(",");
console.log(parts[0]);
console.log(parts[1]);
console.log(parts[2]);
`);
    assert.equal(stdout, "a\nb\nc\n");
  });

  it('"hi".split("") splits into chars', () => {
    const { stdout } = execGPJ(`
val parts = "hi".split("");
console.log(parts[0]);
console.log(parts[1]);
`);
    assert.equal(stdout, "h\ni\n");
  });

  it("split() without args — runtime TypeError", () => {
    const { exitCode, stderr } = execGPJ(`"hello".split();`);
    assert.notEqual(exitCode, 0);
    assert.match(stderr, /separator/i);
  });

  // --- String.compare ---

  it('String.compare("a", "b") → -1', () => {
    const { stdout } = execGPJ(`console.log(String.compare("a", "b"));`);
    assert.equal(stdout, "-1\n");
  });

  it('String.compare("b", "a") → 1', () => {
    const { stdout } = execGPJ(`console.log(String.compare("b", "a"));`);
    assert.equal(stdout, "1\n");
  });

  it('String.compare("a", "a") → 0', () => {
    const { stdout } = execGPJ(`console.log(String.compare("a", "a"));`);
    assert.equal(stdout, "0\n");
  });

  // --- pass-through methods ---

  it('"  hi  ".trim() strips whitespace', () => {
    const { stdout } = execGPJ(`console.log("  hi  ".trim());`);
    assert.equal(stdout, "hi\n");
  });

  it('"Hello".toLowerCase()', () => {
    const { stdout } = execGPJ(`console.log("Hello".toLowerCase());`);
    assert.equal(stdout, "hello\n");
  });

  it('"hello".toUpperCase()', () => {
    const { stdout } = execGPJ(`console.log("hello".toUpperCase());`);
    assert.equal(stdout, "HELLO\n");
  });

  it('"hello".includes("ll") → true', () => {
    const { stdout } = execGPJ(`console.log("hello".includes("ll"));`);
    assert.equal(stdout, "true\n");
  });

  it('"hello".startsWith("hel") → true', () => {
    const { stdout } = execGPJ(`console.log("hello".startsWith("hel"));`);
    assert.equal(stdout, "true\n");
  });

  it('"hello".endsWith("lo") → true', () => {
    const { stdout } = execGPJ(`console.log("hello".endsWith("lo"));`);
    assert.equal(stdout, "true\n");
  });

  it('"hello".slice(1, 3) → "el"', () => {
    const { stdout } = execGPJ(`console.log("hello".slice(1, 3));`);
    assert.equal(stdout, "el\n");
  });

  it('"hello world".replace("world", "GPJ")', () => {
    const { stdout } = execGPJ(`console.log("hello world".replace("world", "GPJ"));`);
    assert.equal(stdout, "hello GPJ\n");
  });

  // --- preamble is always injected ---

  it("String preamble always present in codegen output", () => {
    const { js } = runGPJ(`let x = 1;`);
    assert.ok(js.includes("String.compare"), `expected String preamble in: ${js}`);
  });
});
