# GPJ Language Proposal — DRAFT

*JavaScript, done right.*

*This spec is a working draft. It will be evolved and refined until v0.0.1 is reached.*

## 1. Overview

GPJ is an interpreted, statically-typed language with JavaScript-inspired syntax. Semicolons terminate statements; newlines are whitespace only. A semicolon is not required after a closing `}` that ends a block statement (`function`, `if`/`else`, `for`, `while`, `try`/`catch`); placing one there is accepted but issues a warning. A semicolon is still required when `}` ends an expression within a statement (e.g. object literals, function expressions assigned to a binding). The type system is optional — undeclared types are inferred at parse time.

**Whitespace:** Spaces are mandatory around binary operators (`+`, `-`, `==`, `&&`, etc.), after `{` and before `}` in object literals and blocks, and after `,` in argument/parameter lists. This rule applies only to binary operators — bracket access (`a[0]`, `a[i]`) requires no inner spaces. This is enforced by the parser, not a linter.

The first `gpj` prototype is a GPJ-to-JavaScript transpiler — GPJ semantics map nearly directly to JS, with targeted deviations where JS got it wrong (e.g. structural equality, no implicit coercion, unified `None`). This keeps the implementation simple while the language design stabilizes.

The `gpj` interpreter operates as a primitive interactive REPL and as a script runner. Scripts use `#` for end-of-line comments, so the standard shebang works. `#` inside string literals is not treated as a comment — the lexer only recognizes `#` as a comment start outside of quoted strings.

```
#!/bin/env gpj
let x = 42;  # this is a comment. Two spaces before '#' is the recommended style
val s = 'I mean # is totally OK in string literals.';  # comment starts here
```

Currently implemented I/O is limited to:

- `console.log(...)` — prints to stdout, arguments space-separated, calling `.toString()` on each. E.g. `console.log(1, 2.3, "let's go");`
- `console.error(...)` — same as `console.log`, but prints to stderr.
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

`Object`, `Array<T>`, `Tuple`, `Map<K, V>`, `Set<T>`, `Function`, `Unknown`. `Object` is the top type for non-primitives — it means "any object." No properties can be accessed on a bare `Object` without a type error; use structural types or type aliases to describe specific shapes. Arrays are typed and homogeneous by default.

`Unknown` is the safe top type — any value can be assigned to `Unknown`, but no operations are permitted on it without first narrowing via `typeof` (§3.1). There is no `Any` type. This forces explicit type checks before use, consistent with GPJ's no-ambiguity principle.

```
let x: Unknown = 42;          # OK — any value can be assigned
x + 1;                         # ERROR — cannot operate on Unknown
if (typeof x == "Number") {
    x + 1;                     # OK — narrowed to Number
}
```

*Post-v0.1 consideration: generics (`<T>`) may replace most uses of `Unknown` in stdlib signatures, making them fully type-safe without narrowing.*

```
let a: Array<Number> = [1, 2, 3];
let b = [1, 2, 3];              # inferred Array<Number>
let c: Array<Number | String> = [1, "two"];  # union required for mixed
```

**Tuples** are fixed-length, heterogeneously-typed sequences. The type is written as a comma-separated list in square brackets:

```
let t: [String, Number] = ["age", 30];
let first = t[0];                # String
let second = t[1];               # Number
t[2];                            # ERROR — index out of bounds
```

`Pair<K, V>` is a built-in alias for `[K, V]`:

```
type Pair<K, V> = [K, V];
let entry: Pair<String, Number> = ["x", 42];
```

Tuples are immutable in length — elements cannot be added or removed. Element values can be reassigned if the binding is `let`. Tuples transpile to plain JS arrays.

**Map<K, V>** is a typed key-value collection. Unlike objects-as-dictionaries, keys can be any type and lookup is based on deep equality (`==`). Maps maintain insertion order.

```
let m: Map<String, Number> = Map.of(["x", 1], ["y", 2]);
m.get("x");                    # 1
m.set("z", 3);
m.has("y");                    # true
m.delete("x");
m.size;                        # 2

for (let [key, value] of m) { console.log(key, value); }
```

