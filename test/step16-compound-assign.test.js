import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 16 — compound assignment (+=, -=, *=, /=, %=, **=)", () => {
  // --- += ---

  it("+= with numbers", () => {
    const src = `
      let x = 10;
      x += 5;
      console.log(x);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "15\n");
  });

  it("+= with strings", () => {
    const src = `
      let s = "hello";
      s += " world";
      console.log(s);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "hello world\n");
  });

  it("+= type mismatch throws", () => {
    const { exitCode, stderr } = execGPJ('let x = 1; x += "a";');
    assert.notEqual(exitCode, 0);
    assert.ok(stderr.includes("TypeError"), stderr);
  });

  // --- -= ---

  it("-= with numbers", () => {
    const src = `
      let x = 10;
      x -= 3;
      console.log(x);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "7\n");
  });

  // --- *= ---

  it("*= with numbers", () => {
    const src = `
      let x = 4;
      x *= 3;
      console.log(x);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "12\n");
  });

  // --- /= ---

  it("/= with numbers", () => {
    const src = `
      let x = 15;
      x /= 4;
      console.log(x);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "3.75\n");
  });

  // --- %= ---

  it("%= with numbers", () => {
    const src = `
      let x = 10;
      x %= 3;
      console.log(x);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n");
  });

  // --- **= ---

  it("**= with numbers", () => {
    const src = `
      let x = 2;
      x **= 10;
      console.log(x);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1024\n");
  });

  // --- arithmetic compound on non-number throws ---

  it("-= on string throws", () => {
    const { exitCode, stderr } = execGPJ('let x = "hi"; x -= 1;');
    assert.notEqual(exitCode, 0);
    assert.ok(stderr.includes("TypeError"), stderr);
  });

  // --- chained usage ---

  it("compound assignment in loop", () => {
    const src = `
      let sum = 0;
      for (let i of [1, 2, 3, 4, 5]) {
        sum += i;
      }
      console.log(sum);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "15\n");
  });

  // --- on object properties ---

  it("+= on object property", () => {
    const src = `
      let obj = {count: 0};
      obj.count += 5;
      console.log(obj.count);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "5\n");
  });

  // --- on array elements ---

  it("+= on array element", () => {
    const src = `
      let arr = [10, 20, 30];
      arr[1] += 5;
      console.log(arr[1]);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "25\n");
  });

  // --- codegen checks ---

  it("+= emits __gpj_add", () => {
    const { js } = runGPJ("let x = 1; x += 2;");
    assert.ok(js.includes("__gpj_add"), js);
  });

  it("-= emits __gpj_arith", () => {
    const { js } = runGPJ("let x = 1; x -= 2;");
    assert.ok(js.includes("__gpj_arith"), js);
  });

  it("**= emits __gpj_arith with **", () => {
    const { js } = runGPJ("let x = 2; x **= 3;");
    assert.ok(js.includes('__gpj_arith("**"'), js);
  });
});
