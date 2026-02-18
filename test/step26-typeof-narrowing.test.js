import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGPJ, execGPJ } from "./helpers.js";

describe("step 26 — typeof narrowing", () => {
  // --- if-branch narrowing: union ---

  it("Number | String narrowed to Number in if-branch — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ('let v: Number | String = 42; if (typeof v == "Number") { let n: Number = v; }')
    );
  });

  it("Number | String narrowed to String in if-branch — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ('let v: Number | String = "hi"; if (typeof v == "String") { let s: String = v; }')
    );
  });

  it("Number | String | Boolean narrowed to Boolean in if-branch — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ(
        'let v: Number | String | Boolean = true; if (typeof v == "Boolean") { let b: Boolean = v; }'
      )
    );
  });

  // --- if-branch narrowing: nullable ---

  it("Number? narrowed to Number in if-branch — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ('let n: Number? = 42; if (typeof n == "Number") { let x: Number = n; }')
    );
  });

  it("Number? narrowed to None in if-branch — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ('let n: Number? = None; if (typeof n == "None") { let x: None = n; }')
    );
  });

  // --- else-branch remainder narrowing ---

  it("Number | String; narrow to Number — else-branch has String — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ(
        'let v: Number | String = "hi"; if (typeof v == "Number") { } else { let s: String = v; }'
      )
    );
  });

  it("Number | String; narrow to String — else-branch has Number — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ(
        'let v: Number | String = 42; if (typeof v == "String") { } else { let n: Number = v; }'
      )
    );
  });

  it("Number? narrow to Number — else-branch has None — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ('let n: Number? = None; if (typeof n == "Number") { } else { let x: None = n; }')
    );
  });

  it("Number? narrow to None — else-branch has Number — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ('let n: Number? = 42; if (typeof n == "None") { } else { let x: Number = n; }')
    );
  });

  // --- != operator (negated guard) ---

  it("typeof v != String; then-branch has Number for Number | String — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ(
        'let v: Number | String = 42; if (typeof v != "String") { let n: Number = v; }'
      )
    );
  });

  it("typeof v != Number; then-branch has String for Number | String — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ(
        'let v: Number | String = "hi"; if (typeof v != "Number") { let s: String = v; }'
      )
    );
  });

  // --- reversed guard: "TypeName" == typeof x ---

  it("String-reversed guard: \"Number\" == typeof v — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ('let v: Number | String = 42; if ("Number" == typeof v) { let n: Number = v; }')
    );
  });

  // --- switch narrowing ---

  it("switch(typeof v) narrows in each case — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ(`let v: Number | String = 42;
switch (typeof v) {
  case "Number": let n: Number = v;
  case "String": let s: String = v;
}`)
    );
  });

  it("switch(typeof v) narrows Number? — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ(`let n: Number? = 42;
switch (typeof n) {
  case "Number": let x: Number = n;
  case "None": let y: None = n;
}`)
    );
  });

  // --- chained else-if narrowing ---

  it("chained else-if progressively narrows Number | String | Boolean — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ(`let v: Number | String | Boolean = 42;
if (typeof v == "Number") {
  let n: Number = v;
} else if (typeof v == "String") {
  let s: String = v;
} else {
  let b: Boolean = v;
}`)
    );
  });

  // --- function using typeof narrowing ---

  it("function with typeof guard returns correct type — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ(`function f(v: Number | String): Number {
  if (typeof v == "Number") {
    return v;
  } else {
    return 0;
  }
}`)
    );
  });

  it("function with typeof guard on nullable — ok", () => {
    assert.doesNotThrow(() =>
      runGPJ(`function safe(x: Number?): Number {
  if (typeof x == "None") {
    return 0;
  } else {
    return x;
  }
}`)
    );
  });

  // --- runtime behaviour ---

  it("narrowed branch executes at runtime — Number arm", () => {
    const { stdout } = execGPJ(`let v: Number | String = 42;
if (typeof v == "Number") {
  console.log("number");
} else {
  console.log("string");
}`);
    assert.equal(stdout, "number\n");
  });

  it("else branch executes for non-matching type at runtime", () => {
    const { stdout } = execGPJ(`let v: Number | String = "hello";
if (typeof v == "Number") {
  console.log("number");
} else {
  console.log("string");
}`);
    assert.equal(stdout, "string\n");
  });

  it("switch typeof at runtime — Number case fires", () => {
    const { stdout } = execGPJ(`let v: Number | String = 42;
let result = "none";
switch (typeof v) {
  case "Number": result = "number"; break;
  case "String": result = "string"; break;
}
console.log(result);`);
    assert.equal(stdout, "number\n");
  });

  it("switch typeof at runtime — String case fires", () => {
    const { stdout } = execGPJ(`let v: Number | String = "hi";
let result = "none";
switch (typeof v) {
  case "Number": result = "number"; break;
  case "String": result = "string"; break;
}
console.log(result);`);
    assert.equal(stdout, "string\n");
  });

  // --- type errors: wrong type inside narrowed branch ---

  it("narrowed to Number — assign to String inside if — type error", () => {
    assert.throws(
      () =>
        runGPJ(
          'let v: Number | String = 42; if (typeof v == "Number") { let s: String = v; }'
        ),
      /type mismatch/
    );
  });

  it("narrowed to String — assign to Number inside if — type error", () => {
    assert.throws(
      () =>
        runGPJ(
          'let v: Number | String = "hi"; if (typeof v == "String") { let n: Number = v; }'
        ),
      /type mismatch/
    );
  });

  // --- type errors: wrong type in else (remainder) branch ---

  it("else-branch has String — assign to Number — type error", () => {
    assert.throws(
      () =>
        runGPJ(
          'let v: Number | String = "hi"; if (typeof v == "String") { } else { let s: String = v; }'
        ),
      /type mismatch/
    );
  });

  it("else-branch has Number — assign to String — type error", () => {
    assert.throws(
      () =>
        runGPJ(
          'let v: Number | String = 42; if (typeof v == "Number") { } else { let n: Number = v; }'
        ),
      /type mismatch/
    );
  });

  it("Number? narrowed to Number — assign to None inside if — type error", () => {
    assert.throws(
      () => runGPJ('let n: Number? = 42; if (typeof n == "Number") { let x: None = n; }'),
      /type mismatch/
    );
  });

  it("Number? narrowed to None — assign to Number inside if — type error", () => {
    assert.throws(
      () => runGPJ('let n: Number? = None; if (typeof n == "None") { let x: Number = n; }'),
      /type mismatch/
    );
  });
});
