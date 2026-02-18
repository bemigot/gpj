import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 23 — basic type inference and checking", () => {
  // --- valid: no annotation (inference only, no error expected) ---

  it("no annotation: Number literal — inferred, no error", () => {
    const { stdout } = execGPJ("let x = 42; console.log(x);");
    assert.equal(stdout, "42\n");
  });

  it("no annotation: String literal — inferred, no error", () => {
    const { stdout } = execGPJ('let s = "hi"; console.log(s);');
    assert.equal(stdout, "hi\n");
  });

  it("no annotation: Boolean literal — inferred, no error", () => {
    const { stdout } = execGPJ("let b = true; console.log(b);");
    assert.equal(stdout, "true\n");
  });

  it("no annotation: None literal — inferred, no error", () => {
    const { stdout } = execGPJ("let n = None; console.log(n);");
    assert.equal(stdout, "null\n");
  });

  // --- valid: annotation matches literal ---

  it("let x: Number = 42", () => {
    const { stdout } = execGPJ("let x: Number = 42; console.log(x);");
    assert.equal(stdout, "42\n");
  });

  it('let s: String = "hi"', () => {
    const { stdout } = execGPJ('let s: String = "hi"; console.log(s);');
    assert.equal(stdout, "hi\n");
  });

  it("let b: Boolean = true", () => {
    const { stdout } = execGPJ("let b: Boolean = true; console.log(b);");
    assert.equal(stdout, "true\n");
  });

  it("let n: None = None", () => {
    const { stdout } = execGPJ("let n: None = None; console.log(n);");
    assert.equal(stdout, "null\n");
  });

  it("val x: Number = 42", () => {
    const { stdout } = execGPJ("val x: Number = 42; console.log(x);");
    assert.equal(stdout, "42\n");
  });

  // --- valid: Array<T> annotation matches element literals ---

  it("Array<Number> annotation with Number elements", () => {
    const { stdout } = execGPJ("let a: Array<Number> = [1, 2, 3]; console.log(a[0]);");
    assert.equal(stdout, "1\n");
  });

  it("Array<String> annotation with String elements", () => {
    const { stdout } = execGPJ('let a: Array<String> = ["x", "y"]; console.log(a[0]);');
    assert.equal(stdout, "x\n");
  });

  it("Array<Boolean> annotation with Boolean elements", () => {
    const { stdout } = execGPJ("let a: Array<Boolean> = [true, false]; console.log(a[1]);");
    assert.equal(stdout, "false\n");
  });

  // --- valid: nullable / union annotations — checking deferred to step 25 ---

  it("None assigned to Number? — no error (nullable deferred)", () => {
    const { stdout } = execGPJ("let n: Number? = None; console.log(n ?? 0);");
    assert.equal(stdout, "0\n");
  });

  it("None assigned to Number | None — no error (union deferred)", () => {
    const { stdout } = execGPJ("let v: Number | None = None; console.log(v ?? 42);");
    assert.equal(stdout, "42\n");
  });

  it("Number literal to union type — no error (union deferred)", () => {
    const { stdout } = execGPJ('let v: Number | String = 1; console.log(v);');
    assert.equal(stdout, "1\n");
  });

  // --- valid: unknown-typed init — no false positive ---

  it("init from function call — no error (return type unknown in step 23)", () => {
    const { stdout } = execGPJ(
      "function f() { return 42; } let x: Number = f(); console.log(x);"
    );
    assert.equal(stdout, "42\n");
  });

  it("init from binary expression — no error (expr type unknown in step 23)", () => {
    const { stdout } = execGPJ("let x = 1; let y = 2; let z: Number = x + y; console.log(z);");
    assert.equal(stdout, "3\n");
  });

  // --- valid: reassignment of same type ---

  it("let x = 42; x = 100 — same type, no error", () => {
    const { stdout } = execGPJ("let x = 42; x = 100; console.log(x);");
    assert.equal(stdout, "100\n");
  });

  it("let x: String = ...; x = ... — same type, no error", () => {
    const { stdout } = execGPJ('let x: String = "a"; x = "b"; console.log(x);');
    assert.equal(stdout, "b\n");
  });

  // --- valid: identifier type propagation ---

  it("identifier type propagated to new binding", () => {
    const { stdout } = execGPJ("let x = 42; let y = x; console.log(y);");
    assert.equal(stdout, "42\n");
  });

  it("let y: Number = x where x is Number — ok", () => {
    const { stdout } = execGPJ("let x = 42; let y: Number = x; console.log(y);");
    assert.equal(stdout, "42\n");
  });

  // --- valid: function params in scope for body checking ---

  it("function params typed, body OK", () => {
    const src = `function add(a: Number, b: Number): Number { return a + b; }
console.log(add(2, 3));`;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "5\n");
  });

  // --- type errors: annotation vs literal mismatch ---

  it("Number annotation but String literal → type error", () => {
    assert.throws(() => runGPJ('let x: Number = "hello";'), /type mismatch/);
  });

  it("String annotation but Number literal → type error", () => {
    assert.throws(() => runGPJ("let x: String = 42;"), /type mismatch/);
  });

  it("Boolean annotation but Number literal → type error", () => {
    assert.throws(() => runGPJ("let x: Boolean = 42;"), /type mismatch/);
  });

  it("Number annotation but Boolean literal → type error", () => {
    assert.throws(() => runGPJ("let x: Number = true;"), /type mismatch/);
  });

  it("None annotation but Number literal → type error", () => {
    assert.throws(() => runGPJ("let x: None = 42;"), /type mismatch/);
  });

  it("Number annotation but None literal → type error", () => {
    assert.throws(() => runGPJ("let x: Number = None;"), /type mismatch/);
  });

  it("String annotation but None literal → type error", () => {
    assert.throws(() => runGPJ("let x: String = None;"), /type mismatch/);
  });

  it("Boolean annotation but None literal → type error", () => {
    assert.throws(() => runGPJ("let x: Boolean = None;"), /type mismatch/);
  });

  it("val: String annotation but Number literal → type error", () => {
    assert.throws(() => runGPJ("val x: String = 42;"), /type mismatch/);
  });

  // --- type errors: Array element mismatch ---

  it("Array<Number> with String elements → type error", () => {
    assert.throws(() => runGPJ('let a: Array<Number> = ["x", "y"];'), /type mismatch/);
  });

  it("Array<Number> with mixed elements → type error on String element", () => {
    assert.throws(() => runGPJ('let a: Array<Number> = [1, "two", 3];'), /type mismatch/);
  });

  it("Array<String> with Number elements → type error", () => {
    assert.throws(() => runGPJ("let a: Array<String> = [1, 2, 3];"), /type mismatch/);
  });

  it("Array<Boolean> with Number element → type error", () => {
    assert.throws(() => runGPJ("let a: Array<Boolean> = [true, 0];"), /type mismatch/);
  });

  // --- type errors: reassignment ---

  it('let x = 42; x = "hello" → type error', () => {
    assert.throws(() => runGPJ('let x = 42; x = "hello";'), /type mismatch/);
  });

  it('let x: Number = 42; x = "hello" → type error', () => {
    assert.throws(() => runGPJ('let x: Number = 42; x = "hello";'), /type mismatch/);
  });

  it('let x = "hi"; x = 42 → type error (String → Number)', () => {
    assert.throws(() => runGPJ('let x = "hi"; x = 42;'), /type mismatch/);
  });

  it("let x = true; x = 0 → type error (Boolean → Number)", () => {
    assert.throws(() => runGPJ("let x = true; x = 0;"), /type mismatch/);
  });

  // --- type errors: identifier propagation ---

  it("let x = 42; let y: String = x → type error", () => {
    assert.throws(() => runGPJ('let x = 42; let y: String = x;'), /type mismatch/);
  });

  it("let x: Number = 1; let y: Boolean = x → type error", () => {
    assert.throws(() => runGPJ("let x: Number = 1; let y: Boolean = x;"), /type mismatch/);
  });

  // --- type errors: inside function body ---

  it("type mismatch inside function body is caught", () => {
    const src = `function f(x: Number) {
  let y: String = x;
}`;
    assert.throws(() => runGPJ(src), /type mismatch/);
  });

  it("type mismatch inside if block is caught", () => {
    const src = `let x = 42;
if (true) {
  let y: String = x;
}`;
    assert.throws(() => runGPJ(src), /type mismatch/);
  });
});
