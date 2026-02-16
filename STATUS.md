### Implementation order after "Hello, world"

From now on every step is completed only after a reasonable number of tests are checked in.

#### Step 0.5 — Test infrastructure (prerequisite for all steps)
- [ ] `package.json` with `node --test` as test runner (no dependencies)
- [ ] Test harness: run `.gpj` files, assert stdout/stderr/exit code
- [ ] GitHub Actions CI: run tests on push

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
10. Everything else
