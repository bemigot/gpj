"use strict";

const { execFileSync } = require("child_process");
const { lex } = require("../src/lexer");
const { parse } = require("../src/parser");
const { generate } = require("../src/codegen");

function runGPJ(source) {
  const tokens = lex(source);
  const ast = parse(tokens);
  const js = generate(ast);
  return { js };
}

function execGPJ(source) {
  const { js } = runGPJ(source);
  try {
    const stdout = execFileSync("node", ["-e", js], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],  // without this, child stderr leaks to terminal (noisy on expected-error tests)
      timeout: 5000,
      env: { ...process.env, FORCE_COLOR: "0" },  // otherwise tests fail on TTY: actual: '\x1B[33mtrue\x1B[39m\n', expected: 'true\n'
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err) {
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || "",
      exitCode: err.status ?? 1,
    };
  }
}

module.exports = { runGPJ, execGPJ };
