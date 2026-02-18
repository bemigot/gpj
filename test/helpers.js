import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { typecheck } from "../src/typechecker.js";
import { generate } from "../src/codegen.js";

function runGPJ(source) {
  const tokens = lex(source);
  const ast = parse(tokens);
  typecheck(ast);
  const js = generate(ast);
  return { js };
}

function execGPJ(source) {
  const { js } = runGPJ(source);
  try {
    const stdout = execFileSync("node", ["--input-type=module", "-e", js], {
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

/**
 * Run a multi-file module test. `files` is an object mapping relative paths
 * to GPJ source strings. `main` is the key of the entry file.
 * Each GPJ source is transpiled and written to a temp directory, then the
 * main file is executed with `node`.
 */
function execGPJModules(files, main) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gpj-test-"));
  try {
    // package.json with "type": "module" so .js files are treated as ESM
    fs.writeFileSync(path.join(tmpDir, "package.json"), '{"type":"module"}', "utf-8");
    for (const [relPath, gpjSource] of Object.entries(files)) {
      const { js } = runGPJ(gpjSource);
      const outPath = path.join(tmpDir, relPath.replace(/\.gpj$/, ".js"));
      const dir = path.dirname(outPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(outPath, js, "utf-8");
    }
    const mainPath = path.join(tmpDir, main.replace(/\.gpj$/, ".js"));
    const stdout = execFileSync("node", [mainPath], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err) {
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || "",
      exitCode: err.status ?? 1,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export { runGPJ, execGPJ, execGPJModules };
