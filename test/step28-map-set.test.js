import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 28 — Map and Set", () => {
  // --- Map.of factory transpilation ---

  it("Map.of emits new Map([...])", () => {
    const { js } = runGPJ(`let m = Map.of(["x", 1], ["y", 2]);`);
    assert.ok(js.includes("new Map("), js);
    assert.ok(!js.includes("Map.of"), js);
  });

  it("Map.of empty — emits new Map([])", () => {
    const { js } = runGPJ(`let m = Map.of();`);
    assert.ok(js.includes("new Map([])"), js);
  });

  // --- Set.of factory transpilation ---

  it("Set.of emits new Set([...])", () => {
    const { js } = runGPJ(`let s = Set.of(1, 2, 3);`);
    assert.ok(js.includes("new Set("), js);
    assert.ok(!js.includes("Set.of"), js);
  });

  it("Set.of empty — emits new Set([])", () => {
    const { js } = runGPJ(`let s = Set.of();`);
    assert.ok(js.includes("new Set([])"), js);
  });

  // --- Map runtime behaviour ---

  it("Map.of creates map with correct entries", () => {
    const { stdout } = execGPJ(`
let m = Map.of(["x", 1], ["y", 2]);
console.log(m.get("x"));
console.log(m.get("y"));
`);
    assert.equal(stdout, "1\n2\n");
  });

  it("Map.has returns true for present key", () => {
    const { stdout } = execGPJ(`
let m = Map.of(["a", 10]);
console.log(m.has("a"));
console.log(m.has("b"));
`);
    assert.equal(stdout, "true\nfalse\n");
  });

  it("Map.size property", () => {
    const { stdout } = execGPJ(`
let m = Map.of(["x", 1], ["y", 2], ["z", 3]);
console.log(m.size);
`);
    assert.equal(stdout, "3\n");
  });

  it("Map.set adds / updates an entry", () => {
    const { stdout } = execGPJ(`
let m = Map.of(["a", 1]);
m.set("b", 2);
m.set("a", 99);
console.log(m.get("a"));
console.log(m.get("b"));
`);
    assert.equal(stdout, "99\n2\n");
  });

  it("Map.delete removes an entry", () => {
    const { stdout } = execGPJ(`
let m = Map.of(["a", 1], ["b", 2]);
m.delete("a");
console.log(m.has("a"));
console.log(m.size);
`);
    assert.equal(stdout, "false\n1\n");
  });

  it("Map.clear empties the map", () => {
    const { stdout } = execGPJ(`
let m = Map.of(["a", 1], ["b", 2]);
m.clear();
console.log(m.size);
`);
    assert.equal(stdout, "0\n");
  });

  it("Map empty — size is 0, get returns undefined", () => {
    const { stdout } = execGPJ(`
let m = Map.of();
console.log(m.size);
`);
    assert.equal(stdout, "0\n");
  });

  // --- Set runtime behaviour ---

  it("Set.of creates set with correct values", () => {
    const { stdout } = execGPJ(`
let s = Set.of(1, 2, 3);
console.log(s.has(1));
console.log(s.has(4));
`);
    assert.equal(stdout, "true\nfalse\n");
  });

  it("Set.size property", () => {
    const { stdout } = execGPJ(`
let s = Set.of(10, 20, 30);
console.log(s.size);
`);
    assert.equal(stdout, "3\n");
  });

  it("Set.add inserts value; duplicate has no effect", () => {
    const { stdout } = execGPJ(`
let s = Set.of(1, 2);
s.add(3);
s.add(2);
console.log(s.size);
console.log(s.has(3));
`);
    assert.equal(stdout, "3\ntrue\n");
  });

  it("Set.delete removes a value", () => {
    const { stdout } = execGPJ(`
let s = Set.of(1, 2, 3);
s.delete(2);
console.log(s.has(2));
console.log(s.size);
`);
    assert.equal(stdout, "false\n2\n");
  });

  it("Set.clear empties the set", () => {
    const { stdout } = execGPJ(`
let s = Set.of(1, 2, 3);
s.clear();
console.log(s.size);
`);
    assert.equal(stdout, "0\n");
  });

  // --- for...of iteration ---

  it("for...of over Set yields values in insertion order", () => {
    const { stdout } = execGPJ(`
let s = Set.of(10, 20, 30);
for (let n of s) {
  console.log(n);
}
`);
    assert.equal(stdout, "10\n20\n30\n");
  });

  it("for...of over Map yields [key, value] pairs (destructured)", () => {
    const { stdout } = execGPJ(`
let m = Map.of(["a", 1], ["b", 2]);
for (let [k, v] of m) {
  console.log(k, v);
}
`);
    assert.equal(stdout, "a 1\nb 2\n");
  });

  it("for...of over Map with val binding", () => {
    const { stdout } = execGPJ(`
let m = Map.of(["x", 100]);
for (val [k, v] of m) {
  console.log(k, v);
}
`);
    assert.equal(stdout, "x 100\n");
  });

  it("for...of over empty Map — no iterations", () => {
    const { stdout } = execGPJ(`
let m = Map.of();
let count = 0;
for (let [k, v] of m) {
  count += 1;
}
console.log(count);
`);
    assert.equal(stdout, "0\n");
  });

  it("for...of over empty Set — no iterations", () => {
    const { stdout } = execGPJ(`
let s = Set.of();
let count = 0;
for (let n of s) {
  count += 1;
}
console.log(count);
`);
    assert.equal(stdout, "0\n");
  });

  // --- integration ---

  it("Map used as frequency counter", () => {
    const { stdout } = execGPJ(`
let counts = Map.of();
let words = ["a", "b", "a", "c", "b", "a"];
for (let w of words) {
  if (counts.has(w)) {
    counts.set(w, counts.get(w) + 1);
  } else {
    counts.set(w, 1);
  }
}
console.log(counts.get("a"));
console.log(counts.get("b"));
console.log(counts.get("c"));
`);
    assert.equal(stdout, "3\n2\n1\n");
  });

  it("Set used for deduplication", () => {
    const { stdout } = execGPJ(`
let seen = Set.of();
let nums = [1, 2, 1, 3, 2, 4];
let uniq = [];
for (let n of nums) {
  if (!seen.has(n)) {
    seen.add(n);
    uniq.push(n);
  }
}
console.log(uniq.length);
`);
    assert.equal(stdout, "4\n");
  });
});