Map methods: `get(key): V?`, `set(key, value): None`, `has(key): Boolean`, `delete(key): Boolean`, `clear(): None`, `size: Number`, `keys(): Array<K>`, `values(): Array<V>`, `entries(): Array<Pair<K, V>>`. Maps are iterable via `for...of`, yielding `Pair<K, V>`.

**Set<T>** is a typed collection of unique values. Uniqueness is based on deep equality (`==`). Sets maintain insertion order.

```
let s: Set<Number> = Set.of(1, 2, 3);
s.add(4);
s.add(2);                     # no effect — already present
s.has(3);                     # true
s.delete(1);
s.size;                       # 3

for (let n of s) { console.log(n); }
```

Set methods: `add(value): None`, `has(value): Boolean`, `delete(value): Boolean`, `clear(): None`, `size: Number`, `values(): Array<T>`. Sets are iterable via `for...of`, yielding `T`.

Both `Map` and `Set` transpile to JS `Map` and `Set`, with the equality helper used for non-primitive keys/values.

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

- `None == None` — `None` is equal to itself. `x == None` is a valid way to test for absence.
- `None` may appear in typed arrays: `Array<Number?>` can contain `None` elements.
- `console.log(None)` prints `"None"` (via `toString()`).
- `None` is a valid `switch` case value.

### 2.4 Type Aliases

```
type Point = {x: Number, y: Number};
type ID = String | Number;
```

## 3. Type System

Static typing, checked at parse time before execution. Inference fills in omitted annotations using standard HM-style **local inference** — types are inferred within function bodies, but function signatures serve as explicit type boundaries. Parameters and return types on exported or public functions must be annotated; the compiler does not infer types across function call sites. This ensures errors are reported where they originate, not in distant code.

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

`val` makes the binding immutable **and** shallow-freezes the value. Properties of objects and elements of arrays bound with `val` cannot be mutated. `let` leaves both the binding and value mutable.

```
val p = {x: 1, y: 2};
p.x = 3;        # ERROR — value is frozen
p = {x: 3};     # ERROR — binding is immutable

let q = {x: 1, y: 2};
q.x = 3;        # OK — mutable value
q = {x: 3};     # OK — mutable binding

val a = [1, 2, 3];
a.push(4);       # ERROR — value is frozen
a[0] = 9;        # ERROR — value is frozen
a = [5, 6];      # ERROR — binding is immutable
```

Freeze is shallow — nested objects inside a `val` binding are not frozen unless themselves bound with `val`. Use `Object.freeze()` to explicitly freeze a `let`-bound value or to deep-freeze nested structures.

```
val outer = {inner: {x: 1}};
outer.inner = {x: 2};          # ERROR — outer is frozen
outer.inner.x = 2;             # OK — inner is not frozen (shallow)

val deep = {inner: Object.freeze({x: 1})};
deep.inner.x = 2;              # ERROR — inner explicitly frozen
```

For primitives (`Number`, `String`, `Boolean`, `None`), `val` and `let` differ only in rebinding — primitive values are inherently immutable.

No `var`. Lexical scoping only. No hoisting.

### 4.1 Destructuring

Destructuring extracts values from objects, arrays, and tuples into bindings. Works with both `let` and `val`.

**Object destructuring:**

```
let point = {x: 1, y: 2, z: 3};
let {x, y} = point;               # x = 1, y = 2
val {x: px, y: py} = point;       # rename: px = 1, py = 2
let {x, ...rest} = point;         # x = 1, rest = {y: 2, z: 3}
```

**Array and tuple destructuring:**

```
let arr = [1, 2, 3, 4];
let [first, second] = arr;        # first = 1, second = 2
let [head, ...tail] = arr;        # head = 1, tail = [2, 3, 4]

let entry: Pair<String, Number> = ["x", 42];
let [key, value] = entry;         # key = "x", value = 42
```

**Function parameters:**

```
function distance({x: Number, y: Number}): Number {
    return Math.sqrt((x * x) + (y * y));
}

function first([head, ...tail]: Array<Number>): Number {
    return head;
}
```

**Nested destructuring:**

```
let data = {pos: {x: 1, y: 2}, name: "origin"};
let {pos: {x, y}, name} = data;   # x = 1, y = 2, name = "origin"
```

