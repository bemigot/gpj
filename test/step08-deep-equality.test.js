import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 8 — deep equality (__gpj_eq)", () => {
  // --- primitives (same behaviour as before) ---

  it("number == number (same)", () => {
    const { stdout } = execGPJ("console.log(1 == 1);");
    assert.equal(stdout, "true\n");
  });

  it("number == number (different)", () => {
    const { stdout } = execGPJ("console.log(1 == 2);");
    assert.equal(stdout, "false\n");
  });

  it("string == string (same)", () => {
    const { stdout } = execGPJ('console.log("abc" == "abc");');
    assert.equal(stdout, "true\n");
  });

  it("string == string (different)", () => {
    const { stdout } = execGPJ('console.log("abc" == "xyz");');
    assert.equal(stdout, "false\n");
  });

  it("boolean == boolean", () => {
    const { stdout } = execGPJ("console.log(true == true);");
    assert.equal(stdout, "true\n");
  });

  it("None == None", () => {
    const { stdout } = execGPJ("console.log(None == None);");
    assert.equal(stdout, "true\n");
  });

  it("1 != 2", () => {
    const { stdout } = execGPJ("console.log(1 != 2);");
    assert.equal(stdout, "true\n");
  });

  it("1 != 1 is false", () => {
    const { stdout } = execGPJ("console.log(1 != 1);");
    assert.equal(stdout, "false\n");
  });

  // --- cross-type ---

  it("number != string", () => {
    const { stdout } = execGPJ('console.log(1 == "1");');
    assert.equal(stdout, "false\n");
  });

  it("None != 0", () => {
    const { stdout } = execGPJ("console.log(None == 0);");
    assert.equal(stdout, "false\n");
  });

  it("None != false", () => {
    const { stdout } = execGPJ("console.log(None == false);");
    assert.equal(stdout, "false\n");
  });

  it('None != ""', () => {
    const { stdout } = execGPJ('console.log(None == "");');
    assert.equal(stdout, "false\n");
  });

  // --- arrays ---

  it("equal arrays", () => {
    const { stdout } = execGPJ("console.log([1, 2, 3] == [1, 2, 3]);");
    assert.equal(stdout, "true\n");
  });

  it("different arrays (values)", () => {
    const { stdout } = execGPJ("console.log([1, 2, 3] == [1, 2, 4]);");
    assert.equal(stdout, "false\n");
  });

  it("different arrays (length)", () => {
    const { stdout } = execGPJ("console.log([1, 2] == [1, 2, 3]);");
    assert.equal(stdout, "false\n");
  });

  it("empty arrays are equal", () => {
    const { stdout } = execGPJ("console.log([] == []);");
    assert.equal(stdout, "true\n");
  });

  it("nested arrays", () => {
    const { stdout } = execGPJ("console.log([1, [2, 3]] == [1, [2, 3]]);");
    assert.equal(stdout, "true\n");
  });

  it("nested arrays (different)", () => {
    const { stdout } = execGPJ("console.log([1, [2, 3]] == [1, [2, 4]]);");
    assert.equal(stdout, "false\n");
  });

  it("array != non-array", () => {
    const { stdout } = execGPJ("console.log([1] == 1);");
    assert.equal(stdout, "false\n");
  });

  // --- objects ---

  it("equal objects", () => {
    const { stdout } = execGPJ("console.log({a: 1, b: 2} == {a: 1, b: 2});");
    assert.equal(stdout, "true\n");
  });

  it("different objects (values)", () => {
    const { stdout } = execGPJ("console.log({a: 1} == {a: 2});");
    assert.equal(stdout, "false\n");
  });

  it("different objects (shape)", () => {
    const { stdout } = execGPJ("console.log({a: 1, b: 2} == {a: 1});");
    assert.equal(stdout, "false\n");
  });

  it("different objects (keys)", () => {
    const { stdout } = execGPJ("console.log({a: 1} == {b: 1});");
    assert.equal(stdout, "false\n");
  });

  it("empty objects are equal", () => {
    const { stdout } = execGPJ("console.log({} == {});");
    assert.equal(stdout, "true\n");
  });

  it("nested objects", () => {
    const src = `console.log({a: {b: 1}} == {a: {b: 1}});`;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "true\n");
  });

  it("nested objects (different)", () => {
    const src = `console.log({a: {b: 1}} == {a: {b: 2}});`;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "false\n");
  });

  it("object with array values", () => {
    const src = `console.log({a: [1, 2]} == {a: [1, 2]});`;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "true\n");
  });

  it("array of objects", () => {
    const src = `console.log([{x: 1}, {x: 2}] == [{x: 1}, {x: 2}]);`;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "true\n");
  });

  // --- only own properties, not inherited ---

  it("inherited properties are not compared", () => {
    const src = `
      let proto = {a: 1};
      let child1 = Object.create(proto);
      let child2 = Object.create(proto);
      child1.x = 10;
      child2.x = 10;
      console.log(child1 == child2);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "true\n");
  });

  it("same own props, different prototypes are equal", () => {
    const src = `
      let proto1 = {a: 1};
      let proto2 = {a: 2};
      let child1 = Object.create(proto1);
      let child2 = Object.create(proto2);
      child1.x = 10;
      child2.x = 10;
      console.log(child1 == child2);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "true\n");
  });

  // --- circular references ---

  it("circular reference - self-referencing object", () => {
    const src = `
      let a = {x: 1};
      a.self = a;
      let b = {x: 1};
      b.self = b;
      console.log(a == b);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "true\n");
  });

  it("circular reference - mutual", () => {
    const src = `
      let a = {v: 1};
      let b = {v: 1};
      a.other = b;
      b.other = a;
      let c = {v: 1};
      let d = {v: 1};
      c.other = d;
      d.other = c;
      console.log(a == c);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "true\n");
  });

  it("same reference is equal", () => {
    const src = `
      let a = {x: 1, y: [2, 3]};
      let b = a;
      console.log(a == b);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "true\n");
  });

  // --- != on compound types ---

  it("[1, 2] != [1, 3]", () => {
    const { stdout } = execGPJ("console.log([1, 2] != [1, 3]);");
    assert.equal(stdout, "true\n");
  });

  it("{a: 1} != {a: 1} is false", () => {
    const { stdout } = execGPJ("console.log({a: 1} != {a: 1});");
    assert.equal(stdout, "false\n");
  });

  // --- codegen checks ---

  it("== emits __gpj_eq call", () => {
    const { js } = runGPJ("console.log(1 == 1);");
    assert.ok(js.includes("__gpj_eq("), "expected __gpj_eq call");
  });

  it("!= emits !__gpj_eq call", () => {
    const { js } = runGPJ("console.log(1 != 2);");
    assert.ok(js.includes("!__gpj_eq("), "expected !__gpj_eq call");
  });

  it("__gpj_eq function is injected in preamble", () => {
    const { js } = runGPJ("console.log(1 == 1);");
    assert.ok(js.includes("function __gpj_eq"), "expected __gpj_eq definition");
  });

  it("__gpj_eq not injected when == not used", () => {
    const { js } = runGPJ("console.log(1 + 2);");
    assert.ok(!js.includes("__gpj_eq"), "expected no __gpj_eq when not needed");
  });
});
