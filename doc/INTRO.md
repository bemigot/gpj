## The `??` operator (nullish coalescing)

`??` returns its left-hand side unless it is `None`, in which case it
returns the right-hand side.

```
let name = None ?? "anonymous";   # "anonymous"
let port = 8080 ?? 3000;          # 8080
```

### How it differs from `||`

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

### Chaining

`??` chains left-to-right, so the first non-`None` value wins:

```
let x = None ?? None ?? 3;   # 3
```

### Mixing with other operators

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

## Type aliases

GPJ supports type alias declarations:

```
type Point = {x: Number, y: Number};
type ID = String | Number;
```

### Current status

The transpiler recognises `type` declarations and parses them without
error, and a type-checker runs on every compile.  **Typed catch blocks
work at runtime** (see below).  Here is what is and is not enforced:

1. **Primitive annotations are checked against literal values.**
   `let x: Number = "oops"` is a compile-time `TypeCheckError`.
   The same applies to `String`, `Boolean`, `None`, `Array<T>`, function
   return types, and reassignments.  Annotations referencing custom type
   aliases (`let p: Point = ...`) are deferred -- the checker is permissive
   for non-primitive named types, so `let p: Point = "oops"` still compiles
   without error.

2. **Typed catch blocks fire on structural match.**  The runtime checks
   that the thrown value is a non-null, non-array object with every
   declared field present and having the right GPJ type:
   ```
   type HttpError = {message: String, code: Number};
   try {
     throw {message: "not found", code: 404};
   } catch (e: HttpError) {
     console.log(e.code);   # 404
   } catch (e) {
     console.log("other");
   }
   ```
   A non-matching value is re-thrown to the next handler or outer try.
   Multiple typed catch blocks, union annotations (`HttpError | ValueError`),
   and `finally` are all supported.

3. **No compile-time safety net.**  Misspelled property names, wrong
   argument types, missing fields -- none of these are caught before
   execution.  You find out at runtime (if at all), just like plain
   JavaScript.

### Gotchas for typed catch

**Matching is structural and open.**  Extra fields in the thrown object
are fine -- only the declared fields are checked.  A `{message: String}`
annotation matches `{message: "oops", extra: 42}`.

**Only top-level type aliases are resolvable.**  A `type` declaration
inside a function body is not visible to the catch resolver.  Referencing
it in a catch annotation silently falls back to a catch-all.

**Field types must be simple GPJ primitives.**  Each field annotation
must be a bare type name that maps directly to `__gpj_typeof` output:
`String`, `Number`, `Boolean`, `None`, `Array`, `Object`, `Function`.
Two cases fall back silently to catch-all:

- *Inline object field type*: `{inner: {x: Number}}` -- the field type
  is not a simple name, so the whole shape is unresolvable.
- *Type alias as field type*: `{inner: MyType}` where `MyType` is a
  type alias -- the resolver stores `"MyType"` in the shape, but
  `__gpj_typeof` at runtime returns `"Object"`, never `"MyType"`.
  Every value of `inner` fails the check, making the catch block
  unreachable.

**Union fallback.**  If any member of a union annotation is unresolvable,
the whole union falls back to catch-all.

## What the type checker does not yet cover

The type checker is live but partial.  Remaining gaps:

- **Custom type alias annotations on variables** are not yet enforced.
  `let p: Point = "oops"` compiles without error.
- **Object structural checking** -- a function `export function move(p: Point)`
  does not yet reject calls with the wrong shape at compile time.
- **Full type inference** -- return types of unannotated functions,
  types of binary expressions, and call-site argument types are not
  propagated.

Type aliases on variables and function signatures serve as
**machine-readable intent** in these areas until the checker is extended.

---

## F-strings (string interpolation)

Prefix a string with `f` to embed expressions inside `{...}`:

```
let name = "world";
console.log(f"Hello, {name}!");          # Hello, world!

let x = 3;
let y = 4;
console.log(f"{x} + {y} = {x + y}");    # 3 + 4 = 7
```

Any expression works inside the braces -- function calls, member access,
ternaries, even nested f-strings:

```
let items = [1, 2, 3];
console.log(f"count: {items.length}");           # count: 3
console.log(f"{x > 0 ? "positive" : "nope"}");  # positive
```

### Formatting numbers

F-strings call `toString()` on each interpolated value -- the same
protocol used by `console.log`.  For finer control, call formatting
methods inside the braces:

```
let pi = 3.14159265;

# Two decimal places
console.log(f"pi = {pi.toFixed(2)}");            # pi = 3.14

# Pad to 8 characters, right-aligned
console.log(f"[{String(42).padStart(8)}]");      # [      42]

# Pad with zeros
console.log(f"{String(7).padStart(3, "0")}");    # 007

# Left-aligned with trailing spaces
console.log(f"[{String(42).padEnd(8)}]");        # [42      ]
```

### Literal braces

Double them: `{{` produces `{`, `}}` produces `}`.

```
console.log(f"set = {{1, 2, 3}}");   # set = {1, 2, 3}
```

### How it compiles

`f"hello {name}"` transpiles to the JavaScript template literal
`` `hello ${String(name)}` ``.  The `String()` wrapper ensures
`toString()` is called explicitly -- no implicit coercion.
