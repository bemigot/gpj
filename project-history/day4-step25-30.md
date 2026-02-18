# Day 3 — Steps 25-30 planning

Expansion of the original step 25 placeholder
`(to be expanded) Union/nullable types, typeof narrowing, typed catch, Map/Set, private properties, method-call enforcement`
into six concrete steps, agreed 2026-02-18.

---

## Step 25 — Union/nullable assignment checking

Enable the currently-deferred `UnionType` / `NullableType` cases in
`checkCompat` and `checkExprAgainst`.

- `let v: Number | String = 42;` — ok (matches a member); `= true;` — error
- `let n: Number? = None;` — ok; `let n: Number? = "hi";` — ok
- Value assigned to bare `Number` when annotated `Number?` — error
- No narrowing yet — just assignment compatibility

## Step 26 — `typeof` narrowing

Recognise `typeof x == "TypeName"` in `if` / `switch` conditions and thread a
narrowed env into the branch.

- Consequent branch: variable narrowed to the matched type
- Else branch: variable narrowed to the remainder of the union
- Enables `if (typeof v == "Number") { v + 1; }` on a `Number | String` union
- Prerequisite for practical use of union types in function bodies

## Step 27 — Typed catch

`catch (e: SomeType)` generates a runtime structural guard in the emitted JS.

- Multiple catch blocks checked in order; re-throws if none match
- Union types in catch annotations match any variant
- Structural matching: verifies own properties and their types at runtime

## Step 28 — Map and Set

New collection types from SPEC §2.2.

- `Map.of(["k", 1], ...)` transpiles to `new Map([["k", 1], ...])`
- `Set.of(1, 2, 3)` transpiles to `new Set([1, 2, 3])`
- `for...of` on Map yields `[key, value]` pairs; on Set yields values
- Instance methods (`m.get`, `m.set`, `m.has`, `m.delete`, `m.size`,
  `s.add`, `s.has`, `s.delete`, `s.size`, etc.) pass through to JS
- Type annotations (`Map<K, V>`, `Set<T>`) accepted; deep-checking deferred

## Step 29 — Private properties

`_`-prefixed property access only allowed via `this` inside functions
lexically defined within the same object literal (SPEC §7).

- `obj._x` from outside the literal — parse/type error
- `this._x` inside a method of the same literal — ok
- Methods inherited via `Object.create(Proto)` retain access (lexically
  defined in Proto's literal)
- Tracked in the parser's object-literal context stack

## Step 30 — Method-call enforcement

A `MemberExpression` whose property type is `FunctionType` must appear in
call position (SPEC §7).

- `let fn = v.length;` — error
- `someFunc(v.length);` — error
- `v.length()` — ok
- `() => v.length()` — ok (closure calls it)
- Transpiles with zero runtime cost — purely a typechecker rule
- Initially effective where the typechecker already knows the property type;
  full enforcement requires structural object typing
