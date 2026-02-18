import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ, execGPJModules } from "./helpers.js";

describe("step 9 — modules (import/export)", () => {
  // --- import parsing ---

  it("single named import", () => {
    const { js } = runGPJ('import foo from "./utils";');
    assert.ok(js.includes('import { foo } from "./utils.js"'), js);
  });

  it("multiple named imports", () => {
    const { js } = runGPJ('import foo, bar from "./utils";');
    assert.ok(js.includes('import { foo, bar } from "./utils.js"'), js);
  });

  it("aliased import", () => {
    const { js } = runGPJ('import foo as f from "./utils";');
    assert.ok(js.includes('import { foo as f } from "./utils.js"'), js);
  });

  it("multiple imports with aliases", () => {
    const { js } = runGPJ('import foo as f, bar as b from "./utils";');
    assert.ok(js.includes('import { foo as f, bar as b } from "./utils.js"'), js);
  });

  it("namespace import", () => {
    const { js } = runGPJ('import * as utils from "./utils";');
    assert.ok(js.includes('import * as utils from "./utils.js"'), js);
  });

  it("bare import path (stdlib) has no .js added", () => {
    const { js } = runGPJ('import * as fs from "fs";');
    assert.ok(js.includes('from "fs"'), js);
    assert.ok(!js.includes('from "fs.js"'), js);
  });

  // --- export parsing ---

  it("export function", () => {
    const { js } = runGPJ("export function add(a, b) { return a + b; }");
    assert.ok(js.includes("export function add(a, b)"), js);
  });

  it("export let", () => {
    const { js } = runGPJ("export let x = 5;");
    assert.ok(js.includes("export let x = 5;"), js);
  });

  it("export val (primitive)", () => {
    const { js } = runGPJ("export val PI = 3.14;");
    assert.ok(js.includes("export const PI = 3.14;"), js);
  });

  it("export val (object) emits Object.freeze", () => {
    const { js } = runGPJ("export val config = {debug: false};");
    assert.ok(js.includes("export const config = Object.freeze("), js);
  });

  // --- export with type annotations ---

  it("export function with type annotations", () => {
    const { js } = runGPJ("export function add(a: Number, b: Number): Number { return a + b; }");
    assert.ok(js.includes("export function add(a, b)"), js);
  });

  it("export val with type annotation", () => {
    const { js } = runGPJ("export val PI: Number = 3.14;");
    assert.ok(js.includes("export const PI = 3.14;"), js);
  });

  // --- parse errors ---

  it("import without from → parse error", () => {
    assert.throws(() => runGPJ('import foo "bar";'), /from/i);
  });

  it("import without path → parse error", () => {
    assert.throws(() => runGPJ('import foo from ;'), /string/i);
  });

  it("export non-declaration → parse error", () => {
    assert.throws(() => runGPJ('export 42;'), /function|let|val/i);
  });

  // --- multi-file execution ---

  it("import named export from another file", () => {
    const { stdout } = execGPJModules({
      "utils.gpj": 'export function greet(name) { return "hello " + name; }',
      "main.gpj": 'import greet from "./utils"; console.log(greet("world"));',
    }, "main.gpj");
    assert.equal(stdout, "hello world\n");
  });

  it("import multiple exports", () => {
    const { stdout } = execGPJModules({
      "math.gpj": `
        export function add(a, b) { return a + b; }
        export function mul(a, b) { return a * b; }
      `,
      "main.gpj": `
        import add, mul from "./math";
        console.log(add(2, 3));
        console.log(mul(4, 5));
      `,
    }, "main.gpj");
    assert.equal(stdout, "5\n20\n");
  });

  it("import with alias", () => {
    const { stdout } = execGPJModules({
      "lib.gpj": "export let value = 42;",
      "main.gpj": 'import value as v from "./lib"; console.log(v);',
    }, "main.gpj");
    assert.equal(stdout, "42\n");
  });

  it("namespace import", () => {
    const { stdout } = execGPJModules({
      "utils.gpj": `
        export let x = 10;
        export let y = 20;
      `,
      "main.gpj": `
        import * as u from "./utils";
        console.log(u.x);
        console.log(u.y);
      `,
    }, "main.gpj");
    assert.equal(stdout, "10\n20\n");
  });

  it("export val is frozen in importing module", () => {
    const { stderr, exitCode } = execGPJModules({
      "config.gpj": "export val settings = {debug: false};",
      "main.gpj": `
        import settings from "./config";
        settings.debug = true;
      `,
    }, "main.gpj");
    assert.notEqual(exitCode, 0);
    assert.ok(stderr.includes("TypeError"), stderr);
  });

  it("chained imports across three files", () => {
    const { stdout } = execGPJModules({
      "a.gpj": "export let msg = \"from a\";",
      "b.gpj": 'import msg from "./a"; export let combined = msg + " and b";',
      "main.gpj": 'import combined from "./b"; console.log(combined);',
    }, "main.gpj");
    assert.equal(stdout, "from a and b\n");
  });

  it("subdirectory import", () => {
    const { stdout } = execGPJModules({
      "lib/helpers.gpj": "export function double(n) { return n * 2; }",
      "main.gpj": 'import double from "./lib/helpers"; console.log(double(21));',
    }, "main.gpj");
    assert.equal(stdout, "42\n");
  });

  // --- mixed with existing features ---

  it("export + import with deep equality", () => {
    const { stdout } = execGPJModules({
      "data.gpj": "export let items = [1, 2, 3];",
      "main.gpj": `
        import items from "./data";
        console.log(items == [1, 2, 3]);
      `,
    }, "main.gpj");
    assert.equal(stdout, "true\n");
  });

  it("export + import with objects and this", () => {
    const { stdout } = execGPJModules({
      "counter.gpj": `
        export function makeCounter(start) {
          return {
            count: start,
            inc: function() { this.count = this.count + 1; },
            get: function() { return this.count; }
          };
        }
      `,
      "main.gpj": `
        import makeCounter from "./counter";
        let c = makeCounter(0);
        c.inc();
        c.inc();
        console.log(c.get());
      `,
    }, "main.gpj");
    assert.equal(stdout, "2\n");
  });
});
