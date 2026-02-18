import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 20 — ternary operator and typeof", () => {
  // --- ternary ---

  it("true branch", () => {
    const { stdout } = execGPJ('console.log(true ? "yes" : "no");');
    assert.equal(stdout, "yes\n");
  });

  it("false branch", () => {
    const { stdout } = execGPJ('console.log(false ? "yes" : "no");');
    assert.equal(stdout, "no\n");
  });

  it("condition with expression", () => {
    const src = `let x = 5; console.log((x > 3) ? "big" : "small");`;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "big\n");
  });

  it("nested ternary", () => {
    const src = `let x = 5; console.log((x > 10) ? "big" : ((x > 3) ? "med" : "small"));`;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "med\n");
  });

  it("ternary result assigned to variable", () => {
    const src = `let b = (true ? 10 : 20); console.log(b);`;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "10\n");
  });

  it("ternary with arithmetic in branches", () => {
    const src = `let x = 3; console.log((x == 3) ? (x + 1) : (x - 1));`;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "4\n");
  });

  it("ternary codegen emits ? and :", () => {
    const { js } = runGPJ('true ? "a" : "b";');
    assert.ok(js.includes("?"), "expected ? in output JS");
    assert.ok(js.includes(":"), "expected : in output JS");
  });

  // --- typeof ---

  it("typeof Number", () => {
    const { stdout } = execGPJ("console.log(typeof 42);");
    assert.equal(stdout, "Number\n");
  });

  it("typeof String", () => {
    const { stdout } = execGPJ('console.log(typeof "hi");');
    assert.equal(stdout, "String\n");
  });

  it("typeof Boolean", () => {
    const { stdout } = execGPJ("console.log(typeof true);");
    assert.equal(stdout, "Boolean\n");
  });

  it("typeof None", () => {
    const { stdout } = execGPJ("console.log(typeof None);");
    assert.equal(stdout, "None\n");
  });

  it("typeof Array", () => {
    const { stdout } = execGPJ("console.log(typeof [1, 2, 3]);");
    assert.equal(stdout, "Array\n");
  });

  it("typeof Object", () => {
    const { stdout } = execGPJ("console.log(typeof {x: 1});");
    assert.equal(stdout, "Object\n");
  });

  it("typeof Function", () => {
    const src = `let f = (x) => x; console.log(typeof f);`;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "Function\n");
  });

  it("typeof in condition (type narrowing precursor)", () => {
    const src = `
      let x = 42;
      if (typeof x == "Number") { console.log("yes"); } else { console.log("no"); }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "yes\n");
  });

  it("typeof wrong type in condition", () => {
    const src = `
      let x = "hello";
      if (typeof x == "Number") { console.log("number"); } else { console.log("not number"); }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "not number\n");
  });

  it("typeof codegen emits __gpj_typeof", () => {
    const { js } = runGPJ("typeof 42;");
    assert.ok(js.includes("__gpj_typeof"), `expected __gpj_typeof in: ${js}`);
  });
});
