import * as fs from "node:fs";

export function readFile(path) { return fs.readFileSync(path, "utf8"); }
export function writeFile(path, data) { fs.writeFileSync(path, data, "utf8"); }
export function exists(path) { return fs.existsSync(path); }
export function readDir(path) { return fs.readdirSync(path); }
export function makeDir(path) { fs.mkdirSync(path, { recursive: true }); }
export function removeFile(path) { fs.unlinkSync(path); }
