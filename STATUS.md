### Implementation order after "Hello, world"

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
**TODO**
20. Ternary operator + `typeof` operator (foundational; `typeof` is prereq for type narrowing)
21. Whitespace enforcement — spaces around binary operators required by parser (§1 of SPEC)
22. Type representation — parse type annotations into real AST nodes instead of discarding them (prereq for all type-checking steps)
23. Basic type inference and checking — variable declarations, literals, simple mismatches
24. Function types — check param/return annotations, infer return type from `return` statements
25+ Union/nullable types (`Number | String`, `T?`), `typeof` narrowing, typed catch, Map/Set, private properties, method-call enforcement
