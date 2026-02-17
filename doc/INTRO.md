# The `??` operator (nullish coalescing)

`??` returns its left-hand side unless it is `None`, in which case it
returns the right-hand side.

```
let name = None ?? "anonymous";   # "anonymous"
let port = 8080 ?? 3000;          # 8080
```

## How it differs from `||`

`||` treats **any** falsy value as "missing" — `0`, `""`, `false`, and
`None` all trigger the fallback.  `??` only triggers on `None`.

```
let count = 0 ?? 42;       # 0   — zero is kept
let label = "" ?? "n/a";   # ""  — empty string is kept
let on    = false ?? true;  # false
```

### Comparison with other languages

| GPJ                     | Python                              | Java                                    |
| :---------------------- | :---------------------------------- | :-------------------------------------- |
| `x ?? default`          | `x if x is not None else default`   | `Optional.ofNullable(x).orElse(default)` |
| `None ?? 5`  →  `5`     | `None if None is not None...` → `5` | `Optional.empty().orElse(5)` → `5`      |
| `0 ?? 10`  →  `0`       | `0 if 0 is not None...` → `0`       | `Optional.of(0).orElse(10)` → `0`       |

In Python you might also see `x or default`, but that has the same
falsy-value problem as `||` — `0 or 10` gives `10`, not `0`.

The `??` operator was introduced in JavaScript as part of the ECMAScript 2020 (ES11) standard.

## Chaining

`??` chains left-to-right, so the first non-`None` value wins:

```
let x = None ?? None ?? 3;   # 3
```

## Mixing with other operators

GPJ has no implicit precedence between different operators.  Mixing `??`
with `+`, `==`, etc. without parentheses is a **parse error**:

```
# Error — ambiguous
let x = a ?? b + 1;

# OK — explicit grouping
let x = a ?? (b + 1);
let x = (a ?? b) + 1;
```

This is intentional: `a ?? b + 1` could reasonably mean either grouping,
so the language makes you say which one you mean.

---

# Type aliases

GPJ supports type alias declarations:

```
type Point = {x: Number, y: Number};
type ID = String | Number;
```

## Current status: parsed but not enforced

The transpiler recognises `type` declarations and parses them without
error, but **discards them** during code generation.  No type-checking
happens at compile time or at runtime.  This means:

1. **Annotations are documentation only.**  You can write
   `let p: Point = {x: 1, y: 2};` and the compiler accepts it, but it
   will also accept `let p: Point = "oops";` without complaint.

2. **Typed catch blocks are inert.**  The spec describes catch blocks
   that structurally match a type annotation:
   ```
   type HttpError = {message: String, code: Number};
   try { ... } catch (e: HttpError) { ... }
   ```
   Currently the annotation is skipped and the catch block fires for
   any thrown value, regardless of shape.

3. **No compile-time safety net.**  Misspelled property names, wrong
   argument types, missing fields -- none of these are caught before
   execution.  You find out at runtime (if at all), just like plain
   JavaScript.

## What changes when type-checking is added

Once the type checker is implemented, `type` aliases become real
constraints:

- A function `export function move(p: Point)` will reject calls with
  the wrong shape at compile time.
- Typed catch blocks will only fire when the thrown value structurally
  matches the declared type; non-matching exceptions propagate.
- Union types (`ID = String | Number`) will require narrowing before
  you can use type-specific operations.
- Inference will fill in omitted annotations inside function bodies,
  but exported signatures must be explicit.

Until then, type aliases serve as **machine-readable intent** -- they
document the programmer's expectation and will be enforced once the
checker exists.
