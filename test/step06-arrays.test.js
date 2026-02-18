import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 6 — arrays and for...of", () => {
  // --- array literals ---

  it("empty array literal", () => {
    const { stdout } = execGPJ("console.log([]);");
    assert.equal(stdout, "[]\n");
  });

  it("array of numbers", () => {
    const { stdout } = execGPJ("let a = [1, 2, 3]; console.log(a);");
    assert.equal(stdout, "[ 1, 2, 3 ]\n");
  });

  it("array of strings", () => {
    const { stdout } = execGPJ('let a = ["x", "y"]; console.log(a);');
    assert.equal(stdout, "[ 'x', 'y' ]\n");
  });

  it("array of booleans", () => {
    const { stdout } = execGPJ("let a = [true, false]; console.log(a);");
    assert.equal(stdout, "[ true, false ]\n");
  });

  it("nested array", () => {
    const { stdout } = execGPJ("let a = [1, [2, 3]]; console.log(a);");
    assert.equal(stdout, "[ 1, [ 2, 3 ] ]\n");
  });

  it("array with type annotation is accepted", () => {
    const { stdout } = execGPJ("let a: Array<Number> = [1, 2, 3]; console.log(a);");
    assert.equal(stdout, "[ 1, 2, 3 ]\n");
  });

  // --- bracket indexing ---

  it("bracket index reads element", () => {
    const { stdout } = execGPJ("let a = [10, 20, 30]; console.log(a[0]);");
    assert.equal(stdout, "10\n");
  });

  it("bracket index with variable", () => {
    const { stdout } = execGPJ("let a = [10, 20, 30]; let i = 1; console.log(a[i]);");
    assert.equal(stdout, "20\n");
  });

  it("bracket index with expression", () => {
    const { stdout } = execGPJ("let a = [10, 20, 30]; console.log(a[1 + 1]);");
    assert.equal(stdout, "30\n");
  });

  it("nested bracket indexing", () => {
    const { stdout } = execGPJ("let a = [[1, 2], [3, 4]]; console.log(a[1][0]);");
    assert.equal(stdout, "3\n");
  });

  it("bracket index assignment on let-bound array", () => {
    const { stdout } = execGPJ("let a = [1, 2, 3]; a[0] = 99; console.log(a[0]);");
    assert.equal(stdout, "99\n");
  });

  // --- val freeze ---

  it("val array is frozen — assignment to element throws", () => {
    const { stderr, exitCode } = execGPJ("val a = [1, 2, 3]; a[0] = 99;");
    assert.notEqual(exitCode, 0);
    assert.ok(stderr.includes("TypeError"), "expected TypeError for frozen array mutation");
  });

  it("val array is frozen — push throws", () => {
    const { stderr, exitCode } = execGPJ("val a = [1, 2, 3]; a.push(4);");
    assert.notEqual(exitCode, 0);
    assert.ok(stderr.includes("TypeError"), "expected TypeError for frozen array push");
  });

  // --- for...of over arrays ---

  it("for...of iterates array elements", () => {
    const { stdout } = execGPJ("for (let x of [10, 20, 30]) { console.log(x); }");
    assert.equal(stdout, "10\n20\n30\n");
  });

  it("for...of with val binding", () => {
    const { stdout } = execGPJ("for (val x of [1, 2]) { console.log(x); }");
    assert.equal(stdout, "1\n2\n");
  });

  it("for...of over empty array — no iterations", () => {
    const { stdout } = execGPJ("for (let x of []) { console.log(x); }");
    assert.equal(stdout, "");
  });

  it("for...of over array stored in variable", () => {
    const src = `
      let items = [4, 5, 6];
      for (let x of items) { console.log(x); }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "4\n5\n6\n");
  });

  it("for...of with break", () => {
    const src = `
      for (let x of [1, 2, 3, 4, 5]) {
        if (x == 3) { break; }
        console.log(x);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n2\n");
  });

  it("for...of with continue", () => {
    const src = `
      for (let x of [1, 2, 3, 4, 5]) {
        if (x == 3) { continue; }
        console.log(x);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n2\n4\n5\n");
  });

  it("nested for...of", () => {
    const src = `
      let rows = [[1, 2], [3, 4]];
      for (let row of rows) {
        for (let n of row) {
          console.log(n);
        }
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n2\n3\n4\n");
  });

  it("for...of accumulator pattern", () => {
    const src = `
      let sum = 0;
      for (let n of [1, 2, 3, 4]) {
        sum = sum + n;
      }
      console.log(sum);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "10\n");
  });

  // --- for...of over strings ---

  it("for...of iterates string characters", () => {
    const { stdout } = execGPJ('for (let ch of "abc") { console.log(ch); }');
    assert.equal(stdout, "a\nb\nc\n");
  });

  it("for...of over empty string — no iterations", () => {
    const { stdout } = execGPJ('for (let ch of "") { console.log(ch); }');
    assert.equal(stdout, "");
  });

  it("for...of over string variable", () => {
    const src = `
      let word = "hello";
      for (let ch of word) { console.log(ch); }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "h\ne\nl\nl\no\n");
  });

  // --- array length ---

  it("array .length property", () => {
    const { stdout } = execGPJ("let a = [1, 2, 3]; console.log(a.length);");
    assert.equal(stdout, "3\n");
  });

  it("empty array .length is 0", () => {
    const { stdout } = execGPJ("let a = []; console.log(a.length);");
    assert.equal(stdout, "0\n");
  });

  // --- codegen checks ---

  it("array literal emits JS array syntax", () => {
    const { js } = runGPJ("let a = [1, 2, 3];");
    assert.ok(js.includes("[1, 2, 3]"), "expected JS array literal");
  });

  it("val array emits Object.freeze", () => {
    const { js } = runGPJ("val a = [1, 2, 3];");
    assert.ok(js.includes("Object.freeze"), "expected Object.freeze for val array");
  });

  it("for...of emits JS for...of", () => {
    const { js } = runGPJ("for (let x of [1, 2]) { console.log(x); }");
    assert.ok(js.includes("for"), "expected 'for' keyword");
    assert.ok(js.includes("of"), "expected 'of' keyword");
  });

  it("bracket index emits JS bracket access", () => {
    const { js } = runGPJ("let a = [1, 2]; console.log(a[0]);");
    assert.ok(js.includes("a[0]"), "expected bracket access in output");
  });

  // --- closures in for...of capture per-iteration bindings ---

  it("closures in for...of capture per-iteration value", () => {
    const src = `
      let fns = [];
      for (let i of [0, 1, 2]) {
        fns.push(() => i);
      }
      for (let f of fns) { console.log(f()); }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "0\n1\n2\n");
  });
});
