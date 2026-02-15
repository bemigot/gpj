# Draft-0 Review Notes

*Updated 2026-02-15. Items resolved in-session are omitted.*

## Inconsistencies

**1. `this` binding is unspecified (§7)**
`this.x` appears in the `length` method (line 155) but the spec never defines `this` binding rules. Call-site? Lexical? Bound to the receiver of a dot-call? Critical to define since there's no `class`, `bind`, or `call`/`apply`.

**2. Vec2 example has a type hole (§7)**
`Vec2.create` returns `Vec2Instance` which is `{x: Number, y: Number}`, but then line 160 calls `v.length()` — which isn't in `Vec2Instance`. The prototype method `length` is inherited via `Object.create(Vec2)`, but the type system only sees the declared return type. Either:
- `Vec2Instance` needs to include `length` (and `create`), or
- The spec needs to explain how prototype methods interact with structural types.

**3. `#` comment vs `#private` mention (§7)**
Line 163 says "No `#private` fields" — `#` as comment character makes `#private` syntax impossible anyway. The phrasing could acknowledge this is a natural consequence of the comment syntax rather than implying a separate design choice.

## Larger Omissions

**4. No spread/rest specification**
§6 uses `...nums` rest params (line 122) but spread/rest is never formally defined. Can you spread into arrays? Function calls? Object literals?

**5. No `typeof` / type reflection**
§13 mentions narrowing via `typeof` as an open question, but `typeof` itself is never introduced. No way to inspect types at runtime.

**6. No iteration protocol**
`for...of` is listed (§5) but nothing defines what's iterable. Can you `for...of` a `String`? What does `Object.keys()` return — `Array<String>`?

**7. Module resolution unspecified**
`import ... from "module"` (§10) doesn't define how `"module"` resolves to a file. Relative paths? Extensions? Search paths?

**8. No grammar or precedence table**
Operator precedence, associativity, and expression grammar are absent. "Same as JS" references a 700-page spec — GPJ should at minimum list its precedence levels.

**9. Mutability of compound values**
`val` makes a binding immutable, but is the referenced value frozen? Can you do `val a = [1,2]; a.push(3);`? JS `const` allows mutation of the value — GPJ should state its stance.

**10. `None` behavior gaps**
- Is `None == None` false? (stated in §1 transpiler note as a deviation, but not formalized in §8)
- Can `None` appear in arrays: `Array<Number?>`?
- What does `console.log(None)` print? (likely `"None"` per §2.1 toString, but worth confirming)
- Can `None` be used in `switch` cases?

**11. `catch` binding type**
§9 guarantees `{message: String}` for thrown values, but what is the type of `e` in `catch(e)`? Is it `{message: String}`? Can you access `e.code` from the `{message, code}` example without a type error? If `e` is typed as `{message: String}`, additional properties are invisible without narrowing — which isn't specified.

**12. `toString()` and the type system**
§2.1 says all types have `toString()`, but this isn't reflected in structural type definitions. If I declare `type Foo = {x: Number}`, does `Foo` implicitly have `toString()`? Is `toString()` on a protocol/trait level separate from structural properties? This needs clarifying — especially for objects that override `toString()`, since the override needs to be type-compatible.

**13. String templating forward reference**
§1 mentions string templating is "not yet specified" and §2.1 lists it as a `toString()` invocation site. These should stay consistent as templating gets designed.
