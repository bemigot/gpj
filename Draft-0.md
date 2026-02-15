# GPJ Language Proposal — DRAFT

*JavaScript, done right.*

*This spec is a working draft. It will be evolved and refined until v0.0.1 is reached.*

## 1. Overview

GPJ is an interpreted, statically-typed language with JavaScript-inspired syntax. Semicolons terminate statements; newlines are whitespace only. A semicolon is not required after a closing `}` that ends a block statement (`function`, `if`/`else`, `for`, `while`, `try`/`catch`); placing one there is accepted but issues a warning. A semicolon is still required when `}` ends an expression within a statement (e.g. object literals, function expressions assigned to a binding). The type system is optional — undeclared types are inferred at parse time.

**Whitespace:** Spaces are mandatory around binary operators (`+`, `-`, `==`, `&&`, etc.), after `{` and before `}` in object literals and blocks, and after `,` in argument/parameter lists. This is enforced by the parser, not a linter.

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

All types have a built-in `toString()` method returning `String`. Default representations: `Number` → `"42"`, `Boolean` → `"true"` / `"false"`, `None` → `"None"`, `Array` → `"[1, 2, 3]"`, `Object` → `"{x: 1, y: 2}"`, `Function` → `"function(...)"`.

Objects may override `toString()` with a custom implementation. If no override is present, the prototype chain is walked until a `toString()` is found — the root `Object` provides the default. This mirrors Java's `Object.toString()` contract.

`toString()` is an **implicit method** — it exists on all values but does not appear in structural type signatures. A type declared as `{x: Number}` has `toString()` available without declaring it. A custom override must be type-compatible: it takes no arguments and returns `String`.

`toString()` is not implicit coercion — it is an explicit protocol invoked by `console.log`, string templating (§1 — not yet specified), and explicit `String()` conversion, never by operators.

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

`None` behavior:

- `None != None` — `None` is not equal to itself. This is a deliberate deviation from JS (`null === null` is `true` in JS). Use `x == None` style checks with caution; test for the presence of a value rather than the absence of one.
- `None` may appear in typed arrays: `Array<Number?>` can contain `None` elements.
- `console.log(None)` prints `"None"` (via `toString()`).
- `None` is a valid `switch` case value.

### 2.4 Type Aliases

```
type Point = {x: Number, y: Number};
type ID = String | Number;
```

## 3. Type System

Static typing, checked at parse time before execution. Inference fills in omitted annotations using standard HM-style local inference.

**No implicit type conversions, ever.** Every operand must already be the expected type. `+` between `Number` and `String` is a type error. When the interpreter cannot unambiguously determine the type or meaning of an instruction, it halts with a diagnostic — it never guesses. Explicit conversion via `String(n)`, `Number(s)`, etc.

### 3.1 `typeof` and Type Narrowing

`typeof expr` returns a `String` at runtime indicating the type of the value:

| Value type | `typeof` result |
|---|---|
| `Number` | `"Number"` |
| `String` | `"String"` |
| `Boolean` | `"Boolean"` |
| `None` | `"None"` |
| `Function` | `"Function"` |
| Any object | `"Object"` |

No JS quirks — `typeof None` is `"None"` (not `"object"`), arrays are `"Object"`.

When a `typeof` check appears in an `if` or `switch` condition, the type checker **narrows** the variable's type in the corresponding branch:

```
function format(v: Number | String): String {
    if (typeof v == "Number") {
        return String(v * 2);    # v is Number here
    } else {
        return v;                # v is String here
    }
}
```

Narrowing also applies to `None` checks on nullable types:

```
function safe(x: Number?): Number {
    if (typeof x == "None") {
        return 0;                # x is None here
    }
    return x;                    # x is Number here
}
```

Prototype identity can be inspected via `Object.getPrototypeOf()` (§7) — `typeof` does not distinguish between different object shapes.

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

`val` makes the *binding* immutable — it cannot be reassigned. The referenced value itself is **not** frozen: properties of objects and elements of arrays bound with `val` can still be mutated. This matches JavaScript `const` semantics.

```
val a = [1, 2, 3];
a.push(4);       # OK — mutating the array value
a = [5, 6];      # ERROR — reassigning the binding
```

No `var`. Lexical scoping only. No hoisting.

