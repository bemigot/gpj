import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 31 — Unknown type and ?? nullability check", () => {
  // --- Unknown: annotation is valid for any initialiser ---

  it("Unknown annotation with Number init — parses without error", () => {
    const { js } = runGPJ(`let x: Unknown = 42;`);
    assert.ok(typeof js === "string");
  });

  it("Unknown annotation with String init — parses without error", () => {
    const { js } = runGPJ(`let x: Unknown = "hi";`);
    assert.ok(typeof js === "string");
  });

  it("Unknown annotation with None init — parses without error", () => {
    const { js } = runGPJ(`let x: Unknown = None;`);
    assert.ok(typeof js === "string");
  });

  it("Unknown annotation with Boolean init — parses without error", () => {
    const { js } = runGPJ(`let x: Unknown = true;`);
    assert.ok(typeof js === "string");
  });

  // --- Unknown: runtime value is preserved ---

  it("Unknown value passes through to JS correctly (Number)", () => {
    const { stdout } = execGPJ(`
let x: Unknown = 42;
if (typeof x == "Number") {
  console.log(x);
}
`);
    assert.equal(stdout, "42\n");
  });

  it("typeof on Unknown — no error and returns correct runtime string", () => {
    const { stdout } = execGPJ(`
let x: Unknown = "hello";
console.log(typeof x);
`);
    assert.equal(stdout, "String\n");
  });

  // --- Unknown: assigning to a specific type is a type error ---

  it("assigning Unknown to Number-annotated var — TypeCheckError", () => {
    assert.throws(
      () => runGPJ(`let x: Unknown = 42;\nlet y: Number = x;\n`),
      (e) => e.message.includes("Unknown")
    );
  });

  it("assigning Unknown to String-annotated var — TypeCheckError", () => {
    assert.throws(
      () => runGPJ(`let x: Unknown = "hi";\nlet y: String = x;\n`),
      (e) => e.message.includes("Unknown")
    );
  });

  // --- Unknown: binary operations are forbidden ---

  it("Unknown + Number — TypeCheckError", () => {
    assert.throws(
      () => runGPJ(`let x: Unknown = 42;\nx + 1;\n`),
      (e) => e.message.includes("Unknown")
    );
  });

  it("String + Unknown — TypeCheckError", () => {
    assert.throws(
      () => runGPJ(`let x: Unknown = "hi";\n"prefix" + x;\n`),
      (e) => e.message.includes("Unknown")
    );
  });

  it("Unknown == Unknown — TypeCheckError (must narrow first)", () => {
    assert.throws(
      () => runGPJ(`let x: Unknown = 42;\nlet y: Unknown = 42;\nx == y;\n`),
      (e) => e.message.includes("Unknown")
    );
  });

  // --- Unknown: unary operations are forbidden ---

  it("unary ! on Unknown — TypeCheckError", () => {
    assert.throws(
      () => runGPJ(`let x: Unknown = true;\n!x;\n`),
      (e) => e.message.includes("Unknown")
    );
  });

  it("unary - on Unknown — TypeCheckError", () => {
    assert.throws(
      () => runGPJ(`let x: Unknown = 42;\n-x;\n`),
      (e) => e.message.includes("Unknown")
    );
  });

  // --- Unknown: typeof is the allowed narrowing mechanism ---

  it("typeof on Unknown — no error", () => {
    const { js } = runGPJ(`let x: Unknown = 42;\ntypeof x;\n`);
    assert.ok(typeof js === "string");
  });

  it("Unknown narrowed to Number via typeof — binary op allowed", () => {
    const { js } = runGPJ(`
let x: Unknown = 42;
if (typeof x == "Number") {
  let y = x + 1;
}
`);
    assert.ok(typeof js === "string");
  });

  it("Unknown narrowed to Number — correct runtime value", () => {
    const { stdout } = execGPJ(`
let x: Unknown = 42;
if (typeof x == "Number") {
  console.log(x + 1);
}
`);
    assert.equal(stdout, "43\n");
  });

  it("Unknown narrowed via typeof switch — correct runtime value", () => {
    const { stdout } = execGPJ(`
let x: Unknown = "hi";
switch (typeof x) {
  case "String": console.log(x + "!");
}
`);
    assert.equal(stdout, "hi!\n");
  });

  // --- Unknown: outside narrowed branch — still Unknown ---

  it("Unknown in else branch (not narrowed) — still cannot operate", () => {
    assert.throws(
      () => runGPJ(`
let x: Unknown = 42;
if (typeof x == "Number") {
  let y = x + 1;
} else {
  let z = x + 1;
}
`),
      (e) => e.message.includes("Unknown")
    );
  });

  // --- ?? check: nullable left operand is OK ---

  it("?? with T? left — no error", () => {
    const { js } = runGPJ(`let x: Number? = None;\nlet y = x ?? 0;\n`);
    assert.ok(typeof js === "string");
  });

  it("?? with T | None left — no error", () => {
    const { js } = runGPJ(`let x: Number | None = None;\nlet y = x ?? 0;\n`);
    assert.ok(typeof js === "string");
  });

  it("?? runtime: None coalesces to fallback", () => {
    const { stdout } = execGPJ(`
let x: Number? = None;
let y = x ?? 42;
console.log(y);
`);
    assert.equal(stdout, "42\n");
  });

  it("?? runtime: non-None passes through", () => {
    const { stdout } = execGPJ(`
let x: Number? = 7;
let y = x ?? 42;
console.log(y);
`);
    assert.equal(stdout, "7\n");
  });

  it("?? with nullable function return type — no error", () => {
    const { js } = runGPJ(`
function maybe(): Number? { return None; }
let y = maybe() ?? 0;
`);
    assert.ok(typeof js === "string");
  });

  // --- ?? check: non-nullable left operand is a type error ---

  it("?? with Number left — TypeCheckError", () => {
    assert.throws(
      () => runGPJ(`let x: Number = 42;\nlet y = x ?? 0;\n`),
      (e) => e.message.includes("??")
    );
  });

  it("?? with String left — TypeCheckError", () => {
    assert.throws(
      () => runGPJ(`let x: String = "hi";\nlet y = x ?? "";\n`),
      (e) => e.message.includes("??")
    );
  });

  it("?? with Number | String left (no None) — TypeCheckError", () => {
    assert.throws(
      () => runGPJ(`let x: Number | String = 42;\nlet y = x ?? 0;\n`),
      (e) => e.message.includes("??")
    );
  });

  it("?? with non-nullable function return — TypeCheckError", () => {
    assert.throws(
      () => runGPJ(`
function getNum(): Number { return 42; }
let y = getNum() ?? 0;
`),
      (e) => e.message.includes("??")
    );
  });

  it("error message mentions '??' and the actual type", () => {
    assert.throws(
      () => runGPJ(`let x: Boolean = true;\nlet y = x ?? false;\n`),
      (e) => e.message.includes("??") && e.message.includes("Boolean")
    );
  });
});
