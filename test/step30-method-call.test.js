import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

// Helper source: object with a known function-typed property.
// The annotation tells the typechecker that `method` is a FunctionType.
const OBJ_SRC = `let obj: {method: () => Number} = {method: function() { return 42; }};`;

describe("step 30 — method-call enforcement", () => {
  // --- FunctionType annotation parsing ---

  it("FunctionType in object annotation parses without error", () => {
    const { js } = runGPJ(`let obj: {method: () => Number} = {method: function() { return 1; }};`);
    assert.ok(typeof js === "string");
  });

  it("FunctionType with return type parses", () => {
    const { js } = runGPJ(`let f: () => String = function() { return "hi"; };`);
    assert.ok(typeof js === "string");
  });

  it("FunctionType with params parses", () => {
    const { js } = runGPJ(`let f: (Number, String) => Boolean = function() { return true; };`);
    assert.ok(typeof js === "string");
  });

  // --- OK cases ---

  it("method in call position — no error", () => {
    const { js } = runGPJ(`
${OBJ_SRC}
obj.method();
`);
    assert.ok(typeof js === "string");
  });

  it("method call at runtime produces correct output", () => {
    const { stdout } = execGPJ(`
${OBJ_SRC}
console.log(obj.method());
`);
    assert.equal(stdout, "42\n");
  });

  it("non-function property access — no error", () => {
    const { js } = runGPJ(`
let obj: {x: Number} = {x: 99};
let v = obj.x;
`);
    assert.ok(typeof js === "string");
  });

  it("method inside closure (arrow expression body) — no error", () => {
    const { js } = runGPJ(`
${OBJ_SRC}
let fn = () => obj.method();
`);
    assert.ok(typeof js === "string");
  });

  it("method inside closure (arrow expression body) — correct runtime output", () => {
    const { stdout } = execGPJ(`
${OBJ_SRC}
let fn = () => obj.method();
console.log(fn());
`);
    assert.equal(stdout, "42\n");
  });

  it("method inside function body — no error", () => {
    const { js } = runGPJ(`
${OBJ_SRC}
function callIt() {
  return obj.method();
}
`);
    assert.ok(typeof js === "string");
  });

  it("return value of method call stored in variable — no error", () => {
    const { js } = runGPJ(`
${OBJ_SRC}
let result = obj.method();
`);
    assert.ok(typeof js === "string");
  });

  it("chained call obj.method().toString() — no error", () => {
    const { js } = runGPJ(`
${OBJ_SRC}
let s = obj.method().toString();
`);
    assert.ok(typeof js === "string");
  });

  it("non-annotated object — no false positive on method access", () => {
    // Without annotation the typechecker cannot determine property type, so no error.
    const { js } = runGPJ(`
let obj = {method: function() { return 1; }};
let fn = obj.method;
`);
    assert.ok(typeof js === "string");
  });

  // --- Error cases ---

  it("method access in var decl without call — TypeCheckError", () => {
    assert.throws(
      () => runGPJ(`
${OBJ_SRC}
let fn = obj.method;
`),
      (e) => e.message.includes("method")
    );
  });

  it("method passed as function argument — TypeCheckError", () => {
    assert.throws(
      () => runGPJ(`
${OBJ_SRC}
function take(f: () => Number) { return f(); }
take(obj.method);
`),
      (e) => e.message.includes("method")
    );
  });

  it("method in return statement without call — TypeCheckError", () => {
    assert.throws(
      () => runGPJ(`
${OBJ_SRC}
function bad(): () => Number {
  return obj.method;
}
`),
      (e) => e.message.includes("method")
    );
  });

  it("method inside arrow expression body without call — TypeCheckError", () => {
    assert.throws(
      () => runGPJ(`
${OBJ_SRC}
let fn = () => obj.method;
`),
      (e) => e.message.includes("method")
    );
  });

  it("method inside array literal without call — TypeCheckError", () => {
    assert.throws(
      () => runGPJ(`
${OBJ_SRC}
let arr = [obj.method];
`),
      (e) => e.message.includes("method")
    );
  });

  it("error message mentions the property name", () => {
    assert.throws(
      () => runGPJ(`
let obj: {doThing: () => Number} = {doThing: function() { return 1; }};
let fn = obj.doThing;
`),
      (e) => e.message.includes("doThing")
    );
  });
});
