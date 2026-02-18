import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 22 — type representation (annotations parsed into AST)", () => {
  // --- type annotations on variable declarations ---

  it("plain named type annotation: let x: Number = 5", () => {
    const { stdout } = execGPJ("let x: Number = 5; console.log(x);");
    assert.equal(stdout, "5\n");
  });

  it("String annotation", () => {
    const { stdout } = execGPJ('let s: String = "hi"; console.log(s);');
    assert.equal(stdout, "hi\n");
  });

  it("Boolean annotation", () => {
    const { stdout } = execGPJ("let b: Boolean = true; console.log(b);");
    assert.equal(stdout, "true\n");
  });

  it("None annotation", () => {
    const { stdout } = execGPJ("let n: None = None; console.log(n);");
    assert.equal(stdout, "null\n");
  });

  it("generic type: Array<Number>", () => {
    const { stdout } = execGPJ("let a: Array<Number> = [1, 2, 3]; console.log(a[0]);");
    assert.equal(stdout, "1\n");
  });

  it("nested generic: Array<Array<Number>>", () => {
    const { stdout } = execGPJ("let a: Array<Array<Number>> = [[1], [2]]; console.log(a[0][0]);");
    assert.equal(stdout, "1\n");
  });

  it("generic with two params: Map<String, Number>", () => {
    const { js } = runGPJ("let m: Map<String, Number> = None;");
    assert.ok(js.includes("null"), js);
  });

  it("nullable type: Number?", () => {
    const { stdout } = execGPJ("let n: Number? = None; console.log(n ?? 0);");
    assert.equal(stdout, "0\n");
  });

  it("object type annotation: {x: Number, y: Number}", () => {
    const { stdout } = execGPJ("let p: {x: Number, y: Number} = {x: 1, y: 2}; console.log(p.x);");
    assert.equal(stdout, "1\n");
  });

  it("tuple type annotation: [String, Number]", () => {
    const { stdout } = execGPJ('let t: [String, Number] = ["age", 30]; console.log(t[1]);');
    assert.equal(stdout, "30\n");
  });

  // --- union types ---

  it("union type annotation: Number | String", () => {
    const { stdout } = execGPJ('let v: Number | String = "hello"; console.log(v);');
    assert.equal(stdout, "hello\n");
  });

  it("union with None: Number | None", () => {
    const { stdout } = execGPJ("let v: Number | None = None; console.log(v ?? 42);");
    assert.equal(stdout, "42\n");
  });

  it("three-way union: Number | String | Boolean", () => {
    const { stdout } = execGPJ("let v: Number | String | Boolean = true; console.log(v);");
    assert.equal(stdout, "true\n");
  });

  // --- type aliases ---

  it("simple type alias is parsed", () => {
    const { js } = runGPJ("type ID = String; console.log(1);");
    assert.ok(!js.includes("type"), js);
  });

  it("union type alias: type ID = String | Number", () => {
    const { js } = runGPJ("type ID = String | Number; console.log(1);");
    assert.ok(!js.includes("type"), js);
  });

  it("object type alias: type Point = {x: Number, y: Number}", () => {
    const { js } = runGPJ("type Point = {x: Number, y: Number}; console.log(1);");
    assert.ok(!js.includes("type"), js);
  });

  it("tuple type alias: type Pair = [String, Number]", () => {
    const { js } = runGPJ("type Pair = [String, Number]; console.log(1);");
    assert.ok(!js.includes("type"), js);
  });

  it("generic type alias: type Pair<K, V> = [K, V]", () => {
    const { js } = runGPJ("type Pair<K, V> = [K, V]; console.log(1);");
    assert.ok(!js.includes("type"), js);
  });

  it("nullable type alias: type MaybeNum = Number?", () => {
    const { js } = runGPJ("type MaybeNum = Number?; console.log(1);");
    assert.ok(!js.includes("type"), js);
  });

  // --- function type annotations ---

  it("function with param and return type annotations", () => {
    const src = `
      function add(a: Number, b: Number): Number { return a + b; }
      console.log(add(2, 3));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "5\n");
  });

  it("arrow function with type annotations", () => {
    const src = `let double = (x: Number): Number => x + x; console.log(double(4));`;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "8\n");
  });

  it("rest param with type annotation", () => {
    const src = `
      function sum(...nums: Array<Number>): Number {
        let total = 0;
        for (let n of nums) { total = total + n; }
        return total;
      }
      console.log(sum(1, 2, 3));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "6\n");
  });

  it("function with object type param", () => {
    const src = `
      function getX(p: {x: Number, y: Number}): Number { return p.x; }
      console.log(getX({x: 10, y: 20}));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "10\n");
  });

  // --- catch type annotation ---

  it("catch with type annotation is parsed", () => {
    const src = `
      try { throw {message: "oops"}; }
      catch (e: {message: String}) { console.log(e.message); }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "oops\n");
  });

  // --- codegen is unchanged ---

  it("type annotations do not appear in generated JS", () => {
    const { js } = runGPJ("let x: Number = 42; console.log(x);");
    assert.ok(!js.includes("Number"), `unexpected 'Number' in: ${js}`);
    assert.ok(!js.includes(":"), `unexpected ':' in: ${js}`);
  });

  it("union type does not appear in generated JS", () => {
    const { js } = runGPJ('let v: Number | String = "hi"; console.log(v);');
    assert.ok(!js.includes("Number"), js);
    assert.ok(!js.includes("String"), js);
  });
});
