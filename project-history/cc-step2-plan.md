# Plan: Step 2 — Arithmetic, string concatenation, and binary operators

## Context

Steps 0/0.5/1 are done. The parser has a stub `parseBinaryOrLogical()` (line 109) that goes straight to `parseUnary()`. The lexer already tokenizes all operators. No `BinaryExpression` AST node or codegen exists. The runtime (`gpj_runtime.js`) is an empty stub. User chose **runtime helpers** for type-checked arithmetic.

## Changes

### 1. Parser: binary expression parsing (`src/parser.js`)

Replace the stub `parseBinaryOrLogical()` with a precedence-climbing parser. Precedence levels (lowest → highest):

| Level | Operators | Kind |
|-------|-----------|------|
| 1 | `\|\|` | Logical OR |
| 2 | `&&` | Logical AND |
| 3 | `==` `!=` | Equality |
| 4 | `<` `>` `<=` `>=` | Comparison |
| 5 | `+` `-` | Additive |
| 6 | `*` `/` `%` | Multiplicative |
| 7 | `**` | Exponentiation (right-assoc) |

Produces AST: `{ type: "BinaryExpression", operator: string, left, right }`

Implementation: `BINARY_OPS` map from TokenType → `{ op, prec }`, table-driven `parseBinary(minPrec)`. All left-associative except `**` (right-associative).

### 2. Runtime helpers (`src/gpj_runtime.js`)

Two functions, exported as source-code strings (for injection into generated output):

- **`__gpj_add(a, b)`**: Both numbers → `a + b`. Both strings → `a + b`. Otherwise → `throw new TypeError(...)`.
- **`__gpj_arith(op, a, b)`**: Both must be numbers or throws. Dispatches `-`, `*`, `/`, `%`, `**`.

### 3. Codegen: BinaryExpression (`src/codegen.js`)

Add `BinaryExpression` case. Track needed helpers via module-level `usedHelpers` Set (reset at Program start):

- `+` → `__gpj_add(left, right)`, mark helper needed
- `-`, `*`, `/`, `%`, `**` → `__gpj_arith("op", left, right)`, mark helper needed
- `<`, `>`, `<=`, `>=`, `&&`, `||` → plain JS `(left op right)`
- `==`, `!=` → emit `===`, `!==` (parse now, test thoroughly in step 5)

In `Program` case: after generating body, prepend needed runtime helper source if any helpers were used.

### 4. Tests (`test/step2-arithmetic.test.js`)

**Execution tests:**
- Basic ops: `2 + 3` → 5, `10 - 4` → 6, `3 * 7` → 21, `15 / 4` → 3.75, `10 % 3` → 1, `2 ** 10` → 1024
- String concat: `"hello" + " world"` → `hello world`
- Precedence: `2 + 3 * 4` → 14, `(2 + 3) * 4` → 20
- Right-assoc: `2 ** 2 ** 3` → 256
- Comparison: `3 > 2` → true
- Logical: `true && false` → false
- Unary + binary: `-5 + 3` → -2

**Type error tests:**
- `1 + "hi"` → TypeError, nonzero exit
- `"hi" - 1` → TypeError, nonzero exit

**Codegen tests:**
- `2 + 3` → JS contains `__gpj_add`
- `2 * 3` → JS contains `__gpj_arith`
- `a > b` → plain `>`, no runtime wrapper

### 5. STATUS.md — mark step 2 done

## Files

| File | Action |
|------|--------|
| `src/parser.js` | Edit: replace `parseBinaryOrLogical` stub |
| `src/gpj_runtime.js` | Edit: add helper source strings |
| `src/codegen.js` | Edit: add `BinaryExpression` + runtime preamble |
| `test/step2-arithmetic.test.js` | Create |
| `STATUS.md` | Edit |

## Verification
1. `npm test` — all tests pass (step 0 + 1 + 2)
2. `node src/cli.js example/hello.gpj` — still works
3. Type errors produce clear messages
