"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execGPJ } = require("./helpers");

describe("step 0 — hello world", () => {
  it("prints Hello, world!", () => {
    const { stdout } = execGPJ('console.log("Hello, world!");');
    assert.equal(stdout, "Hello, world!\n");
  });

  it("handles multiple arguments", () => {
    const { stdout } = execGPJ('console.log(1, 2.3, "let\'s go");');
    assert.equal(stdout, "1 2.3 let's go\n");
  });

  it("prints true", () => {
    const { stdout } = execGPJ("console.log(true);");
    assert.equal(stdout, "true\n");
  });

  it("prints false", () => {
    const { stdout } = execGPJ("console.log(false);");
    assert.equal(stdout, "false\n");
  });

  it("prints null for None", () => {
    const { stdout } = execGPJ("console.log(None);");
    assert.equal(stdout, "null\n");
  });
});
