**DONE** (scroll down for _TODO_ mark)
#### Step 0.5 — Test infrastructure (prerequisite for all steps)
- [x] `package.json` with `node --test` as test runner (no dependencies)
- [x] Test harness: run `.gpj` files, assert stdout/stderr/exit code
- [x] GitHub Actions CI: run tests on push

#### Steps
1. `let`/`val` declarations with primitives (Number, String, Boolean, None)
2. Arithmetic and string concatenation with type checking
3. `if`/`else`, `while`, `for`
4. Functions (declaration and arrow)
5. `==`/`!=` on primitives (emits `===`/`!==`), `??` (emits `??`)
6. Arrays and `for...of`
7. Objects and structural types
8. `__gpj_eq` runtime (deep equality, seen-pair registry for circular refs)
9. Modules (`import`/`export`)
10. Error handling (`try`/`catch`/`finally`, `throw`)
11. `do`/`while` loops
12. `switch`/`case`
13. Spread operator (`...`) and rest parameters
14. Type aliases (`type Foo = ...`) - parse and skip
15. Destructuring (object, array, nested, rest, rename)
16. Compound assignment (`+=`, `-=`, `*=`, `/=`, `%=`, `**=`)
17. `for...of` with destructuring
18. C-style `for` loops
19. F-strings (string interpolation) - see also [INTRO](doc/INTRO.md)
20. Ternary operator, `typeof` operator (foundational; `typeof` is prereq for type narrowing)
21. Whitespace enforcement — spaces around binary operators required by parser (§1 of SPEC)
22. Type representation — parse type annotations into real AST nodes instead of discarding them
    (prerequisite for all type-checking steps)
23. Basic type inference and checking — variable declarations, literals, simple mismatches
24. Function types — check param/return annotations, infer return type from `return` statements
25. Union/nullable assignment checking — enable `UnionType`/`NullableType` in `checkCompat`; `T | S` accepts
    any matching member; `T?` accepts T or None; no narrowing yet
26. `typeof` narrowing — recognise `typeof x == "TypeName"` in `if`/`switch` conditions; thread narrowed env
    into branch; narrow remainder into else; prerequisite for practical union use
27. Typed catch — `catch (e: SomeType)` generates a runtime structural guard; multiple catch blocks in order;
    re-throw if none match; union types in catch annotations
28. Map and Set — `Map.of(...)` / `Set.of(...)` factory transpilation; `for...of` iteration; method pass-through
29. Private properties — `_`-prefixed property access only via `this` inside the defining object literal;
    external access is a type error; tracked via parser object-literal context stack

30. Method-call enforcement — MemberExpression with FunctionType property must be in call position;
    `v.method` without `()` is a type error; zero runtime cost
31. `Unknown` type — operations on `Unknown` are a type error; narrow with `typeof` first;
    `??` on a non-nullable left operand is a type error

## STAGE 2

32. `String` built-in methods — runtime preamble: `at(n)` → `String | None`; `indexOf(s)` →
    `Number | None`; `split(sep)` requires separator arg; `String.compare(a, b)` static method
    (spec §8); `trim`, `slice`, `includes`, `startsWith`, `endsWith`, `toLowerCase`,
    `toUpperCase`, `replace` pass through unchanged
33. `Array` built-in methods — runtime preamble: `pop()` / `shift()` / `find(fn)` → `T | None`;
    `findIndex(fn)` / `indexOf(v)` → `Number | None` (indexOf uses `__gpj_eq`); `sort(cmp)`
    enforces comparator; `map`, `filter`, `reduce`, `forEach`, `some`, `every`, `join`, `slice`,
    `concat`, `reverse`, `flat`, `flatMap` pass through
34. `JSON.decycle` / `JSON.encycle` — add to runtime preamble per stdlib-notes.md;
    `JSON.parse` / `JSON.stringify` are already JS globals, no work needed

**TODO**

35. Stdlib import infrastructure — codegen rewrites bare-name imports (no `./` prefix) to
    absolute paths pointing to `src/stdlib/<name>.js`; CLI refactored to write temp file +
    spawn Node when generated code contains top-level `import` statements (prerequisite for 36-38)
36. `http` module — `src/stdlib/http.js`; sync HTTP via subprocess: `get(url, options?)` →
    `{ok, status, text(), json()}`; drives Node's built-in `fetch` in a child process
37. `process` module — `src/stdlib/process.js`; re-exports `process.env` (object),
    `process.argv` as `args` (Array), `process.exit(code)`
38. `fs` module — `src/stdlib/fs.js`; sync wrappers: `readFile(path)`, `writeFile(path, data)`,
    `exists(path)`, `readDir(path)`, `makeDir(path)`, `removeFile(path)`

**Milestone:** `example/gh-ci-stat.gpj` — synchronous GPJ equivalent of the promise-chained JS version;
uses `http.get`, f-strings, `try`/`catch`, array indexing, object access
