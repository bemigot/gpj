"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { lex } = require("../src/lexer");
const { parse } = require("../src/parser");
const { execGPJ } = require("./helpers");

describe("step 3 — if/else, while, for...of, break, continue", () => {
  // --- if / else ---

  it("if (true) branch executes", () => {
    const { stdout } = execGPJ('if (true) { console.log("yes"); }');
    assert.equal(stdout, "yes\n");
  });

  it("if (false) branch skipped, no output", () => {
    const { stdout } = execGPJ('if (false) { console.log("nope"); }');
    assert.equal(stdout, "");
  });

  it("if/else — else branch", () => {
    const { stdout } = execGPJ('if (false) { console.log("a"); } else { console.log("b"); }');
    assert.equal(stdout, "b\n");
  });

  it("if / else if / else — middle branch", () => {
    const src = `
      let x = 5;
      if (x > 10) { console.log("big"); }
      else if (x > 3) { console.log("med"); }
      else { console.log("small"); }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "med\n");
  });

  it("if / else if / else — last branch", () => {
    const src = `
      let x = 1;
      if (x > 10) { console.log("big"); }
      else if (x > 3) { console.log("med"); }
      else { console.log("small"); }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "small\n");
  });

  it("nested if", () => {
    const src = `
      let x = 5;
      if (x > 0) {
        if (x < 10) { console.log("single digit"); }
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "single digit\n");
  });

  // --- while ---

  it("while loop counts 0..2", () => {
    const src = `
      let i = 0;
      while (i < 3) {
        console.log(i);
        i = i + 1;
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "0\n1\n2\n");
  });

  it("while (false) body never runs", () => {
    const { stdout } = execGPJ('while (false) { console.log("nope"); }');
    assert.equal(stdout, "");
  });

  it("nested while loops", () => {
    const src = `
      let sum = 0;
      let i = 1;
      while (i < 4) {
        let j = 1;
        while (j < 4) {
          sum = sum + (i * j);
          j = j + 1;
        }
        i = i + 1;
      }
      console.log(sum);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "36\n");
  });

  // --- for...of ---

  it("for...of iterates array", () => {
    const { stdout } = execGPJ("for (let x of [1, 2, 3]) { console.log(x); }");
    assert.equal(stdout, "1\n2\n3\n");
  });

  it("for...of with val binding", () => {
    const { stdout } = execGPJ("for (val x of [10, 20]) { console.log(x); }");
    assert.equal(stdout, "10\n20\n");
  });

  it("for...of over empty array — no output", () => {
    const { stdout } = execGPJ("for (let x of []) { console.log(x); }");
    assert.equal(stdout, "");
  });

  // --- break ---

  it("break exits while loop early", () => {
    const src = `
      let i = 0;
      while (true) {
        if (i == 3) { break; }
        console.log(i);
        i = i + 1;
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "0\n1\n2\n");
  });

  it("break exits for...of loop early", () => {
    const src = `
      for (let x of [1, 2, 3, 4, 5]) {
        if (x == 3) { break; }
        console.log(x);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n2\n");
  });

  // --- continue ---

  it("continue skips iteration in while", () => {
    const src = `
      let i = 0;
      while (i < 5) {
        i = i + 1;
        if (i == 3) { continue; }
        console.log(i);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n2\n4\n5\n");
  });

  it("continue skips iteration in for...of", () => {
    const src = `
      for (let x of [1, 2, 3, 4, 5]) {
        if (x == 3) { continue; }
        console.log(x);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n2\n4\n5\n");
  });

  // --- combined control flow ---

  it("while + if + break: find first even", () => {
    const src = `
      let i = 1;
      while (i < 10) {
        if ((i % 2) == 0) {
          console.log(i);
          break;
        }
        i = i + 1;
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "2\n");
  });

  it("for...of + if: filter and collect", () => {
    const src = `
      for (let x of [1, 2, 3, 4, 5, 6]) {
        if ((x % 2) == 0) { console.log(x); }
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "2\n4\n6\n");
  });

  // --- codegen checks ---

  it("while emits while keyword", () => {
    const { runGPJ } = require("./helpers");
    const { js } = runGPJ("let i = 0; while (i < 3) { i = i + 1; }");
    assert.ok(js.includes("while"), "expected 'while' in output JS");
  });

  it("for...of emits for...of", () => {
    const { runGPJ } = require("./helpers");
    const { js } = runGPJ("for (let x of [1, 2]) { console.log(x); }");
    assert.ok(js.includes("for"), "expected 'for' in output JS");
    assert.ok(js.includes("of"), "expected 'of' in output JS");
  });
});