## 5. Control Flow

Same as JS: `if`/`else`, `for`, `for...of`, `while`, `do...while`, `switch`, `break`, `continue`, `return`.
Ternary operator works as expected.

`for...of` iterates over `Array<T>` and `String` (over codepoints). No other types are iterable unless a future iteration protocol is introduced.

```
for (let ch of "hello") { console.log(ch); }  # "h", "e", "l", "l", "o"
for (let n of [1, 2, 3]) { console.log(n); }
```

No `for...in` — it walks prototype chains and yields string keys, both of which are error-prone. Use `Object.keys()` + `for...of` instead. `Object.keys(obj)` returns `Array<String>` containing the object's own enumerable property names.

## 6. Functions

```
function greet(name: String): String {
    return "Hello, " + name;
}

let double = (x: Number): Number => x * 2;
```

Closures work as in JS. Closures in loops capture per-iteration bindings — each iteration of a `for` or `for...of` loop creates a fresh scope for its loop variable. No `arguments` object — use rest params.

**Rest parameters** collect trailing arguments into an `Array<T>`:

```
function sum(...nums: Array<Number>): Number {
    let total = 0;
    for (let n of nums) { total = total + n; }
    return total;
}
```

**Spread** expands an iterable in place. Allowed in function calls, array literals, and object literals:

```
let a = [1, 2, 3];
let b = [0, ...a, 4];         # [0, 1, 2, 3, 4]
console.log(...a);             # 1 2 3

let base = {x: 1, y: 2};
let ext = {...base, z: 3};    # {x: 1, y: 2, z: 3}
```

In object spread, later properties override earlier ones (same as JS). Spread is shallow — nested values are not copied.

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

**`this` binding:** In a method call `obj.method()`, `this` is bound to `obj` (the receiver of the dot-call). This is the same as JS call-site binding, with one safeguard: **detaching a method from its receiver is a type error.** A method can only be invoked via dot-call, never extracted as a standalone value.

```
let v = Vec2.create(3, 4);
v.length();            # OK — this is v
let fn = v.length;     # ERROR — cannot detach method from receiver
let fn = () => v.length();  # OK — wrap in a closure instead
```

This eliminates the entire class of JS `this`-detachment bugs while keeping prototype patterns working. Transpiles directly to JS `this` — the safety is enforced at parse time.

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

`Object.create(proto)` returns a type that merges the prototype's own properties with any properties subsequently assigned to the created object. In the example above, `v` has type `{x: Number, y: Number, create: Function, length: Function}` — the type checker sees both the assigned fields and the inherited methods. This may be revisited if transpiler implementation proves problematic.

No `class`, `new`, `extends`, or `super`. Prototype chains are set up explicitly via `Object.create()`.

**Private properties:** Properties prefixed with `_` are private — they can only be accessed from functions defined in the same object literal. This enforces at the language level the convention JS developers already follow.

```
let Counter = {
    create: function(): {count: Function, value: Function} {
        let self = Object.create(Counter);
        self._n = 0;
        return self;
    },
    count: function(): None { this._n = this._n + 1; },  # OK — same object literal
    value: function(): Number { return this._n; }          # OK
};

let c = Counter.create();
c.count();
c._n;  # ERROR — _n is private to Counter
```

*Note: the exact scoping rules for `_` privacy may evolve as real usage experience accumulates.*

## 8. Operators

**No operator precedence.** Expressions combining more than one binary operator must be explicitly parenthesized. This eliminates an entire class of bugs and removes the need for a precedence table.

```
let x = 1 + 2 + 3;        # ERROR — ambiguous grouping
let x = (1 + 2) + 3;      # OK
let x = 1 + (2 + 3);      # OK
let y = a && b || c;       # ERROR
let y = a && (b || c);     # OK
let z = a * b + c;         # ERROR
let z = (a * b) + c;       # OK
```

A single binary operator with no grouping ambiguity needs no parentheses: `a + b`, `x == y`, `p && q` are all valid. Unary operators (`!`, unary `-`) bind to their operand directly and do not require parentheses: `!done`, `-x`, `!(a && b)`.

Arithmetic: `+`, `-`, `*`, `/`, `%`, `**`. Only valid on `Number` (except `+` for `String` concatenation among `String` operands).

