"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execGPJ } = require("./helpers");

describe("step 17 — for...of with destructuring", () => {
  // --- array destructuring ---

  it("array destructuring in for...of", () => {
    const src = `
      let pairs = [[1, "a"], [2, "b"], [3, "c"]];
      for (let [num, letter] of pairs) {
        console.log(num, letter);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 a\n2 b\n3 c\n");
  });

  it("array destructuring with rest in for...of", () => {
    const src = `
      let rows = [[1, 2, 3], [4, 5, 6]];
      for (let [head, ...tail] of rows) {
        console.log(head, tail);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 [ 2, 3 ]\n4 [ 5, 6 ]\n");
  });

  it("nested array destructuring in for...of", () => {
    const src = `
      let data = [[[1, 2], "x"], [[3, 4], "y"]];
      for (let [[a, b], label] of data) {
        console.log(a, b, label);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 2 x\n3 4 y\n");
  });

  // --- object destructuring ---

  it("object destructuring in for...of", () => {
    const src = `
      let people = [{name: "Alice", age: 30}, {name: "Bob", age: 25}];
      for (let {name, age} of people) {
        console.log(name, age);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "Alice 30\nBob 25\n");
  });

  it("object destructuring with rename in for...of", () => {
    const src = `
      let points = [{x: 1, y: 2}, {x: 3, y: 4}];
      for (let {x: px, y: py} of points) {
        console.log(px, py);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 2\n3 4\n");
  });

  it("object destructuring with rest in for...of", () => {
    const src = `
      let items = [{a: 1, b: 2, c: 3}, {a: 4, b: 5, c: 6}];
      for (let {a, ...rest} of items) {
        console.log(a, rest);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 { b: 2, c: 3 }\n4 { b: 5, c: 6 }\n");
  });

  // --- val binding ---

  it("val binding in for...of with destructuring", () => {
    const src = `
      let pairs = [[1, 2], [3, 4]];
      for (val [a, b] of pairs) {
        console.log(a, b);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 2\n3 4\n");
  });

  // --- mixed: object with nested array ---

  it("object with nested array destructuring in for...of", () => {
    const src = `
      let entries = [{key: "x", vals: [1, 2]}, {key: "y", vals: [3, 4]}];
      for (let {key, vals} of entries) {
        let [a, b] = vals;
        console.log(key, a, b);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "x 1 2\ny 3 4\n");
  });

  // --- practical: Object.entries ---

  it("array destructuring with Object.entries", () => {
    const src = `
      let obj = {x: 10, y: 20};
      for (let [key, value] of Object.entries(obj)) {
        console.log(key, value);
      }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "x 10\ny 20\n");
  });
});
