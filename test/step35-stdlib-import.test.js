import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 35 — stdlib import infrastructure", () => {
  // --- Codegen: bare-name import rewriting ---

  it("bare import is rewritten to a file:// URL", () => {
    const { js } = runGPJ(`import get from "http";`);
    assert.ok(js.includes("file://"), `expected file:// in: ${js}`);
  });

  it("bare import path contains src/stdlib/<name>.js", () => {
    const { js } = runGPJ(`import get from "http";`);
    assert.ok(js.includes("/stdlib/http.js"), `expected stdlib path in: ${js}`);
  });

  it("bare import for a different name rewrites correctly", () => {
    const { js } = runGPJ(`import readFile from "fs";`);
    assert.ok(js.includes("/stdlib/fs.js"), `expected fs stdlib path in: ${js}`);
  });

  it("relative import with ./ is not rewritten to stdlib", () => {
    const { js } = runGPJ(`import foo from "./foo";`);
    assert.ok(js.includes('"./foo.js"'), `expected relative path unchanged in: ${js}`);
    assert.ok(!js.includes("stdlib"), `unexpected stdlib in: ${js}`);
  });

  it("relative import with ../ is not rewritten to stdlib", () => {
    const { js } = runGPJ(`import bar from "../bar";`);
    assert.ok(js.includes('"../bar.js"'), `expected ../bar.js in: ${js}`);
    assert.ok(!js.includes("stdlib"), `unexpected stdlib in: ${js}`);
  });

  it("namespace import from bare name is also rewritten", () => {
    const { js } = runGPJ(`import * as proc from "process";`);
    assert.ok(js.includes("file://"), `expected file:// in: ${js}`);
    assert.ok(js.includes("/stdlib/process.js"), `expected stdlib path in: ${js}`);
  });

  // --- Execution: stdlib import resolved at runtime ---

  it("can import a constant from a stdlib module", () => {
    const { stdout, exitCode } = execGPJ(`
import answer from "_test";
console.log(answer);
`);
    assert.equal(exitCode, 0);
    assert.equal(stdout, "42\n");
  });

  it("can call a function from a stdlib module", () => {
    const { stdout, exitCode } = execGPJ(`
import greet from "_test";
console.log(greet("world"));
`);
    assert.equal(exitCode, 0);
    assert.equal(stdout, "hello world\n");
  });
});
