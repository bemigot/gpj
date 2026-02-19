import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execGPJ, runGPJ } from "./helpers.js";

describe("step 33 — Array built-in methods", () => {
  // --- pop() ---

  it("pop() on non-empty array returns last element", () => {
    const { stdout } = execGPJ(`
let a = [1, 2, 3];
console.log(a.pop());
console.log(a.pop());
`);
    assert.equal(stdout, "3\n2\n");
  });

  it("pop() on empty array returns null (None)", () => {
    const { stdout } = execGPJ(`
let a = [];
console.log(a.pop());
`);
    assert.equal(stdout, "null\n");
  });

  it("pop() works with None check via ??", () => {
    const { stdout } = execGPJ(`
let a = [];
let v = a.pop() ?? 42;
console.log(v);
`);
    assert.equal(stdout, "42\n");
  });

  // --- shift() ---

  it("shift() on non-empty array returns first element", () => {
    const { stdout } = execGPJ(`
let a = [10, 20, 30];
console.log(a.shift());
console.log(a.shift());
`);
    assert.equal(stdout, "10\n20\n");
  });

  it("shift() on empty array returns null (None)", () => {
    const { stdout } = execGPJ(`
let a = [];
console.log(a.shift());
`);
    assert.equal(stdout, "null\n");
  });

  // --- find() ---

  it("find() returns matching element", () => {
    const { stdout } = execGPJ(`
let a = [1, 2, 3, 4];
let result = a.find((x) => x > 2);
console.log(result);
`);
    assert.equal(stdout, "3\n");
  });

  it("find() returns null (None) when no match", () => {
    const { stdout } = execGPJ(`
let a = [1, 2, 3];
let result = a.find((x) => x > 10);
console.log(result);
`);
    assert.equal(stdout, "null\n");
  });

  it("find() on empty array returns null", () => {
    const { stdout } = execGPJ(`
let a = [];
console.log(a.find((x) => true));
`);
    assert.equal(stdout, "null\n");
  });

  // --- findIndex() ---

  it("findIndex() returns index of matching element", () => {
    const { stdout } = execGPJ(`
let a = [10, 20, 30];
console.log(a.findIndex((x) => x == 20));
`);
    assert.equal(stdout, "1\n");
  });

  it("findIndex() returns null (None) when no match", () => {
    const { stdout } = execGPJ(`
let a = [1, 2, 3];
console.log(a.findIndex((x) => x > 100));
`);
    assert.equal(stdout, "null\n");
  });

  // --- indexOf() ---

  it("indexOf() returns index of found primitive", () => {
    const { stdout } = execGPJ(`
let a = [10, 20, 30];
console.log(a.indexOf(20));
`);
    assert.equal(stdout, "1\n");
  });

  it("indexOf() returns 0 for first element", () => {
    const { stdout } = execGPJ(`
let a = ["a", "b", "c"];
console.log(a.indexOf("a"));
`);
    assert.equal(stdout, "0\n");
  });

  it("indexOf() returns null (None) when not found", () => {
    const { stdout } = execGPJ(`
let a = [1, 2, 3];
console.log(a.indexOf(99));
`);
    assert.equal(stdout, "null\n");
  });

  it("indexOf() uses deep equality for objects", () => {
    const { stdout } = execGPJ(`
let a = [{x: 1}, {x: 2}, {x: 3}];
console.log(a.indexOf({x: 2}));
`);
    assert.equal(stdout, "1\n");
  });

  it("indexOf() uses deep equality for arrays", () => {
    const { stdout } = execGPJ(`
let a = [[1, 2], [3, 4], [5, 6]];
console.log(a.indexOf([3, 4]));
`);
    assert.equal(stdout, "1\n");
  });

  it("indexOf() returns null for object not present (deep eq)", () => {
    const { stdout } = execGPJ(`
let a = [{x: 1}, {x: 2}];
console.log(a.indexOf({x: 9}));
`);
    assert.equal(stdout, "null\n");
  });

  // --- sort() ---

  it("sort() with numeric comparator works ascending", () => {
    const { stdout } = execGPJ(`
let a = [3, 1, 4, 1, 5, 9, 2, 6];
a.sort((x, y) => x - y);
console.log(a[0]);
console.log(a[1]);
console.log(a[2]);
`);
    assert.equal(stdout, "1\n1\n2\n");
  });

  it("sort() with numeric comparator works descending", () => {
    const { stdout } = execGPJ(`
let a = [3, 1, 2];
a.sort((x, y) => y - x);
console.log(a[0]);
console.log(a[1]);
console.log(a[2]);
`);
    assert.equal(stdout, "3\n2\n1\n");
  });

  it("sort() with String.compare as comparator", () => {
    const { stdout } = execGPJ(`
let a = ["banana", "apple", "cherry"];
a.sort((x, y) => String.compare(x, y));
console.log(a[0]);
console.log(a[1]);
console.log(a[2]);
`);
    assert.equal(stdout, "apple\nbanana\ncherry\n");
  });

  it("sort() without comparator — runtime TypeError", () => {
    const { exitCode, stderr } = execGPJ(`
let a = [3, 1, 2];
a.sort();
`);
    assert.notEqual(exitCode, 0);
    assert.match(stderr, /comparator/i);
  });

  // --- pass-through methods ---

  it("map() transforms elements", () => {
    const { stdout } = execGPJ(`
let a = [1, 2, 3];
let b = a.map((x) => x * 2);
console.log(b[0]);
console.log(b[1]);
console.log(b[2]);
`);
    assert.equal(stdout, "2\n4\n6\n");
  });

  it("filter() selects matching elements", () => {
    const { stdout } = execGPJ(`
let a = [1, 2, 3, 4, 5];
let b = a.filter((x) => x > 2);
console.log(b.length);
console.log(b[0]);
`);
    assert.equal(stdout, "3\n3\n");
  });

  it("reduce() folds array", () => {
    const { stdout } = execGPJ(`
let a = [1, 2, 3, 4];
let sum = a.reduce((acc, x) => acc + x, 0);
console.log(sum);
`);
    assert.equal(stdout, "10\n");
  });

  it("forEach() iterates without return", () => {
    const { stdout } = execGPJ(`
let a = [1, 2, 3];
a.forEach((x) => console.log(x));
`);
    assert.equal(stdout, "1\n2\n3\n");
  });

  it("some() returns true when predicate matches", () => {
    const { stdout } = execGPJ(`console.log([1, 2, 3].some((x) => x > 2));`);
    assert.equal(stdout, "true\n");
  });

  it("every() returns false when predicate fails for one", () => {
    const { stdout } = execGPJ(`console.log([1, 2, 3].every((x) => x > 1));`);
    assert.equal(stdout, "false\n");
  });

  it("join() concatenates elements", () => {
    const { stdout } = execGPJ(`console.log(["a", "b", "c"].join("-"));`);
    assert.equal(stdout, "a-b-c\n");
  });

  it("slice() returns sub-array", () => {
    const { stdout } = execGPJ(`
let b = [1, 2, 3, 4, 5].slice(1, 4);
console.log(b[0]);
console.log(b[2]);
`);
    assert.equal(stdout, "2\n4\n");
  });

  it("concat() joins two arrays", () => {
    const { stdout } = execGPJ(`
let c = [1, 2].concat([3, 4]);
console.log(c.length);
console.log(c[3]);
`);
    assert.equal(stdout, "4\n4\n");
  });

  it("reverse() reverses in place", () => {
    const { stdout } = execGPJ(`
let a = [1, 2, 3];
a.reverse();
console.log(a[0]);
console.log(a[2]);
`);
    assert.equal(stdout, "3\n1\n");
  });

  it("flat() flattens one level", () => {
    const { stdout } = execGPJ(`
let a = [[1, 2], [3, 4]].flat();
console.log(a[0]);
console.log(a[3]);
`);
    assert.equal(stdout, "1\n4\n");
  });

  it("flatMap() maps then flattens", () => {
    // [1,2,3].flatMap(x => [x, x*2]) = [1,2, 2,4, 3,6]
    const { stdout } = execGPJ(`
let a = [1, 2, 3].flatMap((x) => [x, x * 2]);
console.log(a[0]);
console.log(a[1]);
console.log(a[3]);
`);
    assert.equal(stdout, "1\n2\n4\n");
  });

  // --- preamble always injected ---

  it("Array preamble always present in codegen output", () => {
    const { js } = runGPJ(`let x = 1;`);
    assert.ok(js.includes("Array.prototype.pop"), `expected Array preamble in: ${js}`);
  });
});
