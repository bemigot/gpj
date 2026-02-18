import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 24 — function return type checking", () => {
  // --- valid: declared return type matches returned literal ---

  it("function(): Number returns Number literal — ok", () => {
    const { stdout } = execGPJ(
      "function f(): Number { return 42; } console.log(f());"
    );
    assert.equal(stdout, "42\n");
  });

  it("function(): String returns String literal — ok", () => {
    const { stdout } = execGPJ(
      'function f(): String { return "hi"; } console.log(f());'
    );
    assert.equal(stdout, "hi\n");
  });

  it("function(): Boolean returns Boolean literal — ok", () => {
    const { stdout } = execGPJ(
      "function f(): Boolean { return true; } console.log(f());"
    );
    assert.equal(stdout, "true\n");
  });

  it("function(): None returns None literal — ok", () => {
    const { stdout } = execGPJ(
      "function f(): None { return None; } console.log(f());"
    );
    assert.equal(stdout, "null\n");
  });

  it("function(): None with no return statement — ok (implicit None)", () => {
    // Just verify no type error is thrown — empty body implicitly returns None
    assert.doesNotThrow(() => runGPJ("function f(): None { }"));
  });

  it("function(): None with bare return — ok", () => {
    // bare return; is implicitly None
    assert.doesNotThrow(() => runGPJ("function f(): None { return; }"));
  });

  it("function with no return annotation — no check, no error", () => {
    const { stdout } = execGPJ(
      'function f() { return "hi"; } console.log(f());'
    );
    assert.equal(stdout, "hi\n");
  });

  it("function(): Number returns annotated param — ok", () => {
    const { stdout } = execGPJ(
      "function f(x: Number): Number { return x; } console.log(f(7));"
    );
    assert.equal(stdout, "7\n");
  });

  it("function(): String returns annotated param — ok", () => {
    const { stdout } = execGPJ(
      'function f(s: String): String { return s; } console.log(f("ok"));'
    );
    assert.equal(stdout, "ok\n");
  });

  // --- valid: arrow functions ---

  it("arrow (): Number => literal — ok", () => {
    const { stdout } = execGPJ(
      "let f = (): Number => 42; console.log(f());"
    );
    assert.equal(stdout, "42\n");
  });

  it("arrow (x: Number): Number => x — ok", () => {
    const { stdout } = execGPJ(
      "let f = (x: Number): Number => x; console.log(f(5));"
    );
    assert.equal(stdout, "5\n");
  });

  it("arrow (): Number => block return — ok", () => {
    const { stdout } = execGPJ(
      "let f = (): Number => { return 42; }; console.log(f());"
    );
    assert.equal(stdout, "42\n");
  });

  it("arrow with no return annotation — no error", () => {
    const { stdout } = execGPJ(
      "let f = (x: Number) => x; console.log(f(3));"
    );
    assert.equal(stdout, "3\n");
  });

  // --- valid: call-site type propagation ---

  it("declared return type used at call site — ok", () => {
    const { stdout } = execGPJ(
      "function f(): Number { return 42; } let x: Number = f(); console.log(x);"
    );
    assert.equal(stdout, "42\n");
  });

  it("inferred return type (from literal) used at call site — ok", () => {
    const { stdout } = execGPJ(
      "function f() { return 42; } let x: Number = f(); console.log(x);"
    );
    assert.equal(stdout, "42\n");
  });

  it("inferred String return used at call site — ok", () => {
    const { stdout } = execGPJ(
      'function f() { return "hi"; } let x: String = f(); console.log(x);'
    );
    assert.equal(stdout, "hi\n");
  });

  it("function call result with no annotation — no false positive", () => {
    const { stdout } = execGPJ(
      "function f(): Number { return 42; } let x = f(); console.log(x);"
    );
    assert.equal(stdout, "42\n");
  });

  it("binary expression return — no false positive on unannotated function", () => {
    const { stdout } = execGPJ(
      "function add(a: Number, b: Number): Number { return a + b; } console.log(add(2, 3));"
    );
    assert.equal(stdout, "5\n");
  });

  // --- valid: return type check inside if block ---

  it("return inside if — annotation matches — ok", () => {
    const { stdout } = execGPJ(`function f(x: Number): Number {
  if (x > 0) {
    return x;
  }
  return 0;
}
console.log(f(5));`);
    assert.equal(stdout, "5\n");
  });

  // --- type errors: return statement mismatch ---

  it("function(): Number returns String — type error", () => {
    assert.throws(() => runGPJ('function f(): Number { return "hello"; }'), /type mismatch/);
  });

  it("function(): String returns Number — type error", () => {
    assert.throws(() => runGPJ("function f(): String { return 42; }"), /type mismatch/);
  });

  it("function(): Boolean returns Number — type error", () => {
    assert.throws(() => runGPJ("function f(): Boolean { return 0; }"), /type mismatch/);
  });

  it("function(): Number returns None — type error", () => {
    assert.throws(() => runGPJ("function f(): Number { return None; }"), /type mismatch/);
  });

  it("function(): Number with bare return — type error (returns None)", () => {
    assert.throws(() => runGPJ("function f(): Number { return; }"), /type mismatch/);
  });

  it("function(): String returns Boolean — type error", () => {
    assert.throws(() => runGPJ("function f(): String { return true; }"), /type mismatch/);
  });

  // --- type errors: arrow function return mismatch ---

  it("arrow (): Number => String literal — type error", () => {
    assert.throws(() => runGPJ('let f = (): Number => "hi";'), /type mismatch/);
  });

  it("arrow (): String => Number literal — type error", () => {
    assert.throws(() => runGPJ("let f = (): String => 42;"), /type mismatch/);
  });

  it("arrow (): Number => block returns String — type error", () => {
    assert.throws(() => runGPJ('let f = (): Number => { return "hi"; };'), /type mismatch/);
  });

  // --- type errors: call-site mismatch ---

  it("declared String return assigned to Number variable — type error", () => {
    assert.throws(
      () => runGPJ('function f(): String { return "hi"; } let x: Number = f();'),
      /type mismatch/
    );
  });

  it("declared Number return assigned to String variable — type error", () => {
    assert.throws(
      () => runGPJ("function f(): Number { return 42; } let x: String = f();"),
      /type mismatch/
    );
  });

  it("inferred String return assigned to Number variable — type error", () => {
    assert.throws(
      () => runGPJ('function f() { return "hi"; } let x: Number = f();'),
      /type mismatch/
    );
  });

  it("inferred Number return assigned to String variable — type error", () => {
    assert.throws(
      () => runGPJ("function f() { return 42; } let x: String = f();"),
      /type mismatch/
    );
  });

  it("return type mismatch inside nested function is caught", () => {
    assert.throws(
      () => runGPJ('function outer() { function inner(): Number { return "oops"; } }'),
      /type mismatch/
    );
  });
});
