import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execGPJ, runGPJ } from "./helpers.js";

describe("step 4 — functions (declaration, arrow, expression)", () => {
  // --- function declarations (regression) ---

  it("basic function call", () => {
    const src = `
      function greet(name) { console.log("hi " + name); }
      greet("world");
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "hi world\n");
  });

  it("multiple params", () => {
    const src = `
      function add(a, b) { return a + b; }
      console.log(add(3, 4));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "7\n");
  });

  it("recursion — factorial", () => {
    const src = `
      function fact(n) {
        if (n < 2) { return 1; }
        return n * fact(n - 1);
      }
      console.log(fact(5));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "120\n");
  });

  it("return value used in expression", () => {
    const src = `
      function double(x) { return x * 2; }
      console.log(double(3) + 1);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "7\n");
  });

  // --- arrow functions ---

  it("arrow — expression body", () => {
    const src = `
      let double = (x) => x * 2;
      console.log(double(5));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "10\n");
  });

  it("arrow — block body", () => {
    const src = `
      let add = (a, b) => { return a + b; };
      console.log(add(3, 4));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "7\n");
  });

  it("arrow — no params", () => {
    const src = `
      let greet = () => "hi";
      console.log(greet());
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "hi\n");
  });

  it("arrow — closure captures outer variable", () => {
    const src = `
      let x = 10;
      let addX = (y) => x + y;
      console.log(addX(5));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "15\n");
  });

  it("arrow — with type annotations", () => {
    const src = `
      let double = (x: Number): Number => x * 2;
      console.log(double(5));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "10\n");
  });

  it("arrow — passed as callback", () => {
    const src = `
      function apply(f, x) { return f(x); }
      let result = apply((n) => n * 3, 7);
      console.log(result);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "21\n");
  });

  // --- function expressions ---

  it("function expression — basic", () => {
    const src = `
      let f = function(x) { return x * 2; };
      console.log(f(5));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "10\n");
  });

  it("function expression — closure factory", () => {
    const src = `
      function makeAdder(x) {
        return function(y) { return x + y; };
      }
      let add5 = makeAdder(5);
      console.log(add5(3));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "8\n");
  });

  // --- higher-order functions ---

  it("function taking function param", () => {
    const src = `
      function twice(f, x) { return f(f(x)); }
      function inc(n) { return n + 1; }
      console.log(twice(inc, 5));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "7\n");
  });

  // --- implicit None return ---

  it("function without return gives None", () => {
    const src = `
      function noop() {}
      console.log(noop());
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "undefined\n");
  });

  // --- grouped expression still works ---

  it("parenthesized expression is not confused with arrow", () => {
    const src = `
      let x = (3 + 4) * 2;
      console.log(x);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "14\n");
  });
});
