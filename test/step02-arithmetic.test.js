import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 2 — arithmetic, string concat, and binary operators", () => {
  // --- execution tests ---

  it("2 + 3 → 5", () => {
    const { stdout } = execGPJ("console.log(2 + 3);");
    assert.equal(stdout, "5\n");
  });

  it("10 - 4 → 6", () => {
    const { stdout } = execGPJ("console.log(10 - 4);");
    assert.equal(stdout, "6\n");
  });

  it("3 * 7 → 21", () => {
    const { stdout } = execGPJ("console.log(3 * 7);");
    assert.equal(stdout, "21\n");
  });

  it("15 / 4 → 3.75", () => {
    const { stdout } = execGPJ("console.log(15 / 4);");
    assert.equal(stdout, "3.75\n");
  });

  it("10 % 3 → 1", () => {
    const { stdout } = execGPJ("console.log(10 % 3);");
    assert.equal(stdout, "1\n");
  });

  it("2 ** 10 → 1024", () => {
    const { stdout } = execGPJ("console.log(2 ** 10);");
    assert.equal(stdout, "1024\n");
  });

  it('string concat: "hello" + " world"', () => {
    const { stdout } = execGPJ('console.log("hello" + " world");');
    assert.equal(stdout, "hello world\n");
  });

  // --- zero-precedence: same-op chaining is left-assoc ---

  it("same-op chain: 1 + 2 + 3 → 6", () => {
    const { stdout } = execGPJ("console.log(1 + 2 + 3);");
    assert.equal(stdout, "6\n");
  });

  it("** chains left-assoc: 2 ** 2 ** 3 → 64", () => {
    // (2**2)**3 = 4**3 = 64, NOT 2**(2**3) = 256
    const { stdout } = execGPJ("console.log(2 ** 2 ** 3);");
    assert.equal(stdout, "64\n");
  });

  it("explicit parens: (2 + 3) * 4 → 20", () => {
    const { stdout } = execGPJ("console.log((2 + 3) * 4);");
    assert.equal(stdout, "20\n");
  });

  it("nested parens: 2 * (3 + 4) → 14", () => {
    const { stdout } = execGPJ("console.log(2 * (3 + 4));");
    assert.equal(stdout, "14\n");
  });

  // --- zero-precedence: mixed ops → parse error ---

  it("mixed ops without parens → parse error", () => {
    assert.throws(
      () => parse(lex("console.log(2 + 3 * 4);")),
      /parentheses/
    );
  });

  it("mixed && and || without parens → parse error", () => {
    assert.throws(
      () => parse(lex("console.log(a && b || c);")),
      /parentheses/
    );
  });

  // --- comparison operators cannot chain ---

  it("chained == → parse error", () => {
    assert.throws(
      () => parse(lex("console.log(a == b == c);")),
      /parentheses/
    );
  });

  it("comparison followed by different op → parse error", () => {
    assert.throws(
      () => parse(lex("console.log(a < b + c);")),
      /parentheses/
    );
  });

  // --- comparison and logical ---

  it("comparison: 3 > 2 → true", () => {
    const { stdout } = execGPJ("console.log(3 > 2);");
    assert.equal(stdout, "true\n");
  });

  it("logical: true && false → false", () => {
    const { stdout } = execGPJ("console.log(true && false);");
    assert.equal(stdout, "false\n");
  });

  // --- unary + binary ---

  it("unary + binary: -5 + 3 → -2", () => {
    const { stdout } = execGPJ("console.log(-5 + 3);");
    assert.equal(stdout, "-2\n");
  });

  // --- type error tests ---

  it('1 + "hi" → TypeError, nonzero exit', () => {
    const { stderr, exitCode } = execGPJ('console.log(1 + "hi");');
    assert.notEqual(exitCode, 0);
    assert.ok(stderr.includes("TypeError"), `expected TypeError, got: ${stderr}`);
  });

  it('"hi" - 1 → TypeError, nonzero exit', () => {
    const { stderr, exitCode } = execGPJ('console.log("hi" - 1);');
    assert.notEqual(exitCode, 0);
    assert.ok(stderr.includes("TypeError"), `expected TypeError, got: ${stderr}`);
  });

  // --- codegen tests ---

  it("2 + 3 → JS contains __gpj_add", () => {
    const { js } = runGPJ("console.log(2 + 3);");
    assert.ok(js.includes("__gpj_add"), `expected __gpj_add in: ${js}`);
  });

  it("2 * 3 → JS contains __gpj_arith", () => {
    const { js } = runGPJ("console.log(2 * 3);");
    assert.ok(js.includes("__gpj_arith"), `expected __gpj_arith in: ${js}`);
  });

  it("a > b → plain >, no runtime wrapper", () => {
    const { js } = runGPJ("let a = 1;\nlet b = 2;\nconsole.log(a > b);");
    assert.ok(js.includes(">"), "expected > in output");
    assert.ok(!js.includes("__gpj_add"), "should not include __gpj_add");
    assert.ok(!js.includes("__gpj_arith"), "should not include __gpj_arith");
  });
});
