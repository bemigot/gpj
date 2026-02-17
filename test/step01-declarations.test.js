"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { runGPJ, execGPJ } = require("./helpers");

describe("step 1 — let/val declarations", () => {
  it("let with number", () => {
    const { stdout } = execGPJ("let x = 42;\nconsole.log(x);");
    assert.equal(stdout, "42\n");
  });

  it("val with string", () => {
    const { stdout } = execGPJ('val y = "hello";\nconsole.log(y);');
    assert.equal(stdout, "hello\n");
  });

  it("let with None", () => {
    const { stdout } = execGPJ("let a = None;\nconsole.log(a);");
    assert.equal(stdout, "null\n");
  });

  it("val with boolean", () => {
    const { stdout } = execGPJ("val b = true;\nconsole.log(b);");
    assert.equal(stdout, "true\n");
  });

  it("let with float", () => {
    const { stdout } = execGPJ("let n = 3.14;\nconsole.log(n);");
    assert.equal(stdout, "3.14\n");
  });

  it("val with primitive does not freeze", () => {
    const { js } = runGPJ("val n = 42;");
    assert.ok(!js.includes("Object.freeze"), "primitives should not be frozen");
    assert.ok(js.includes("const n = 42;"));
  });

  it("val with array emits Object.freeze", () => {
    const { js } = runGPJ("val arr = [1, 2, 3];");
    assert.ok(js.includes("Object.freeze"), "arrays should be frozen");
  });

  it("val with object emits Object.freeze", () => {
    const { js } = runGPJ('val obj = { x: 1, y: "hi" };');
    assert.ok(js.includes("Object.freeze"), "objects should be frozen");
  });

  it("type annotation is accepted", () => {
    const { stdout } = execGPJ("let x: Number = 42;\nconsole.log(x);");
    assert.equal(stdout, "42\n");
  });
});
