#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { lex } = require("./lexer");
const { parse } = require("./parser");
const { generate } = require("./codegen");

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
