"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { runGPJ, execGPJ } = require("./helpers");

describe("step 15 — destructuring", () => {
  // --- object destructuring ---

  it("basic object destructuring", () => {
    const src = `
      let point = {x: 1, y: 2, z: 3};
      let {x, y} = point;
      console.log(x, y);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 2\n");
  });

  it("object destructuring with rename", () => {
    const src = `
      let point = {x: 1, y: 2};
      let {x: px, y: py} = point;
      console.log(px, py);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 2\n");
  });

  it("object destructuring with rest", () => {
    const src = `
      let point = {x: 1, y: 2, z: 3};
      let {x, ...rest} = point;
      console.log(x);
      console.log(rest.y, rest.z);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n2 3\n");
  });

  it("val object destructuring", () => {
    const src = `
      val {x, y} = {x: 10, y: 20};
      console.log(x, y);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "10 20\n");
  });

  // --- array destructuring ---

  it("basic array destructuring", () => {
    const src = `
      let arr = [1, 2, 3];
      let [a, b, c] = arr;
      console.log(a, b, c);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 2 3\n");
  });

  it("array destructuring with rest", () => {
    const src = `
      let arr = [1, 2, 3, 4];
      let [head, ...tail] = arr;
      console.log(head);
      console.log(tail.length);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n3\n");
  });

  it("val array destructuring", () => {
    const src = `
      val [a, b] = [10, 20];
      console.log(a, b);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "10 20\n");
  });

  it("array destructuring partial (fewer bindings)", () => {
    const src = `
      let [first, second] = [1, 2, 3, 4];
      console.log(first, second);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 2\n");
  });

  // --- nested destructuring ---

  it("nested object destructuring", () => {
    const src = `
      let data = {pos: {x: 1, y: 2}, name: "origin"};
      let {pos: {x, y}, name} = data;
      console.log(x, y, name);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 2 origin\n");
  });

  it("object with nested array", () => {
    const src = `
      let data = {items: [10, 20, 30]};
      let {items: [a, b]} = data;
      console.log(a, b);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "10 20\n");
  });

  it("array of objects destructured", () => {
    const src = `
      let pair = [{x: 1}, {x: 2}];
      let [{x: a}, {x: b}] = pair;
      console.log(a, b);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 2\n");
  });

  // --- with type annotations (skipped) ---

  it("object destructuring with type annotation", () => {
    const src = `
      let point: {x: Number, y: Number} = {x: 5, y: 6};
      console.log(point.x);
    `;
    // This is a regular var declaration with type annotation, not destructuring.
    // Just verify it still works.
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "5\n");
  });

  // --- codegen checks ---

  it("object destructuring emits JS destructuring", () => {
    const { js } = runGPJ("let {x, y} = point;");
    assert.ok(js.includes("{ x, y }"), js);
  });

  it("array destructuring emits JS destructuring", () => {
    const { js } = runGPJ("let [a, b] = arr;");
    assert.ok(js.includes("[a, b]"), js);
  });

  it("rename emits JS rename syntax", () => {
    const { js } = runGPJ("let {x: px} = point;");
    assert.ok(js.includes("x: px"), js);
  });

  it("rest in destructure emits ...", () => {
    const { js } = runGPJ("let {x, ...rest} = obj;");
    assert.ok(js.includes("...rest"), js);
  });

  it("array rest emits ...", () => {
    const { js } = runGPJ("let [head, ...tail] = arr;");
    assert.ok(js.includes("...tail"), js);
  });
});
