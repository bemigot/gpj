import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execGPJ, runGPJ } from "./helpers.js";

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

  it("== emits __gpj_eq", () => {
    const { js } = runGPJ(`console.log(1 == 1);`);
    assert.ok(js.includes("__gpj_eq("), `expected __gpj_eq in: ${js}`);
  });

  it("!= emits !__gpj_eq", () => {
    const { js } = runGPJ(`console.log(1 != 2);`);
    assert.ok(js.includes("!__gpj_eq("), `expected !__gpj_eq in: ${js}`);
  });

  // --- nullish coalescing ---

  it("None ?? 5 → 5", () => {
    const { stdout } = execGPJ(`console.log(None ?? 5);`);
    assert.equal(stdout, "5\n");
  });

  it("3 ?? 5 — TypeCheckError (Number is not nullable)", () => {
    assert.throws(() => runGPJ(`console.log(3 ?? 5);`), /\?\?/);
  });

  it('"" ?? "fallback" — TypeCheckError (String is not nullable)', () => {
    assert.throws(() => runGPJ(`console.log("" ?? "fallback");`), /\?\?/);
  });

  it("0 ?? 10 — TypeCheckError (Number is not nullable)", () => {
    assert.throws(() => runGPJ(`console.log(0 ?? 10);`), /\?\?/);
  });

  it("false ?? true — TypeCheckError (Boolean is not nullable)", () => {
    assert.throws(() => runGPJ(`console.log(false ?? true);`), /\?\?/);
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
