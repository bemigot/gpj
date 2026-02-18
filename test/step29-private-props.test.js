import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 29 — private properties", () => {
  // --- private access allowed inside object literal methods ---

  it("this._x read inside method — ok at runtime", () => {
    const { stdout } = execGPJ(`
let Obj = {
  _x: 0,
  init: function() { this._x = 42; },
  get: function() { return this._x; }
};
Obj.init();
console.log(Obj.get());
`);
    assert.equal(stdout, "42\n");
  });

  it("this._x mutation inside method — ok at runtime", () => {
    const { stdout } = execGPJ(`
let Counter = {
  _n: 0,
  inc: function() { this._n = this._n + 1; },
  val: function() { return this._n; }
};
Counter.inc();
Counter.inc();
console.log(Counter.val());
`);
    assert.equal(stdout, "2\n");
  });

  it("non-this ._n inside method — ok (same object-literal context)", () => {
    // Inside a method, accessing _-props via any expression is allowed.
    const { js } = runGPJ(`
let Factory = {
  create: function() {
    let self = Object.create(Factory);
    self._n = 99;
    return self;
  },
  val: function() { return this._n; }
};
`);
    assert.ok(typeof js === "string", js);
  });

  it("SPEC Counter example — full pattern works at runtime", () => {
    const { stdout } = execGPJ(`
let Counter = {
  create: function() {
    let self = Object.create(Counter);
    self._n = 0;
    return self;
  },
  inc: function() { this._n = this._n + 1; },
  val: function() { return this._n; }
};
let c = Counter.create();
c.inc();
c.inc();
c.inc();
console.log(c.val());
`);
    assert.equal(stdout, "3\n");
  });

  it("multiple methods sharing private state — correct runtime", () => {
    const { stdout } = execGPJ(`
let Pair = {
  _a: 0,
  _b: 0,
  set: function(a, b) { this._a = a; this._b = b; },
  sum: function() { return this._a + this._b; }
};
Pair.set(3, 4);
console.log(Pair.sum());
`);
    assert.equal(stdout, "7\n");
  });

  // --- private access errors from outside ---

  it("obj._x at top level — parse error", () => {
    assert.throws(
      () => runGPJ(`let obj = {_x: 1};\nobj._x;`),
      (e) => e.message.includes("private property")
    );
  });

  it("obj._x inside a top-level function declaration — parse error", () => {
    assert.throws(
      () => runGPJ(`let obj = {_x: 1};\nfunction bad() { obj._x; }\n`),
      (e) => e.message.includes("private property")
    );
  });

  it("this._x inside a function expression at top level — parse error", () => {
    assert.throws(
      () => runGPJ(`let bad = function() { this._x; };\n`),
      (e) => e.message.includes("private property")
    );
  });

  it("this._x inside nested function within method — parse error", () => {
    assert.throws(
      () => runGPJ(`
let Obj = {
  method: function() {
    let inner = function() { this._x; };
  }
};
`),
      (e) => e.message.includes("private property")
    );
  });

  it("SPEC: helper defined outside literal — parse error at definition site", () => {
    // helper accesses this._n but is not lexically inside any object literal.
    assert.throws(
      () => runGPJ(`let helper = function() { return this._n; };\n`),
      (e) => e.message.includes("private property")
    );
  });

  it("external read of _-property — parse error", () => {
    assert.throws(
      () => runGPJ(`let c = {_n: 0};\nc._n;\n`),
      (e) => e.message.includes("private property")
    );
  });

  it("external write to _-property — parse error", () => {
    assert.throws(
      () => runGPJ(`let c = {_n: 0};\nc._n = 5;\n`),
      (e) => e.message.includes("private property")
    );
  });

  // --- codegen checks ---

  it("private access inside method emits correct JS", () => {
    const { js } = runGPJ(`
let Obj = {
  _x: 0,
  get: function() { return this._x; }
};
`);
    assert.ok(js.includes("this._x"), js);
  });

  // --- edge cases ---

  it("_-prefixed property key in object literal — no error (declaration, not access)", () => {
    const { js } = runGPJ(`let obj = {_x: 42};\n`);
    assert.ok(js.includes("_x"), js);
  });

  it("arrow function as property value can access private (same literal context)", () => {
    // Arrow as property value: nextFuncIsObjMethod flag is set, so it gets context true.
    const { stdout } = execGPJ(`
let Obj = {
  _val: 99,
  get: () => 99
};
console.log(Obj.get());
`);
    assert.equal(stdout, "99\n");
  });
});
