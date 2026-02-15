# GPJ Language Proposal — DRAFT

*JavaScript, done right.*

*This spec is a working draft. It will be evolved and refined until v0.0.1 is reached.*

## 1. Overview

GPJ is an interpreted, statically-typed language with JavaScript-inspired syntax. Semicolons terminate statements; newlines are whitespace only. A semicolon is not required after a closing `}` that ends a block statement (`function`, `if`/`else`, `for`, `while`, `try`/`catch`). It is still required when `}` ends an expression within a statement (e.g. object literals, function expressions assigned to a binding). The type system is optional — undeclared types are inferred at parse time.

The first `gpj` prototype is a GPJ-to-JavaScript transpiler — GPJ semantics map nearly directly to JS, with targeted deviations where JS got it wrong (e.g. `None != None`, structural equality, no implicit coercion). This keeps the implementation simple while the language design stabilizes.

The `gpj` interpreter operates as a primitive interactive REPL and as a script runner. Scripts use `#` for end-of-line comments, so the standard shebang works:

```
#!/bin/env gpj
let x = 42;  # this is a comment. Two spaces before '#' is the recommended style
```

Currently implemented I/O is limited to:

- `console.log(...)` — prints arguments space-separated, calling `.toString()` on each. E.g. `console.log(1, 2.3, "let's go");`
- Module `import` — file-based module loading.

String templating, `fs`, and other I/O are not yet specified.

## 2. Types

### 2.1 Primitives

`String` (UTF-8), `Number` (IEEE 754 float64), `Boolean`, `None`.

No BigInt a.t.m.

All types have a built-in `toString()` method returning `String`. Default representations: `Number` → `"42"`, `Boolean` → `"true"` / `"false"`, `None` → `"None"`, `Array` → `"[1, 2, 3]"`, `Object` → `"{x: 1, y: 2}"`, `Function` → `"function(...)"`. Objects may override `toString()` with a custom implementation. This is not implicit coercion — `toString()` is an explicit protocol invoked by `console.log`, string templating, and explicit `String()` conversion, never by operators.

### 2.2 Compound Types

`Object`, `Array<T>`, `Function`. `Object` is the top type for non-primitives — it means "any object." No properties can be accessed on a bare `Object` without a type error; use structural types or type aliases to describe specific shapes. Arrays are typed and homogeneous by default.

```
let a: Array<Number> = [1, 2, 3];
let b = [1, 2, 3];              # inferred Array<Number>
let c: Array<Number | String> = [1, "two"];  # union required for mixed
```

Objects use structural typing:

```
let p: {x: Number, y: Number} = {x: 1, y: 2};
let q = {x: 1, y: 2};          # inferred
```

### 2.3 Union and Nullable

```
let v: Number | String = 42;
let n: Number? = None;           # sugar for Number | None
```

`None` is a type and a value representing the intentional absence of a value. A variable of type `T` cannot hold `None` unless declared `T | None` or `T?`. Uninitialized `let` declarations without annotation are not permitted — all variables must be explicitly initialized.

### 2.4 Type Aliases

```
type Point = {x: Number, y: Number};
type ID = String | Number;
```

## 3. Type System

Static typing, checked at parse time before execution. Inference fills in omitted annotations using standard HM-style local inference.

**No implicit type conversions, ever.** Every operand must already be the expected type. `+` between `Number` and `String` is a type error. When the interpreter cannot unambiguously determine the type or meaning of an instruction, it halts with a diagnostic — it never guesses. Explicit conversion via `String(n)`, `Number(s)`, etc.

```
let x = 42;            # inferred Number
let y: String = "hi";  # annotated
x = "hello";           # ERROR: type mismatch
```

Function signatures:

```
function add(a: Number, b: Number): Number {
    return a + b;
}

let f = (x) => x + 1;  # inferred (Number) => Number from usage —
                       # error if ambiguous
```

## 4. Declarations

```
let x = 10;  # mutable
val y = 20;  # immutable binding
```

No `var`. Lexical scoping only. No hoisting.

## 5. Control Flow

Same as JS: `if`/`else`, `for`, `for...of`, `while`, `do...while`, `switch`, `break`, `continue`, `return`.
Ternary operator works as expected.

No `for...in` (use `Object.keys()` + `for...of`).

## 6. Functions

```
function greet(name: String): String {
    return "Hello, " + name;
}

let double = (x: Number): Number => x * 2;
```

Closures work as in JS. Closures in loops capture per-iteration bindings — each iteration of a `for` or `for...of` loop creates a fresh scope for its loop variable. No `arguments` object — use rest params:

