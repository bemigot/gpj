import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import * as nodeFs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execGPJ } from "./helpers.js";

describe("step 38 — fs module", () => {
  let tmpDir;

  before(() => {
    tmpDir = nodeFs.mkdtempSync(path.join(os.tmpdir(), "gpj-fs-test-"));
  });

  after(() => {
    nodeFs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writeFile + readFile roundtrip", () => {
    const p = path.join(tmpDir, "hello.txt");
    const { stdout, exitCode, stderr } = execGPJ(`
import writeFile from "fs";
import readFile from "fs";
writeFile("${p}", "hello world");
console.log(readFile("${p}"));
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "hello world\n");
  });

  it("exists returns true for existing file", () => {
    const p = path.join(tmpDir, "exists.txt");
    nodeFs.writeFileSync(p, "x");
    const { stdout, exitCode, stderr } = execGPJ(`
import exists from "fs";
console.log(exists("${p}"));
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "true\n");
  });

  it("exists returns false for missing file", () => {
    const p = path.join(tmpDir, "no-such-file.txt");
    const { stdout, exitCode, stderr } = execGPJ(`
import exists from "fs";
console.log(exists("${p}"));
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "false\n");
  });

  it("readDir returns an Array", () => {
    const subDir = path.join(tmpDir, "readdir-test");
    nodeFs.mkdirSync(subDir);
    nodeFs.writeFileSync(path.join(subDir, "a.txt"), "");
    nodeFs.writeFileSync(path.join(subDir, "b.txt"), "");
    const { stdout, exitCode, stderr } = execGPJ(`
import readDir from "fs";
val files = readDir("${subDir}");
console.log(typeof files == "Array");
console.log(files.length);
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "true\n2\n");
  });

  it("makeDir creates nested directories", () => {
    const nested = path.join(tmpDir, "a", "b", "c");
    const { exitCode, stderr } = execGPJ(`
import makeDir from "fs";
makeDir("${nested}");
`);
    assert.equal(exitCode, 0, stderr);
    assert.ok(nodeFs.existsSync(nested), "nested dir should exist");
  });

  it("removeFile deletes a file", () => {
    const p = path.join(tmpDir, "to-remove.txt");
    nodeFs.writeFileSync(p, "bye");
    const { exitCode, stderr } = execGPJ(`
import removeFile from "fs";
removeFile("${p}");
`);
    assert.equal(exitCode, 0, stderr);
    assert.ok(!nodeFs.existsSync(p), "file should be gone");
  });

  it("namespace import works", () => {
    const p = path.join(tmpDir, "ns.txt");
    const { stdout, exitCode, stderr } = execGPJ(`
import * as fs from "fs";
fs.writeFile("${p}", "ns test");
console.log(fs.readFile("${p}"));
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "ns test\n");
  });
});