All destructured bindings are type-checked — mismatches are a compile error. Missing properties on object destructuring are an error unless the type is nullable. Destructuring transpiles directly to JS destructuring.

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

**`this` binding:** In a method call `obj.method()`, `this` is bound to `obj` (the receiver). **Methods must be called immediately when accessed** — accessing a method via dot notation without calling it is a parse error. This is a simple syntactic rule: if a dot-access resolves to a function, `()` must follow.

```
let v = Vec2.create(3, 4);
v.length();                 # OK — accessed and called
let fn = v.length;          # ERROR — accessed but not called
someFunc(v.length);         # ERROR — same rule
let fn = () => v.length();  # OK — closure calls the method itself
```

Transpiles directly to JS `this` — the safety is enforced at parse time, zero runtime cost.

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

**Private properties:** Properties prefixed with `_` are private. Access via `this._x` is allowed only inside functions that are **lexically defined within the same object literal** where `_x` is declared. This is a purely syntactic rule — the parser checks which `{ }` a function was written inside. No runtime cost.

```
let Counter = {
    create: function(): {count: Function, value: Function} {
        let self = Object.create(Counter);
        self._n = 0;
        return self;
    },
    count: function(): None { this._n = this._n + 1; },  # OK — same literal as _n
    value: function(): Number { return this._n; }          # OK — same literal as _n
};

let c = Counter.create();
c.count();
c._n;  # ERROR — _n is private to Counter
```

Functions defined outside the literal cannot access `_` properties, even if assigned as methods:

```
let helper = function(): Number { return this._n; };  # ERROR — _n not visible here
let Broken = {
    _n: 0,
    getValue: helper   # helper cannot access _n
};
```

Child objects created via `Object.create(Counter)` inherit methods like `count` — those methods retain access to `_` properties because they were lexically defined in the Counter literal.

## 8. Operators

**No operator precedence.** Expressions combining *different* binary operators must be explicitly parenthesized. This eliminates an entire class of bugs and removes the need for a precedence table. Chaining the *same* operator is allowed and groups left-to-right (left-associative).

```
let x = 1 + 2 + 3;        # OK — same operator, left-associative: (1 + 2) + 3
let s = "a" + "b" + "c";  # OK — same operator: ("a" + "b") + "c"
let y = a && b && c;       # OK — same operator: (a && b) && c
let z = a * b + c;         # ERROR — different operators, ambiguous
let z = (a * b) + c;       # OK
let w = a && b || c;       # ERROR — different operators
let w = a && (b || c);     # OK
let v = a == b == c;       # ERROR — chaining comparison is not meaningful
```

A single binary operator needs no parentheses: `a + b`, `x == y`, `p && q`. Unary operators (`!`, unary `-`) bind to their operand directly and do not require parentheses: `!done`, `-x`, `!(a && b)`.

**Exception:** comparison operators (`==`, `!=`, `<`, `>`, `<=`, `>=`) cannot be chained — `a == b == c` is always an error. Comparisons return `Boolean`, so chaining them is almost certainly a bug.

Arithmetic: `+`, `-`, `*`, `/`, `%`, `**`. Only valid on `Number` (except `+` for `String` concatenation among `String` operands).

Comparison: `==`, `!=` (structural, no coercion) for all types. `<`, `>`, `<=`, `>=` for `Number` only. String ordering is not supported via operators — use `String.compare(a, b)` which returns `-1`, `0`, or `1`.

For objects and arrays, `==` performs **deep recursive comparison** of own properties — same shape, same data → equal. Prototype chains are not walked; only own properties are compared. Nested objects, arrays, and tuples are compared recursively. Circular references are detected at runtime and cause an error.

```
{a: {b: 1}} == {a: {b: 1}};         # true — deep comparison
[1, [2, 3]] == [1, [2, 3]];         # true
{a: 1, b: 2} == {a: 1};             # false — different shape
```

Prototype identity can be compared explicitly via `Object.getPrototypeOf()`.

*Note for JS programmers:* `==` in GPJ is value equality, not reference identity. There is no reference comparison operator — two distinct objects with the same contents are equal.

