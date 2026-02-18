import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 13 — spread and rest", () => {
  // --- spread in array literals ---

  it("spread in array literal", () => {
    const src = `
      let a = [1, 2, 3];
      let b = [0, ...a, 4];
      console.log(b.length);
      for (let x of b) { console.log(x); }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "5\n0\n1\n2\n3\n4\n");
  });

  it("spread empty array", () => {
    const src = `
      let a = [];
      let b = [1, ...a, 2];
      console.log(b.length);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "2\n");
  });

  it("multiple spreads in array", () => {
    const src = `
      let a = [1, 2];
      let b = [3, 4];
      let c = [...a, ...b];
      for (let x of c) { console.log(x); }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n2\n3\n4\n");
  });

  it("spread string in array", () => {
    const src = `
      let chars = [..."abc"];
      for (let c of chars) { console.log(c); }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "a\nb\nc\n");
  });

  // --- spread in object literals ---

  it("spread in object literal", () => {
    const src = `
      let base = {x: 1, y: 2};
      let ext = {...base, z: 3};
      console.log(ext.x);
      console.log(ext.y);
      console.log(ext.z);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n2\n3\n");
  });

  it("spread object override", () => {
    const src = `
      let base = {x: 1, y: 2};
      let ext = {...base, x: 10};
      console.log(ext.x);
      console.log(ext.y);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "10\n2\n");
  });

  it("multiple object spreads", () => {
    const src = `
      let a = {x: 1};
      let b = {y: 2};
      let c = {...a, ...b, z: 3};
      console.log(c.x, c.y, c.z);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 2 3\n");
  });

  it("spread empty object", () => {
    const src = `
      let a = {};
      let b = {...a, x: 1};
      console.log(b.x);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n");
  });

  // --- spread in function calls ---

  it("spread in function call", () => {
    const src = `
      let args = [1, 2, 3];
      console.log(...args);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 2 3\n");
  });

  it("spread with other args in call", () => {
    const src = `
      function add3(a, b, c) { return a + b + c; }
      let nums = [2, 3];
      console.log(add3(1, ...nums));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "6\n");
  });

  // --- rest parameters ---

  it("rest parameter collects arguments", () => {
    const src = `
      function sum(...nums) {
        let total = 0;
        for (let n of nums) { total = total + n; }
        return total;
      }
      console.log(sum(1, 2, 3));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "6\n");
  });

  it("rest parameter with leading params", () => {
    const src = `
      function first(a, ...rest) {
        console.log(a);
        console.log(rest.length);
      }
      first(1, 2, 3, 4);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n3\n");
  });

  it("rest parameter is empty when no extra args", () => {
    const src = `
      function f(a, ...rest) {
        console.log(rest.length);
      }
      f(1);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "0\n");
  });

  it("rest parameter with type annotation", () => {
    const src = `
      function sum(...nums: Array<Number>) {
        let total = 0;
        for (let n of nums) { total = total + n; }
        return total;
      }
      console.log(sum(10, 20));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "30\n");
  });

  it("rest in arrow function", () => {
    const src = `
      let sum = (...nums) => {
        let total = 0;
        for (let n of nums) { total = total + n; }
        return total;
      };
      console.log(sum(5, 10, 15));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "30\n");
  });

  // --- spread + rest together ---

  it("spread into rest parameter", () => {
    const src = `
      function sum(...nums) {
        let total = 0;
        for (let n of nums) { total = total + n; }
        return total;
      }
      let args = [1, 2, 3, 4];
      console.log(sum(...args));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "10\n");
  });

  // --- codegen checks ---

  it("spread in array emits ...", () => {
    const { js } = runGPJ("let b = [1, ...a];");
    assert.ok(js.includes("...a"), js);
  });

  it("spread in object emits ...", () => {
    const { js } = runGPJ("let b = {...a, x: 1};");
    assert.ok(js.includes("...a"), js);
  });

  it("rest param emits ...", () => {
    const { js } = runGPJ("function f(...args) { return args; }");
    assert.ok(js.includes("...args"), js);
  });

  it("spread in call emits ...", () => {
    const { js } = runGPJ("f(...args);");
    assert.ok(js.includes("...args"), js);
  });
});
