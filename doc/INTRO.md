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

| GPJ                     | Python                          | Java                                  |
|-------------------------|---------------------------------|---------------------------------------|
| `x ?? default`          | `x if x is not None else default` | `Optional.ofNullable(x).orElse(default)` |
| `None ?? 5`  →  `5`    | `None if None is not None...` → `5` | `Optional.empty().orElse(5)` → `5`   |
| `0 ?? 10`  →  `0`      | `0 if 0 is not None...` → `0`  | `Optional.of(0).orElse(10)` → `0`    |

In Python you might also see `x or default`, but that has the same
falsy-value problem as `||` — `0 or 10` gives `10`, not `0`.

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
