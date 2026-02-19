import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { execGPJ } from "./helpers.js";

// Random values generated once per run — no hardcoded string can pass the assertions.
const rnd = () => Math.random().toString(36).slice(2);
const STATUS     = "st_" + rnd();
const CONCLUSION = "cn_" + rnd();
const UA         = "ua_" + rnd();

// The server validates the User-Agent header (sent via a string-keyed object literal),
// returning 400 for any mismatch — so the header must actually be passed through.
const serverScript = `
const http = require("http");
const server = http.createServer((req, res) => {
  const ua = req.headers["user-agent"] || "";
  if (req.url === "/runs" && ua === "${UA}") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      workflow_runs: [{ status: "${STATUS}", conclusion: "${CONCLUSION}" }]
    }));
  } else if (req.url === "/error") {
    res.writeHead(503);
    res.end("unavailable");
  } else {
    res.writeHead(400);
    res.end("bad request: " + req.url + " ua=" + ua);
  }
});
server.listen(0, "127.0.0.1", () => {
  process.stdout.write(server.address().port + "\\n");
});
`;

describe("milestone — gh-ci-stat e2e", () => {
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

  it("prints status and conclusion; string-keyed headers object is passed to server", () => {
    const { stdout, exitCode, stderr } = execGPJ(`
import * as http from "http";
val url = "http://127.0.0.1:${port}/runs";
try {
  val response = http.get(url, { headers: { "User-Agent": "${UA}" } });
  if (!response.ok) {
    throw { message: f"HTTP error! status: {response.status}" };
  }
  val data = response.json();
  val latestRun = data.workflow_runs[0];
  console.log(f"Status: {latestRun.status}");
  console.log(f"Conclusion: {latestRun.conclusion}");
} catch (e) {
  console.error("Error:", e.message);
}
`);
    assert.equal(exitCode, 0, stderr);
    assert.equal(stdout, `Status: ${STATUS}\nConclusion: ${CONCLUSION}\n`);
  });

  it("non-200 response triggers throw in try block and is caught", () => {
    const { stdout, exitCode, stderr } = execGPJ(`
import * as http from "http";
val url = "http://127.0.0.1:${port}/error";
try {
  val response = http.get(url, { headers: { "User-Agent": "${UA}" } });
  if (!response.ok) {
    throw { message: f"HTTP error! status: {response.status}" };
  }
} catch (e) {
  console.log(e.message);
}
`);
    assert.equal(exitCode, 0, stderr);
    assert.ok(stdout.startsWith("HTTP error! status: 503"), `got: ${stdout}`);
  });
});