**Transpiler optimization:** when the type checker can prove both operands are primitives, `==` emits as JS `===` directly. The recursive comparison helper is only emitted when either operand could be an object, array, or tuple.

Logical: `&&`, `||`, `!`. Short-circuit as JS.

No `===`, `!==` (redundant). No bitwise operators (use stdlib if needed).

## 9. Error Handling

`try`/`catch`/`finally` and `throw`. Thrown values must structurally match `{message: String}` (i.e. any object with at least a `message` property of type `String`). This guarantees `catch` blocks can always access `e.message`.

```
throw {message: "something went wrong"};
throw {message: "not found", code: 404};  # additional properties are fine
```

**Typed catch blocks:** A `catch` block with a type annotation only executes if the thrown value **structurally matches** the annotated type at runtime — i.e. the object has all the declared properties with the correct types. If it doesn't match, the exception propagates to the next `catch` block or re-throws up the stack.

Multiple `catch` blocks are checked in order (like Java). A bare `catch (e)` with no annotation catches anything matching `{message: String}` and serves as the catch-all. If no `catch` block matches, the exception propagates.

```
type HttpError = {message: String, code: Number};
type ValueError = {message: String, value: Number};

try {
    throw {message: "not found", code: 404};
} catch (e: HttpError) {
    console.log(e.code);       # 404 — matches, block executes
} catch (e: ValueError) {
    console.log(e.value);      # skipped — didn't match
} catch (e) {
    console.log(e.message);    # catch-all — would fire if neither above matched
}
```

**Union types** in catch annotations match if the thrown value matches any variant:

```
catch (e: HttpError | ValueError) {
    console.log(e.message);    # always available — both have message
    if (typeof e.code == "Number") {
        console.log(e.code);   # narrowed — this is an HttpError
    }
}
```

Structural matching is checked at runtime by verifying own properties and their types. This transpiles to a generated type-guard function for each annotated catch block.

## 10. Modules

Imports use Python-style syntax — names are matched by export name, no curly braces.

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

Each imported name must match an `export`ed name in the target module — unmatched names are a compile error. Aliasing via `as` — dotted aliases (e.g. `np.a`) attach the import as a property on an existing alias, allowing lightweight namespace grouping. The parent alias must be defined earlier in the same import statement or in a prior import.

**Module resolution:** Import paths are relative to the importing file. A path `"./x"` resolves to `./x.gpj`, or `./x/module.gpj` if `./x` is a directory. Bare names (no `./` or `../` prefix) resolve to standard library modules (e.g. `"fs"`). No search paths, no `node_modules`-style resolution.

```
import foo from "./utils";            # ./utils.gpj or ./utils/module.gpj
import * as h from "../lib/helpers";  # ../lib/helpers.gpj or ../lib/helpers/module.gpj
import * as fs from "fs";            # stdlib
```

## 11. Standard Library

Minimal built-in surface:

- **console** — `console.log` (stdout), `console.error` (stderr). No `console.warn` (redundant with `console.error`).
- **Math** — standard math functions.
- **JSON** — `JSON.parse`, `JSON.stringify`, plus query/builder helpers (JSONPath or similar — TBD).
- **String** — UTF-8 aware: indexing, slicing, `length` (codepoint count), iteration over codepoints. Standard methods matching JS semantics where applicable.
- **Object** — static methods (all transpile directly to JS equivalents):
  - `Object.create(proto)` — create object with given prototype.
  - `Object.keys(obj): Array<String>` — own enumerable property names.
  - `Object.values(obj): Array<Unknown>` — own enumerable property values. Narrow before use.
  - `Object.entries(obj): Array<Pair<String, Unknown>>` — key-value pairs as `[String, value]` tuples. Narrow values before use.
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

## 13. Open Questions

1. **Generics beyond Array** — should functions support `<T>` parameters?
2. **Interface keyword** — structural types via alias suffice, but explicit `interface` may aid readability.
3. **Stdlib scope** — which `Array`/`String` methods to include at launch.
4. **Process/eval** — thread model, `eval()` scoping rules, spawn API shape.
5. **JSON query** — JSONPath, dot-path helpers, or something else.
