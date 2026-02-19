import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execGPJ, runGPJ } from "./helpers.js";

describe("step 34 — JSON.decycle / JSON.recycle", () => {
  // --- JSON.decycle ---

  it("decycle flat object returns equivalent value", () => {
    const { stdout } = execGPJ(`
let a = {x: 1, y: "hello"};
let d = JSON.decycle(a);
console.log(d.x);
console.log(d.y);
`);
    assert.equal(stdout, "1\nhello\n");
  });

  it("decycle does not mutate original — self still an object", () => {
    const { stdout } = execGPJ(`
let a = {x: 1};
a.self = a;
let d = JSON.decycle(a);
console.log(typeof a.self);
`);
    assert.equal(stdout, "Object\n");
  });

  it("decycle self-reference produces $ref pointing to root", () => {
    const { stdout } = execGPJ(`
let a = {x: 1};
a.self = a;
let d = JSON.decycle(a);
console.log(d.self["$ref"]);
`);
    assert.equal(stdout, "$\n");
  });

  it("decycle nested back-reference uses $ path", () => {
    const { stdout } = execGPJ(`
let a = {x: 1};
let b = {y: 2, parent: a};
a.child = b;
let d = JSON.decycle(a);
console.log(d.child.parent["$ref"]);
`);
    assert.equal(stdout, "$\n");
  });

  it("decycle non-circular nested object is fully copied", () => {
    const { stdout } = execGPJ(`
let a = {x: {y: {z: 42}}};
let d = JSON.decycle(a);
console.log(d.x.y.z);
`);
    assert.equal(stdout, "42\n");
  });

  it("decycle flat array returns equivalent value", () => {
    const { stdout } = execGPJ(`
let a = [10, 20, 30];
let d = JSON.decycle(a);
console.log(d[0]);
console.log(d[2]);
`);
    assert.equal(stdout, "10\n30\n");
  });

  // --- JSON.stringify integration ---

  it("stringify(decycle(circular)) does not throw", () => {
    const { stdout, exitCode } = execGPJ(`
let a = {x: 1};
a.self = a;
let s = JSON.stringify(JSON.decycle(a));
console.log(typeof s);
`);
    assert.equal(exitCode, 0);
    assert.equal(stdout, "String\n");
  });

  it("stringify on circular reference throws", () => {
    const { exitCode, stderr } = execGPJ(`
let a = {x: 1};
a.self = a;
JSON.stringify(a);
`);
    assert.notEqual(exitCode, 0);
    assert.match(stderr, /circular/i);
  });

  // --- JSON.recycle ---

  it("recycle self-reference — d.self.x equals d.x", () => {
    const { stdout } = execGPJ(`
let a = {x: 42};
a.self = a;
let d = JSON.decycle(a);
JSON.recycle(d);
console.log(d.self.x);
`);
    assert.equal(stdout, "42\n");
  });

  it("recycle self-reference — d.self is same object as d", () => {
    const { stdout } = execGPJ(`
let a = {x: 1};
a.self = a;
let d = JSON.decycle(a);
JSON.recycle(d);
d.x = 99;
console.log(d.self.x);
`);
    assert.equal(stdout, "99\n");
  });

  it("recycle mutual references restores both links", () => {
    const { stdout } = execGPJ(`
let a = {v: 1};
let b = {v: 2};
a.other = b;
b.other = a;
let d = JSON.decycle(a);
JSON.recycle(d);
console.log(d.other.v);
console.log(d.other.other.v);
`);
    assert.equal(stdout, "2\n1\n");
  });

  it("recycle returns the same object", () => {
    const { stdout } = execGPJ(`
let a = {x: 5};
let d = JSON.decycle(a);
let r = JSON.recycle(d);
console.log(r.x);
`);
    assert.equal(stdout, "5\n");
  });

  // --- round-trip for simple data ---

  it("round-trip parse/stringify for simple object", () => {
    const { stdout } = execGPJ(`
let a = {n: 7, s: "hi"};
let s = JSON.stringify(a);
let b = JSON.parse(s);
console.log(b.n);
console.log(b.s);
`);
    assert.equal(stdout, "7\nhi\n");
  });

  // --- preamble always injected ---

  it("JSON preamble always present in codegen output", () => {
    const { js } = runGPJ(`let x = 1;`);
    assert.ok(js.includes("JSON.decycle"), `expected JSON preamble in: ${js}`);
  });
});
