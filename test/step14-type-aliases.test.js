"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { runGPJ, execGPJ } = require("./helpers");

describe("step 14 — type aliases (parse and skip)", () => {
  it("simple type alias is parsed and skipped", () => {
    const { js } = runGPJ('type ID = String; console.log("ok");');
    assert.ok(!js.includes("type"), js);
    assert.ok(js.includes("console.log"), js);
  });

  it("object type alias", () => {
    const { js } = runGPJ('type Point = {x: Number, y: Number}; console.log(1);');
    assert.ok(js.includes("console.log"), js);
  });

  it("union type alias", () => {
    const { js } = runGPJ("type ID = String; console.log(1);");
    assert.ok(js.includes("console.log"), js);
  });

  it("type alias does not affect execution", () => {
    const src = `
      type Point = {x: Number, y: Number};
      let p = {x: 1, y: 2};
      console.log(p.x, p.y);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 2\n");
  });

  it("multiple type aliases", () => {
    const src = `
      type Name = String;
      type Age = Number;
      console.log("ok");
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "ok\n");
  });

  it("type alias with generic-like syntax", () => {
    const { js } = runGPJ("type Pair = {a: Number, b: String}; console.log(1);");
    assert.ok(js.includes("console.log"), js);
  });
});