```
function sum(...nums: Array<Number>): Number {
    let total = 0;
    for (let n of nums) { total = total + n; }
    return total;
}
```

Functions without an explicit `return` (or with a bare `return;`) return `None`. The return type of such functions is `None` and may be omitted:

```
function greetPrint(name: String) {
    console.log("Hello, " + name);
}
# equivalent to: function greetPrint(name: String): None { ... }
```

No `async`/`await`. No generators. No Promises as a language primitive.

## 7. Objects and Prototypes

Object literals, dot access, bracket access, computed properties — all as JS. Prototypal inheritance via `Object.create()`. No `class` syntax sugar.

```
type Vec2Instance = {x: Number, y: Number};

let Vec2 = {
    create: function(x: Number, y: Number): Vec2Instance {
        let self = Object.create(Vec2);
        self.x = x;
        self.y = y;
        return self;
    },
    length: function(): Number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
};

let v = Vec2.create(3, 4);
console.log(v.length());  # 5
```

No `class`, `new`, `extends`, or `super`. Prototype chains are set up explicitly via `Object.create()`. No `#private` fields — use naming convention or closures.

## 8. Operators

Arithmetic: `+`, `-`, `*`, `/`, `%`, `**`. Only valid on `Number` (except `+` for `String` concatenation among `String` operands).

Comparison: `==`, `!=` (structural, no coercion). `<`, `>`, `<=`, `>=` for `Number` and short (less than 128 chars) `String`.

For objects, `==` compares own properties only — prototype chains are not walked. Two objects are equal if they have the same set of own property keys and each corresponding value is `==`. This mirrors the structural type system: same shape, same data → equal. Prototype identity can be compared explicitly via `Object.getPrototypeOf()`. Circular references in structural comparison are detected and cause a runtime error.

Logical: `&&`, `||`, `!`. Short-circuit as JS.

No `===`, `!==` (redundant). No bitwise operators (use stdlib if needed).

## 9. Error Handling

`try`/`catch`/`finally` and `throw`, same semantics as JS. Thrown values must structurally match `{message: String}` (i.e. any object with at least a `message` property of type `String`). This guarantees `catch` blocks can always access `e.message`.

```
throw {message: "something went wrong"};
throw {message: "not found", code: 404};  # additional properties are fine

type ValueError = {message: String, value: Number};
throw {message: "out of range", value: -1};  # matches ValueError
```

## 10. Modules

Only named exports — no `export default`.

```
import {foo, bar} from "module";
import * as m from "module";
export function baz(): Number { return 1; }
export val PI: Number = 3.14159;
```

ESM-style only. No CommonJS. No default exports.

## 11. Standard Library

Minimal built-in surface:

- **console** — `console.log` and friends.
- **Math** — standard math functions.
- **JSON** — `JSON.parse`, `JSON.stringify`, plus query/builder helpers (JSONPath or similar — TBD).
- **String** — UTF-8 aware: indexing, slicing, `length` (codepoint count), iteration over codepoints. Standard methods matching JS semantics where applicable.
- **Array / Object** — prototype methods matching JS semantics.
- **fs** — filesystem I/O module, Node.js `fs`-style API (sync). `import * as fs from "fs";`
- **process** — `eval()`, thread spawn/stop/join, environment access. Semantics TBD.

No DOM.

## 12. Deliberate Omissions

| Feature | Rationale |
|---|---|
| BigInt, Symbol | Scope reduction |
| async/await, Promises | No concurrency model |
| `var`, hoisting | Lexical scoping only |
| `undefined`, `null` | Single absent-value type `None`; no JS dual-null confusion |
| Implicit coercion | Strict static types; interpreter halts on ambiguity |
| `===` / `!==` | No coercion means `==` is already strict |
| Bitwise operators | Niche; stdlib candidate |
| `for...in` | Confusing semantics in JS; `Object.keys()` suffices |
| `class`, `new`, `extends`, `super` | Explicit prototypes via `Object.create()` suffice |
| `export default` | Named exports only; avoids ambiguity |
| Destructuring | Deferred to a future revision |

## 13. Open Questions

1. **Generics beyond Array** — should functions support `<T>` parameters?
2. **Interface keyword** — structural types via alias suffice, but explicit `interface` may aid readability.
3. **Narrowing** — should `typeof` checks narrow union types in branches (as TypeScript does)?
4. **Stdlib scope** — which `Array`/`String` methods to include at launch.
5. **Process/eval** — thread model, `eval()` scoping rules, spawn API shape.
6. **JSON query** — JSONPath, dot-path helpers, or something else.
