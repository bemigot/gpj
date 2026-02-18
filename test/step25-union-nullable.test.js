import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 25 — union and nullable assignment checking", () => {
  // --- valid: union types ---

  it("Number | String — assign Number literal — ok", () => {
    const { stdout } = execGPJ("let v: Number | String = 42; console.log(v);");
    assert.equal(stdout, "42\n");
  });

  it("Number | String — assign String literal — ok", () => {
    const { stdout } = execGPJ('let v: Number | String = "hello"; console.log(v);');
    assert.equal(stdout, "hello\n");
  });

  it("Number | String | Boolean — assign Boolean literal — ok", () => {
    const { stdout } = execGPJ("let v: Number | String | Boolean = true; console.log(v);");
    assert.equal(stdout, "true\n");
  });

  it("Number | None — assign Number — ok", () => {
    const { stdout } = execGPJ("let v: Number | None = 42; console.log(v);");
    assert.equal(stdout, "42\n");
  });

  it("Number | None — assign None — ok", () => {
    const { stdout } = execGPJ("let v: Number | None = None; console.log(v ?? 0);");
    assert.equal(stdout, "0\n");
  });

  // --- valid: nullable types (T?) ---

  it("Number? — assign Number literal — ok", () => {
    const { stdout } = execGPJ("let n: Number? = 42; console.log(n);");
    assert.equal(stdout, "42\n");
  });

  it("Number? — assign None — ok", () => {
    const { stdout } = execGPJ("let n: Number? = None; console.log(n ?? 0);");
    assert.equal(stdout, "0\n");
  });

  it("String? — assign String — ok", () => {
    const { stdout } = execGPJ('let s: String? = "hi"; console.log(s);');
    assert.equal(stdout, "hi\n");
  });

  it("String? — assign None — ok", () => {
    const { stdout } = execGPJ("let s: String? = None; console.log(s ?? \"x\");");
    assert.equal(stdout, "x\n");
  });

  it("Boolean? — assign Boolean — ok", () => {
    const { stdout } = execGPJ("let b: Boolean? = true; console.log(b);");
    assert.equal(stdout, "true\n");
  });

  it("Boolean? — assign None — ok", () => {
    const { stdout } = execGPJ("let b: Boolean? = None; console.log(b ?? false);");
    assert.equal(stdout, "false\n");
  });

  // --- valid: identifier of compatible type ---

  it("Number | String — assign Number identifier — ok", () => {
    const { stdout } = execGPJ("let x = 42; let v: Number | String = x; console.log(v);");
    assert.equal(stdout, "42\n");
  });

  it("Number? — assign Number identifier — ok", () => {
    const { stdout } = execGPJ("let x = 42; let n: Number? = x; console.log(n);");
    assert.equal(stdout, "42\n");
  });

  // --- valid: Array with union element type ---

  it("Array<Number | String> with mixed literals — ok", () => {
    const { stdout } = execGPJ(
      'let a: Array<Number | String> = [1, "two", 3]; console.log(a[1]);'
    );
    assert.equal(stdout, "two\n");
  });

  it("Array<Number?> with Number and None elements — ok", () => {
    const { stdout } = execGPJ(
      "let a: Array<Number?> = [1, None, 3]; console.log(a[0]);"
    );
    assert.equal(stdout, "1\n");
  });

  // --- valid: function return type is union ---

  it("function(): Number | String returns Number — ok", () => {
    const { stdout } = execGPJ(
      "function f(): Number | String { return 42; } console.log(f());"
    );
    assert.equal(stdout, "42\n");
  });

  it("function(): Number | String returns String — ok", () => {
    const { stdout } = execGPJ(
      'function f(): Number | String { return "hi"; } console.log(f());'
    );
    assert.equal(stdout, "hi\n");
  });

  it("function(): Number? returns None — ok", () => {
    const { stdout } = execGPJ(
      "function f(): Number? { return None; } console.log(f() ?? 0);"
    );
    assert.equal(stdout, "0\n");
  });

  // --- type errors: union mismatch ---

  it("Number | String — assign Boolean — type error", () => {
    assert.throws(() => runGPJ("let v: Number | String = true;"), /type mismatch/);
  });

  it("Number | String — assign None — type error", () => {
    assert.throws(() => runGPJ("let v: Number | String = None;"), /type mismatch/);
  });

  it("Number | Boolean — assign String — type error", () => {
    assert.throws(() => runGPJ('let v: Number | Boolean = "hi";'), /type mismatch/);
  });

  it("String | Boolean — assign Number — type error", () => {
    assert.throws(() => runGPJ("let v: String | Boolean = 42;"), /type mismatch/);
  });

  // --- type errors: nullable mismatch ---

  it("Number? — assign String — type error", () => {
    assert.throws(() => runGPJ('let n: Number? = "hello";'), /type mismatch/);
  });

  it("Number? — assign Boolean — type error", () => {
    assert.throws(() => runGPJ("let n: Number? = true;"), /type mismatch/);
  });

  it("String? — assign Number — type error", () => {
    assert.throws(() => runGPJ("let s: String? = 42;"), /type mismatch/);
  });

  it("Boolean? — assign String — type error", () => {
    assert.throws(() => runGPJ('let b: Boolean? = "hi";'), /type mismatch/);
  });

  // --- type errors: identifier of wrong type ---

  it("Number? — assign String identifier — type error", () => {
    assert.throws(() => runGPJ('let x = "hi"; let n: Number? = x;'), /type mismatch/);
  });

  it("Number | Boolean — assign String identifier — type error", () => {
    assert.throws(() => runGPJ('let x = "hi"; let v: Number | Boolean = x;'), /type mismatch/);
  });

  // --- type errors: Array with union element mismatch ---

  it("Array<Number | String> — Boolean element — type error", () => {
    assert.throws(
      () => runGPJ("let a: Array<Number | String> = [1, true];"),
      /type mismatch/
    );
  });

  it("Array<Number?> — String element — type error", () => {
    assert.throws(
      () => runGPJ('let a: Array<Number?> = [1, "hi"];'),
      /type mismatch/
    );
  });

  // --- type errors: function return type mismatch against union ---

  it("function(): Number | String returns Boolean — type error", () => {
    assert.throws(
      () => runGPJ("function f(): Number | String { return true; }"),
      /type mismatch/
    );
  });

  it("function(): Number? returns String — type error", () => {
    assert.throws(
      () => runGPJ('function f(): Number? { return "hi"; }'),
      /type mismatch/
    );
  });
});
