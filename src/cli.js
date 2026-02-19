#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execFileSync } from "node:child_process";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { typecheck } from "./typechecker.js";
import { generate } from "./codegen.js";

function run(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`gpj: file not found: ${resolved}`);
    process.exit(1);
  }

  const source = fs.readFileSync(resolved, "utf-8");

  let js;
  try {
    const tokens = lex(source);
    const ast = parse(tokens);
    typecheck(ast);
    js = generate(ast);
  } catch (err) {
    console.error(`gpj: ${err.message}`);
    process.exit(1);
  }

  // Write to a temp .mjs file and spawn Node so that top-level import
  // statements (stdlib and user modules) are resolved correctly.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gpj-"));
  const tmpFile = path.join(tmpDir, "out.mjs");
  try {
    fs.writeFileSync(tmpFile, js, "utf-8");
    execFileSync("node", [tmpFile], { stdio: "inherit" });
  } catch (err) {
    process.exit(err.status ?? 1);
  } finally {
    if (process.env.GPJ_PRESERVE_OUT) {
      console.warn(`gpj: compiled output preserved at: ${tmpFile}`);
    } else {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: gpj <file.gpj>");
  process.exit(1);
}

run(args[0]);
