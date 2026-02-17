### Implementation order after "Hello, world"

#### Step 0.5 — Test infrastructure (prerequisite for all steps)
- [x] `package.json` with `node --test` as test runner (no dependencies)
- [x] Test harness: run `.gpj` files, assert stdout/stderr/exit code
- [x] GitHub Actions CI: run tests on push

#### Steps

1. DONE `let`/`val` declarations with primitives (Number, String, Boolean, None)
2. DONE Arithmetic and string concatenation with type checking
3. DONE `if`/`else`, `while`, `for`
4. DONE Functions (declaration and arrow)
5. DONE `==`/`!=` on primitives (emits `===`/`!==`), `??` (emits `??`)
6. DONE Arrays and `for...of`
7. DONE Objects and structural types
8. DONE `__gpj_eq` runtime (deep equality, seen-pair registry for circular refs)
9. DONE Modules (`import`/`export`)
10. DONE Error handling (`try`/`catch`/`finally`, `throw`)
11. DONE `do`/`while` loops
12. DONE `switch`/`case`
13. Spread operator (`...`)
14. Type aliases (`type Foo = ...`) — parse and skip
15. Everything else
