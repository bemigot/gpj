"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { runGPJ, execGPJ } = require("./helpers");

describe("step 10 — error handling (try/catch/finally, throw)", () => {
  // --- throw ---

  it("throw object with message", () => {
    const { stderr, exitCode } = execGPJ('throw {message: "boom"};');
    assert.notEqual(exitCode, 0);
  });

  it("throw is catchable", () => {
    const src = `
      try {
        throw {message: "oops"};
      } catch (e) {
        console.log(e.message);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "oops\n");
  });

  it("throw object with extra properties", () => {
    const src = `
      try {
        throw {message: "not found", code: 404};
      } catch (e) {
        console.log(e.message);
        console.log(e.code);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "not found\n404\n");
  });

  // --- try/catch ---

  it("catch runs on error", () => {
    const src = `
      try {
        let x = 1 + "a";
      } catch (e) {
        console.log("caught");
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "caught\n");
  });

  it("catch does not run when no error", () => {
    const src = `
      try {
        console.log("ok");
      } catch (e) {
        console.log("caught");
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "ok\n");
  });

  it("catch binds error to parameter", () => {
    const src = `
      try {
        throw {message: "test error"};
      } catch (err) {
        console.log(err.message);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "test error\n");
  });

  // --- try/finally ---

  it("finally runs after try (no error)", () => {
    const src = `
      try {
        console.log("try");
      } finally {
        console.log("finally");
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "try\nfinally\n");
  });

  it("finally runs after error", () => {
    const src = `
      try {
        throw {message: "boom"};
      } catch (e) {
        console.log("catch");
      } finally {
        console.log("finally");
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "catch\nfinally\n");
  });

  it("finally runs even when error is uncaught", () => {
    const src = `
      try {
        try {
          throw {message: "inner"};
        } finally {
          console.log("finally ran");
        }
      } catch (e) {
        console.log(e.message);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "finally ran\ninner\n");
  });

  // --- try without catch or finally ---

  it("try without catch or finally is a parse error", () => {
    assert.throws(() => runGPJ("try { console.log(1); }"), /catch|finally/i);
  });

  // --- nested try/catch ---

  it("nested try/catch — inner catches", () => {
    const src = `
      try {
        try {
          throw {message: "inner"};
        } catch (e) {
          console.log("inner: " + e.message);
        }
        console.log("outer ok");
      } catch (e) {
        console.log("outer: " + e.message);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "inner: inner\nouter ok\n");
  });

  it("nested try/catch — inner rethrows to outer", () => {
    const src = `
      try {
        try {
          throw {message: "deep"};
        } catch (e) {
          throw {message: "rethrown: " + e.message};
        }
      } catch (e) {
        console.log(e.message);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "rethrown: deep\n");
  });

  // --- catch with type annotation (skipped for now) ---

  it("catch with type annotation parses (annotation skipped)", () => {
    const src = `
      try {
        throw {message: "err", code: 404};
      } catch (e: HttpError) {
        console.log(e.message);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "err\n");
  });

  // --- code after try/catch continues ---

  it("execution continues after try/catch", () => {
    const src = `
      try {
        throw {message: "fail"};
      } catch (e) {
        console.log("caught");
      }
      console.log("after");
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "caught\nafter\n");
  });

  // --- try/catch in function ---

  it("try/catch inside function with return", () => {
    const src = `
      function safeDivide(a, b) {
        try {
          if (b == 0) {
            throw {message: "division by zero"};
          }
          return a / b;
        } catch (e) {
          return None;
        }
      }
      console.log(safeDivide(10, 2));
      console.log(safeDivide(10, 0));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "5\nnull\n");
  });

  // --- codegen checks ---

  it("throw emits JS throw", () => {
    const { js } = runGPJ('throw {message: "err"};');
    assert.ok(js.includes("throw"), js);
  });

  it("try/catch emits JS try/catch", () => {
    const { js } = runGPJ(`
      try { console.log(1); } catch (e) { console.log(2); }
    `);
    assert.ok(js.includes("try"), js);
    assert.ok(js.includes("catch"), js);
  });

  it("finally emits JS finally", () => {
    const { js } = runGPJ(`
      try { console.log(1); } finally { console.log(2); }
    `);
    assert.ok(js.includes("finally"), js);
  });
});
