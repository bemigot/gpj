import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 21 — whitespace enforcement around operators", () => {
  // --- valid programs (no error expected) ---

  it("spaces around + are OK", () => {
    const { stdout } = execGPJ("console.log(1 + 2);");
    assert.equal(stdout, "3\n");
  });

  it("spaces around * are OK", () => {
    const { stdout } = execGPJ("console.log(3 * 4);");
    assert.equal(stdout, "12\n");
  });

  it("spaces around == are OK", () => {
    const { stdout } = execGPJ("console.log(1 == 1);");
    assert.equal(stdout, "true\n");
  });

  it("spaces around && are OK", () => {
    const { stdout } = execGPJ("console.log(true && false);");
    assert.equal(stdout, "false\n");
  });

  it("spaces around ?? are OK", () => {
    const { stdout } = execGPJ("console.log(None ?? 5);");
    assert.equal(stdout, "5\n");
  });

  it("spaces around assignment = are OK", () => {
    const { stdout } = execGPJ("let x = 0; x = 5; console.log(x);");
    assert.equal(stdout, "5\n");
  });

  it("spaces around += are OK", () => {
    const { stdout } = execGPJ("let x = 1; x += 2; console.log(x);");
    assert.equal(stdout, "3\n");
  });

  it("spaces around ternary ? and : are OK", () => {
    const { stdout } = execGPJ('console.log(true ? "yes" : "no");');
    assert.equal(stdout, "yes\n");
  });

  it("chained same operator with spaces is OK", () => {
    const { stdout } = execGPJ("console.log(1 + 2 + 3);");
    assert.equal(stdout, "6\n");
  });

  it("unary minus needs no space", () => {
    const { stdout } = execGPJ("console.log(-5);");
    assert.equal(stdout, "-5\n");
  });

  it("unary ! needs no space", () => {
    const { stdout } = execGPJ("console.log(!true);");
    assert.equal(stdout, "false\n");
  });

  it("typeof needs no space after keyword", () => {
    const { stdout } = execGPJ("console.log(typeof 42);");
    assert.equal(stdout, "Number\n");
  });

  it("bracket access needs no spaces: a[0]", () => {
    const { stdout } = execGPJ("let a = [10, 20]; console.log(a[0]);");
    assert.equal(stdout, "10\n");
  });

  it("parens allow mixing operators: (a + b) * c", () => {
    const { stdout } = execGPJ("console.log((1 + 2) * 3);");
    assert.equal(stdout, "9\n");
  });

  it("unary minus before binary op: -5 + 3", () => {
    const { stdout } = execGPJ("console.log(-5 + 3);");
    assert.equal(stdout, "-2\n");
  });

  // --- errors: missing space before operator ---

  it("1+2 → parse error: missing space before +", () => {
    assert.throws(() => runGPJ("1+2;"), /must be preceded by a space/);
  });

  it("1==2 → parse error: missing space before ==", () => {
    assert.throws(() => runGPJ("1==2;"), /must be preceded by a space/);
  });

  it("a&&b → parse error: missing space before &&", () => {
    assert.throws(() => runGPJ("let a = true; let b = false; a&&b;"), /must be preceded by a space/);
  });

  it("a||b → parse error: missing space before ||", () => {
    assert.throws(() => runGPJ("let a = true; let b = false; a||b;"), /must be preceded by a space/);
  });

  it("x=5 (assignment) → parse error: missing space before =", () => {
    assert.throws(() => runGPJ("let x = 0; x=5;"), /must be preceded by a space/);
  });

  it("x+=1 → parse error: missing space before +=", () => {
    assert.throws(() => runGPJ("let x = 0; x+=1;"), /must be preceded by a space/);
  });

  it("a?b:c → parse error: missing space before ?", () => {
    assert.throws(() => runGPJ('let a = true; let b = 1; let c = 2; a?b:c;'), /must be preceded by a space/);
  });

  // --- errors: missing space after operator ---

  it("1 +2 → parse error: missing space after +", () => {
    assert.throws(() => runGPJ("1 +2;"), /must be followed by a space/);
  });

  it("1 ==2 → parse error: missing space after ==", () => {
    assert.throws(() => runGPJ("1 ==2;"), /must be followed by a space/);
  });

  it("x = 5+3 → parse error: missing space before + inside rhs", () => {
    assert.throws(() => runGPJ("let x = 0; x = 5+3;"), /must be preceded by a space/);
  });

  it("true ? 1:2 → parse error: missing space before :", () => {
    assert.throws(() => runGPJ("true ? 1:2;"), /must be preceded by a space/);
  });

  it("true ?1 : 2 → parse error: missing space after ?", () => {
    assert.throws(() => runGPJ("true ?1 : 2;"), /must be followed by a space/);
  });
});
