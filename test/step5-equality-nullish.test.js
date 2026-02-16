"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execGPJ, runGPJ } = require("./helpers");

describe("step 5 — == / != / ??", () => {
  // --- equality ---

  it("1 == 1 → true", () => {
    const { stdout } = execGPJ(`console.log(1 == 1);`);
    assert.equal(stdout, "true\n");
  });

  it("1 != 2 → true", () => {
    const { stdout } = execGPJ(`console.log(1 != 2);`);
    assert.equal(stdout, "true\n");
  });

  it('"a" == "a" → true', () => {
    const { stdout } = execGPJ(`console.log("a" == "a");`);
    assert.equal(stdout, "true\n");
  });

  it("None == None → true", () => {
    const { stdout } = execGPJ(`console.log(None == None);`);
    assert.equal(stdout, "true\n");
  });

  it("1 == 2 → false", () => {
    const { stdout } = execGPJ(`console.log(1 == 2);`);
    assert.equal(stdout, "false\n");
  });

  it('"a" != "a" → false', () => {
    const { stdout } = execGPJ(`console.log("a" != "a");`);
    assert.equal(stdout, "false\n");
  });

  it("== emits ===", () => {
    const { js } = runGPJ(`console.log(1 == 1);`);
    assert.ok(js.includes("==="), `expected === in: ${js}`);
  });

  it("!= emits !==", () => {
    const { js } = runGPJ(`console.log(1 != 2);`);
    assert.ok(js.includes("!=="), `expected !== in: ${js}`);
  });

  // --- nullish coalescing ---

  it("None ?? 5 → 5", () => {
    const { stdout } = execGPJ(`console.log(None ?? 5);`);
    assert.equal(stdout, "5\n");
  });

  it("3 ?? 5 → 3", () => {
    const { stdout } = execGPJ(`console.log(3 ?? 5);`);
    assert.equal(stdout, "3\n");
  });

  it('"" ?? "fallback" → "" (empty string is not None)', () => {
    const { stdout } = execGPJ(`console.log("" ?? "fallback");`);
    assert.equal(stdout, "\n");
  });

  it("0 ?? 10 → 0 (zero is not None)", () => {
    const { stdout } = execGPJ(`console.log(0 ?? 10);`);
    assert.equal(stdout, "0\n");
  });

  it("false ?? true → false (false is not None)", () => {
    const { stdout } = execGPJ(`console.log(false ?? true);`);
    assert.equal(stdout, "false\n");
  });

  it("None ?? None → None", () => {
    const { stdout } = execGPJ(`console.log(None ?? None);`);
    assert.equal(stdout, "null\n");
  });

  it("chained: None ?? None ?? 3 → 3", () => {
    const { stdout } = execGPJ(`console.log(None ?? None ?? 3);`);
    assert.equal(stdout, "3\n");
  });

  it("mixed ?? with + without parens → parse error", () => {
    assert.throws(() => runGPJ(`let x = 1 ?? 2 + 3;`), /parentheses/i);
  });
});
