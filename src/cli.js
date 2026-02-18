#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { generate } from "./codegen.js";

function run(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`gpj: file not found: ${resolved}`);
    process.exit(1);
  }

  const source = fs.readFileSync(resolved, "utf-8");

  try {
    const tokens = lex(source);
    const ast = parse(tokens);
    const js = generate(ast);
    // Execute the generated JS
    new Function(js)();
  } catch (err) {
    console.error(`gpj: ${err.message}`);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: gpj <file.gpj>");
  process.exit(1);
}

run(args[0]);
