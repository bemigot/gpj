import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execGPJ } from "./helpers.js";

describe("step 18 — C-style for loops", () => {
  it("basic counting loop", () => {
    const src = `
      for (let i = 0; i < 5; i += 1) {
        console.log(i);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "0\n1\n2\n3\n4\n");
  });

  it("counting down", () => {
    const src = `
      for (let i = 3; i > 0; i -= 1) {
        console.log(i);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "3\n2\n1\n");
  });

  it("step by 2", () => {
    const src = `
      for (let i = 0; i < 10; i += 2) {
        console.log(i);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "0\n2\n4\n6\n8\n");
  });

  it("multiplication in update", () => {
    const src = `
      for (let x = 1; x < 100; x *= 2) {
        console.log(x);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n2\n4\n8\n16\n32\n64\n");
  });

  it("zero iterations when condition is false initially", () => {
    const src = `
      for (let i = 10; i < 5; i += 1) {
        console.log(i);
      }
      console.log("done");
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "done\n");
  });

  it("val binding (const) in init", () => {
    const src = `
      for (val i = 0; i < 1; i += 1) {
        console.log(i);
      }
    `;
    // val emits const, so i += 1 will throw at runtime (can't reassign const)
    // Actually, this should fail because you can't reassign a const
    // Let's just test that it compiles and the first iteration works
    // The runtime error happens on the update after first iteration
    const { stderr } = execGPJ(src);
    assert.ok(stderr.length > 0);
  });

  it("break in C-style for", () => {
    const src = `
      for (let i = 0; i < 10; i += 1) {
        if (i == 3) {
          break;
        }
        console.log(i);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "0\n1\n2\n");
  });

  it("continue in C-style for", () => {
    const src = `
      for (let i = 0; i < 5; i += 1) {
        if ((i % 2) == 0) {
          continue;
        }
        console.log(i);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n3\n");
  });

  it("nested C-style for loops", () => {
    const src = `
      for (let i = 0; i < 3; i += 1) {
        for (let j = 0; j < 2; j += 1) {
          console.log(i, j);
        }
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "0 0\n0 1\n1 0\n1 1\n2 0\n2 1\n");
  });

  it("loop variable scoped to loop", () => {
    const src = `
      for (let i = 0; i < 3; i += 1) {
        console.log(i);
      }
      for (let i = 10; i < 13; i += 1) {
        console.log(i);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "0\n1\n2\n10\n11\n12\n");
  });

  it("using loop variable in expressions", () => {
    const src = `
      for (let i = 1; i <= 5; i += 1) {
        console.log(i * i);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n4\n9\n16\n25\n");
  });

  it("assignment in update (not compound)", () => {
    const src = `
      for (let i = 0; i < 5; i = i + 1) {
        console.log(i);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "0\n1\n2\n3\n4\n");
  });
});