Comparison: `==`, `!=` (structural, no coercion). `<`, `>`, `<=`, `>=` for `Number` and short (less than 128 chars) `String`.

For objects, `==` compares own properties only — prototype chains are not walked. Two objects are equal if they have the same set of own property keys and each corresponding value is `==`. This mirrors the structural type system: same shape, same data → equal. Prototype identity can be compared explicitly via `Object.getPrototypeOf()`. Circular references in structural comparison are detected and cause a runtime error.

Logical: `&&`, `||`, `!`. Short-circuit as JS.

No `===`, `!==` (redundant). No bitwise operators (use stdlib if needed).

## 9. Error Handling

`try`/`catch`/`finally` and `throw`, same semantics as JS. Thrown values must structurally match `{message: String}` (i.e. any object with at least a `message` property of type `String`). This guarantees `catch` blocks can always access `e.message`.

The `catch` binding `e` is typed as `{message: String}`. Additional properties from the thrown object exist at runtime but are not accessible without narrowing. To access extra properties, declare a type alias and use a type annotation on the catch binding:

```
type HttpError = {message: String, code: Number};

try {
    throw {message: "not found", code: 404};
} catch (e: HttpError) {
    console.log(e.code);  # 404
}
```

When no annotation is given, `e` defaults to `{message: String}`.

```
throw {message: "something went wrong"};
throw {message: "not found", code: 404};  # additional properties are fine

type ValueError = {message: String, value: Number};
throw {message: "out of range", value: -1};  # matches ValueError
```

## 10. Modules

Only named exports — no `export default`.

```
import foo from "./utils";
import foo, bar from "./utils";
import foo as f, bar as b from "./utils";
import * as u from "./utils";

import NumGPJ as np, Arrays as np.a from "ml.calc";
# np refers to NumGPJ, np.a refers to Arrays

export function baz(): Number { return 1; }
export val PI: Number = 3.14159;
```

No curly braces around imports. Aliasing via `as` — dotted aliases (e.g. `np.a`) attach the import as a property on an existing alias, allowing lightweight namespace grouping. The parent alias must be defined earlier in the same import statement or in a prior import.

ESM-style. No default exports.

**Module resolution:** Import paths are relative to the importing file. A path `"./x"` resolves to `./x.gpj`, or `./x/module.gpj` if `./x` is a directory. Bare names (no `./` or `../` prefix) resolve to standard library modules (e.g. `"fs"`). No search paths, no `node_modules`-style resolution.

```
import foo from "./utils";            # ./utils.gpj or ./utils/module.gpj
import * as h from "../lib/helpers";  # ../lib/helpers.gpj or ../lib/helpers/module.gpj
import * as fs from "fs";            # stdlib
```

## 11. Standard Library

Minimal built-in surface:

- **console** — `console.log` and friends.
- **Math** — standard math functions.
- **JSON** — `JSON.parse`, `JSON.stringify`, plus query/builder helpers (JSONPath or similar — TBD).
- **String** — UTF-8 aware: indexing, slicing, `length` (codepoint count), iteration over codepoints. Standard methods matching JS semantics where applicable.
- **Object** — static methods (all transpile directly to JS equivalents):
  - `Object.create(proto)` — create object with given prototype.
  - `Object.keys(obj): Array<String>` — own enumerable property names.
  - `Object.values(obj): Array<Any>` — own enumerable property values.
  - `Object.entries(obj): Array<Array<Any>>` — key-value pairs as `[String, value]` arrays.
  - `Object.assign(target, ...sources)` — shallow-copy own properties from sources to target. Returns target.
  - `Object.freeze(obj)` — make object immutable (properties cannot be added, removed, or changed). Shallow — nested objects remain mutable. Deep freeze may be added later.
  - `Object.isFrozen(obj): Boolean` — check if object is frozen.
  - `Object.getPrototypeOf(obj)` — get prototype (already referenced in §7, §8).
  - `Object.hasOwn(obj, key: String): Boolean` — check if object has own property.
- **Array** — prototype methods matching JS semantics.
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
3. **Stdlib scope** — which `Array`/`String` methods to include at launch.
4. **Process/eval** — thread model, `eval()` scoping rules, spawn API shape.
5. **JSON query** — JSONPath, dot-path helpers, or something else.
