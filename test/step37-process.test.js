import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execGPJ } from "./helpers.js";

describe("step 37 — process module", () => {
  it("env is an Object", () => {
    const { stdout, exitCode, stderr } = execGPJ(`
import env from "process";
console.log(typeof env == "Object");
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "true\n");
  });

  it("env.PATH is a String", () => {
    const { stdout, exitCode, stderr } = execGPJ(`
import env from "process";
console.log(typeof env.PATH == "String");
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "true\n");
  });

  it("args is an Array", () => {
    const { stdout, exitCode, stderr } = execGPJ(`
import args from "process";
console.log(typeof args == "Array");
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "true\n");
  });

  it("exit(0) exits with code 0", () => {
    const { exitCode, stderr } = execGPJ(`
import exit from "process";
exit(0);
`);
    assert.equal(exitCode, 0, stderr);
  });

  it("exit(1) exits with code 1", () => {
    const { exitCode } = execGPJ(`
import exit from "process";
exit(1);
`);
    assert.equal(exitCode, 1);
  });

  it("exit(42) exits with code 42", () => {
    const { exitCode } = execGPJ(`
import exit from "process";
exit(42);
`);
    assert.equal(exitCode, 42);
  });

  it("namespace import: proc.env is an Object", () => {
    const { stdout, exitCode, stderr } = execGPJ(`
import * as proc from "process";
console.log(typeof proc.env == "Object");
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "true\n");
  });

  it("namespace import: proc.exit(0)", () => {
    const { exitCode, stderr } = execGPJ(`
import * as proc from "process";
proc.exit(0);
`);
    assert.equal(exitCode, 0, stderr);
  });
});
