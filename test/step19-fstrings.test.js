import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execGPJ } from "./helpers.js";

describe("step 19 — f-strings", () => {
  it("basic variable interpolation", () => {
    const { stdout } = execGPJ(`
      let name = "world";
      console.log(f"Hello, {name}!");
    `);
    assert.equal(stdout, "Hello, world!\n");
  });

  it("arithmetic expression in interpolation", () => {
    const { stdout } = execGPJ(`
      let x = 3;
      let y = 4;
      console.log(f"{x} + {y} = {x + y}");
    `);
    assert.equal(stdout, "3 + 4 = 7\n");
  });

  it("multiple interpolations", () => {
    const { stdout } = execGPJ(`
      let first = "Alice";
      let last = "Smith";
      console.log(f"Name: {first} {last}");
    `);
    assert.equal(stdout, "Name: Alice Smith\n");
  });

  it("plain f-string with no interpolation", () => {
    const { stdout } = execGPJ(`console.log(f"no braces here");`);
    assert.equal(stdout, "no braces here\n");
  });

  it("literal braces via doubling", () => {
    const { stdout } = execGPJ(`console.log(f"set = {{1, 2, 3}}");`);
    assert.equal(stdout, "set = {1, 2, 3}\n");
  });

  it("member access in interpolation", () => {
    const { stdout } = execGPJ(`
      let items = [10, 20, 30];
      console.log(f"count: {items.length}");
    `);
    assert.equal(stdout, "count: 3\n");
  });

  it("method call in interpolation", () => {
    const { stdout } = execGPJ(`
      let pi = 3.14159265;
      console.log(f"pi = {pi.toFixed(2)}");
    `);
    assert.equal(stdout, "pi = 3.14\n");
  });

  it("boolean value interpolation", () => {
    const { stdout } = execGPJ(`
      let ok = true;
      console.log(f"ok = {ok}");
    `);
    assert.equal(stdout, "ok = true\n");
  });

  it("None value interpolation", () => {
    const { stdout } = execGPJ(`
      let x = None;
      console.log(f"x = {x}");
    `);
    assert.equal(stdout, "x = null\n");
  });

  it("f-string assigned to variable", () => {
    const { stdout } = execGPJ(`
      let n = 5;
      let msg = f"n is {n}";
      console.log(msg);
    `);
    assert.equal(stdout, "n is 5\n");
  });

  it("comparison expression in interpolation", () => {
    const { stdout } = execGPJ(`
      let a = 10;
      let b = 3;
      console.log(f"a > b: {a > b}");
    `);
    assert.equal(stdout, "a > b: true\n");
  });

  it("function call in interpolation", () => {
    const { stdout } = execGPJ(`
      function square(n: Number): Number { return n * n; }
      console.log(f"4 squared = {square(4)}");
    `);
    assert.equal(stdout, "4 squared = 16\n");
  });
});
