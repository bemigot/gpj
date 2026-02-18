import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 12 — switch/case", () => {
  it("matches a case", () => {
    const src = `
      let x = 2;
      switch (x) {
        case 1:
          console.log("one");
          break;
        case 2:
          console.log("two");
          break;
        case 3:
          console.log("three");
          break;
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "two\n");
  });

  it("default case", () => {
    const src = `
      let x = 99;
      switch (x) {
        case 1:
          console.log("one");
          break;
        default:
          console.log("other");
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "other\n");
  });

  it("fallthrough without break", () => {
    const src = `
      let x = 1;
      switch (x) {
        case 1:
          console.log("one");
        case 2:
          console.log("two");
          break;
        case 3:
          console.log("three");
          break;
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "one\ntwo\n");
  });

  it("switch on string", () => {
    const src = `
      let color = "red";
      switch (color) {
        case "red":
          console.log("R");
          break;
        case "green":
          console.log("G");
          break;
        case "blue":
          console.log("B");
          break;
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "R\n");
  });

  it("switch on boolean", () => {
    const src = `
      switch (true) {
        case true:
          console.log("yes");
          break;
        case false:
          console.log("no");
          break;
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "yes\n");
  });

  it("switch with None case", () => {
    const src = `
      let x = None;
      switch (x) {
        case None:
          console.log("none");
          break;
        default:
          console.log("other");
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "none\n");
  });

  it("no match and no default — no output", () => {
    const src = `
      let x = 5;
      switch (x) {
        case 1:
          console.log("one");
          break;
        case 2:
          console.log("two");
          break;
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "");
  });

  it("switch with expression discriminant", () => {
    const src = `
      switch (1 + 1) {
        case 2:
          console.log("two");
          break;
        default:
          console.log("other");
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "two\n");
  });

  it("switch inside function", () => {
    const src = `
      function describe(n) {
        switch (n) {
          case 0:
            return "zero";
          case 1:
            return "one";
          default:
            return "many";
        }
      }
      console.log(describe(0));
      console.log(describe(1));
      console.log(describe(42));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "zero\none\nmany\n");
  });

  it("multiple statements per case", () => {
    const src = `
      let x = 1;
      switch (x) {
        case 1:
          let a = "hello";
          console.log(a);
          console.log("world");
          break;
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "hello\nworld\n");
  });

  it("codegen emits switch/case", () => {
    const { js } = runGPJ(`
      switch (1) {
        case 1:
          console.log(1);
          break;
      }
    `);
    assert.ok(js.includes("switch"), js);
    assert.ok(js.includes("case"), js);
  });

  it("codegen emits default", () => {
    const { js } = runGPJ(`
      switch (1) {
        default:
          console.log(1);
      }
    `);
    assert.ok(js.includes("default"), js);
  });
});
