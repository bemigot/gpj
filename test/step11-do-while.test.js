"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { runGPJ, execGPJ } = require("./helpers");

describe("step 11 — do...while", () => {
  it("executes body at least once", () => {
    const src = `
      do {
        console.log("once");
      } while (false);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "once\n");
  });

  it("loops while condition is true", () => {
    const src = `
      let i = 0;
      do {
        console.log(i);
        i = i + 1;
      } while (i < 3);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "0\n1\n2\n");
  });

  it("body runs before condition is checked", () => {
    const src = `
      let x = 10;
      do {
        console.log(x);
        x = x + 1;
      } while (x < 5);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "10\n");
  });

  it("break exits do...while", () => {
    const src = `
      let i = 0;
      do {
        if (i == 2) { break; }
        console.log(i);
        i = i + 1;
      } while (true);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "0\n1\n");
  });

  it("continue skips to condition", () => {
    const src = `
      let i = 0;
      do {
        i = i + 1;
        if (i == 2) { continue; }
        console.log(i);
      } while (i < 4);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n3\n4\n");
  });

  it("nested do...while", () => {
    const src = `
      let i = 0;
      do {
        let j = 0;
        do {
          console.log(i, j);
          j = j + 1;
        } while (j < 2);
        i = i + 1;
      } while (i < 2);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "0 0\n0 1\n1 0\n1 1\n");
  });

  it("codegen emits do...while", () => {
    const { js } = runGPJ("do { console.log(1); } while (false);");
    assert.ok(js.includes("do"), js);
    assert.ok(js.includes("while"), js);
  });
});
