import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { execGPJ } from "./helpers.js";

// The server must be a separate OS process. execFileSync (used inside execGPJ
// and http.get) blocks the current process's event loop, which would prevent
// an in-process server from accepting TCP connections.

const serverScript = `
const http = require("http");
const server = http.createServer((req, res) => {
  if (req.url === "/hello") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("hello world");
  } else if (req.url === "/json") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ answer: 42 }));
  } else if (req.url === "/not-found") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  } else {
    res.writeHead(500);
    res.end("server error");
  }
});
server.listen(0, "127.0.0.1", () => {
  process.stdout.write(server.address().port + "\\n");
});
`;

describe("step 36 — http module", () => {
  let serverProcess;
  let port;

  before(() => new Promise((resolve, reject) => {
    serverProcess = spawn("node", ["-e", serverScript], {
      stdio: ["ignore", "pipe", "inherit"],
    });
    let buf = "";
    serverProcess.stdout.on("data", (chunk) => {
      buf += chunk;
      const nl = buf.indexOf("\n");
      if (nl !== -1) {
        port = parseInt(buf.slice(0, nl), 10);
        resolve();
      }
    });
    serverProcess.on("error", reject);
  }));

  after(() => { serverProcess.kill(); });

  it("ok is true for 200", () => {
    const { stdout, exitCode, stderr } = execGPJ(`
import get from "http";
val r = get("http://127.0.0.1:${port}/hello");
console.log(r.ok);
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "true\n");
  });

  it("ok is false for 404", () => {
    const { stdout, exitCode, stderr } = execGPJ(`
import get from "http";
val r = get("http://127.0.0.1:${port}/not-found");
console.log(r.ok);
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "false\n");
  });

  it("status is the HTTP status code for 200", () => {
    const { stdout, exitCode, stderr } = execGPJ(`
import get from "http";
val r = get("http://127.0.0.1:${port}/hello");
console.log(r.status);
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "200\n");
  });

  it("status is 404 for not-found", () => {
    const { stdout, exitCode, stderr } = execGPJ(`
import get from "http";
val r = get("http://127.0.0.1:${port}/not-found");
console.log(r.status);
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "404\n");
  });

  it("text() returns body string", () => {
    const { stdout, exitCode, stderr } = execGPJ(`
import get from "http";
val r = get("http://127.0.0.1:${port}/hello");
console.log(r.text());
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "hello world\n");
  });

  it("json() returns parsed object", () => {
    const { stdout, exitCode, stderr } = execGPJ(`
import get from "http";
val r = get("http://127.0.0.1:${port}/json");
val data = r.json();
console.log(data.answer);
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "42\n");
  });

  it("bad host throws an error", () => {
    const { exitCode, stderr } = execGPJ(`
import get from "http";
get("http://127.0.0.1:1/nope");
`);
    assert.notEqual(exitCode, 0);
    assert.ok(stderr.length > 0, "expected error message on stderr");
  });

  it("namespace import works (import * as http)", () => {
    const { stdout, exitCode, stderr } = execGPJ(`
import * as http from "http";
val r = http.get("http://127.0.0.1:${port}/hello");
console.log(r.ok);
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, "true\n");
  });
});
