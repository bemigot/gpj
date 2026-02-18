import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 7 — objects and prototypes", () => {
  // --- object literals ---

  it("empty object literal", () => {
    const { js } = runGPJ("let o = {};");
    assert.ok(js.includes("{"), "expected object literal in output");
  });

  it("object with properties", () => {
    const { stdout } = execGPJ('let o = {x: 1, y: 2}; console.log(o.x, o.y);');
    assert.equal(stdout, "1 2\n");
  });

  it("shorthand property", () => {
    const { stdout } = execGPJ("let x = 10; let o = {x}; console.log(o.x);");
    assert.equal(stdout, "10\n");
  });

  it("nested object", () => {
    const { stdout } = execGPJ('let o = {a: {b: 42}}; console.log(o.a.b);');
    assert.equal(stdout, "42\n");
  });

  it("object with function property", () => {
    const src = `
      let o = {
        greet: function(): String {
          return "hi";
        }
      };
      console.log(o.greet());
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "hi\n");
  });

  // --- dot and bracket access ---

  it("dot access", () => {
    const { stdout } = execGPJ("let o = {x: 5}; console.log(o.x);");
    assert.equal(stdout, "5\n");
  });

  it("bracket access with string key", () => {
    const { stdout } = execGPJ('let o = {x: 5}; console.log(o["x"]);');
    assert.equal(stdout, "5\n");
  });

  it("bracket access with variable key", () => {
    const { stdout } = execGPJ('let o = {x: 5}; let k = "x"; console.log(o[k]);');
    assert.equal(stdout, "5\n");
  });

  it("property assignment on let-bound object", () => {
    const { stdout } = execGPJ("let o = {x: 1}; o.x = 99; console.log(o.x);");
    assert.equal(stdout, "99\n");
  });

  it("add new property to let-bound object", () => {
    const { stdout } = execGPJ("let o = {x: 1}; o.y = 2; console.log(o.y);");
    assert.equal(stdout, "2\n");
  });

  // --- val freeze on objects ---

  it("val object is frozen — property assignment throws", () => {
    const { stderr, exitCode } = execGPJ("val o = {x: 1}; o.x = 99;");
    assert.notEqual(exitCode, 0);
    assert.ok(stderr.includes("TypeError"), "expected TypeError for frozen object mutation");
  });

  it("val object is frozen — adding property throws", () => {
    const { stderr, exitCode } = execGPJ("val o = {x: 1}; o.y = 2;");
    assert.notEqual(exitCode, 0);
    assert.ok(stderr.includes("TypeError"), "expected TypeError for adding to frozen object");
  });

  it("val freeze is shallow — nested object is mutable", () => {
    const src = `
      val outer = {inner: {x: 1}};
      outer.inner.x = 2;
      console.log(outer.inner.x);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "2\n");
  });

  it("val emits Object.freeze in codegen", () => {
    const { js } = runGPJ("val o = {x: 1};");
    assert.ok(js.includes("Object.freeze"), "expected Object.freeze for val object");
  });

  // --- this ---

  it("this in method call", () => {
    const src = `
      let obj = {
        x: 10,
        getX: function(): Number {
          return this.x;
        }
      };
      console.log(obj.getX());
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "10\n");
  });

  it("this with multiple methods", () => {
    const src = `
      let counter = {
        n: 0,
        inc: function() {
          this.n = this.n + 1;
        },
        getN: function(): Number {
          return this.n;
        }
      };
      counter.inc();
      counter.inc();
      counter.inc();
      console.log(counter.getN());
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "3\n");
  });

  it("this emits JS this", () => {
    const src = `
      let o = {
        f: function() { return this.x; }
      };
    `;
    const { js } = runGPJ(src);
    assert.ok(js.includes("this.x"), "expected this.x in output");
  });

  // --- Object.create and prototypes ---

  it("Object.create sets up prototype chain", () => {
    const src = `
      let proto = {
        greet: function(): String {
          return "hello";
        }
      };
      let child = Object.create(proto);
      console.log(child.greet());
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "hello\n");
  });

  it("Object.create with method using this", () => {
    const src = `
      let Vec2 = {
        create: function(x: Number, y: Number) {
          let self = Object.create(Vec2);
          self.x = x;
          self.y = y;
          return self;
        },
        sum: function(): Number {
          return this.x + this.y;
        }
      };
      let v = Vec2.create(3, 4);
      console.log(v.sum());
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "7\n");
  });

  it("prototype method sees instance properties via this", () => {
    const src = `
      let Animal = {
        create: function(name: String) {
          let self = Object.create(Animal);
          self.name = name;
          return self;
        },
        speak: function(): String {
          return this.name + " speaks";
        }
      };
      let a = Animal.create("Dog");
      let b = Animal.create("Cat");
      console.log(a.speak());
      console.log(b.speak());
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "Dog speaks\nCat speaks\n");
  });

  it("child overrides parent method", () => {
    const src = `
      let Base = {
        kind: function(): String { return "base"; }
      };
      let child = Object.create(Base);
      child.kind = function(): String { return "child"; };
      console.log(child.kind());
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "child\n");
  });

  // --- Object.keys / values / entries ---

  it("Object.keys returns own property names", () => {
    const src = `
      let o = {a: 1, b: 2, c: 3};
      let keys = Object.keys(o);
      for (let k of keys) { console.log(k); }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "a\nb\nc\n");
  });

  it("Object.values returns own property values", () => {
    const src = `
      let o = {a: 1, b: 2, c: 3};
      let vals = Object.values(o);
      for (let v of vals) { console.log(v); }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1\n2\n3\n");
  });

  it("Object.entries returns key-value pairs", () => {
    const src = `
      let o = {x: 10, y: 20};
      let entries = Object.entries(o);
      for (let e of entries) { console.log(e[0], e[1]); }
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "x 10\ny 20\n");
  });

  // --- Object.assign ---

  it("Object.assign copies properties", () => {
    const src = `
      let a = {x: 1};
      let b = {y: 2};
      let c = Object.assign(a, b);
      console.log(c.x, c.y);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "1 2\n");
  });

  it("Object.assign mutates target", () => {
    const src = `
      let target = {x: 1};
      Object.assign(target, {y: 2});
      console.log(target.y);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "2\n");
  });

  // --- Object.freeze / Object.isFrozen ---

  it("Object.freeze on let-bound object", () => {
    const { stderr, exitCode } = execGPJ("let o = {x: 1}; Object.freeze(o); o.x = 99;");
    assert.notEqual(exitCode, 0);
    assert.ok(stderr.includes("TypeError"));
  });

  it("Object.isFrozen returns true for frozen object", () => {
    const { stdout } = execGPJ("val o = {x: 1}; console.log(Object.isFrozen(o));");
    assert.equal(stdout, "true\n");
  });

  it("Object.isFrozen returns false for unfrozen object", () => {
    const { stdout } = execGPJ("let o = {x: 1}; console.log(Object.isFrozen(o));");
    assert.equal(stdout, "false\n");
  });

  // --- Object.hasOwn ---

  it("Object.hasOwn detects own property", () => {
    const { stdout } = execGPJ('let o = {x: 1}; console.log(Object.hasOwn(o, "x"));');
    assert.equal(stdout, "true\n");
  });

  it("Object.hasOwn returns false for missing property", () => {
    const { stdout } = execGPJ('let o = {x: 1}; console.log(Object.hasOwn(o, "y"));');
    assert.equal(stdout, "false\n");
  });

  it("Object.hasOwn returns false for inherited property", () => {
    const src = `
      let proto = {a: 1};
      let child = Object.create(proto);
      console.log(Object.hasOwn(child, "a"));
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "false\n");
  });

  // --- Object.getPrototypeOf ---

  it("Object.getPrototypeOf returns the prototype", () => {
    const src = `
      let proto = {x: 1};
      let child = Object.create(proto);
      console.log(Object.getPrototypeOf(child) == proto);
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "true\n");
  });

  // --- combined: factory pattern ---

  it("factory pattern with multiple instances", () => {
    const src = `
      let Point = {
        create: function(x: Number, y: Number) {
          let self = Object.create(Point);
          self.x = x;
          self.y = y;
          return self;
        },
        toString: function(): String {
          return "(" + String(this.x) + ", " + String(this.y) + ")";
        }
      };
      let p1 = Point.create(1, 2);
      let p2 = Point.create(3, 4);
      console.log(p1.toString());
      console.log(p2.toString());
    `;
    const { stdout } = execGPJ(src);
    assert.equal(stdout, "(1, 2)\n(3, 4)\n");
  });
});
