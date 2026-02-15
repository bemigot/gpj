**As a competent language designer and transpile-to-JS implementor, and having
countering JavaScript's pitfalls in mind review Draft-0.md**

# GPJ Draft-0 Review-2 Notes

**Reviewed:** 2026-02-15 20:51 **Updated:** 2026-02-15 23:05
---
Overall this is a well-motivated design — it picks clear,
defensible positions on most JS footguns. Below are the issues I see, grouped by severity.
---

### Contradictions & Spec Bugs

**1. ~~`None != None` breaks basic programming patterns (S2.3)~~ RESOLVED**

Reversed: `None == None` is now true.

**2. ~~Import syntax contradicts "named exports only" (S10)~~ RESOLVED**

Clarified: Python-style import syntax — names matched by export name, no curly braces. Dropped ESM/"named exports" framing to avoid JS mental model confusion. Unmatched names are a compile error.

**3. ~~`Object.entries` return type is wrong (S11)~~ RESOLVED**

Added `Tuple` as a compound type (S2.2) — fixed-length, heterogeneous, `[T1, T2, ...]` syntax. `Pair<K, V>` is a built-in alias for `[K, V]`. `Object.entries` now returns `Array<Pair<String, Any>>`.

---

### Implementation Concerns (Transpiler-to-JS)

**4. ~~"No operator precedence" generates awful JS (S8)~~ RESOLVED**

Relaxed: same-operator chaining is now allowed (left-associative). `1 + 2 + 3` and `a && b && c` are valid. Different operators still require explicit parens. Comparison operators cannot be chained (always an error).

**5. ~~Structural equality on objects is expensive at runtime (S8)~~ RESOLVED**

Clarified as deep recursive comparison with examples. Added transpiler optimization note (primitives emit as JS `===`, helper only for objects/arrays/tuples). Added one-sentence JS-background callout. Circular references detected at runtime.

**6. ~~Detached method detection at parse time (S7)~~ RESOLVED**

Simplified: purely syntactic rule — if a dot-access resolves to a function type, `()` must be the immediate parent AST node. No flow analysis needed. Spec rewritten to state the rule plainly without JS `this`-binding backstory.

**7. ~~`_` privacy enforcement scope is unclear (S7)~~ RESOLVED**

Defined precisely: `this._x` allowed only inside functions lexically defined in the same object literal where `_x` is declared. Purely syntactic (AST check), zero runtime cost. External functions assigned as methods are locked out. `Object.create()` children work because inherited methods were lexically defined in the original literal.

---

### Design Gaps

**8. ~~No destructuring is a serious usability cost (S12)~~ RESOLVED**

Added S4.1 Destructuring: object, array/tuple, function parameter, and nested destructuring. Removed from Deliberate Omissions table. Transpiles directly to JS destructuring.

**9. ~~String comparison limited to < 128 chars is arbitrary (S8)~~ RESOLVED**

Ordering operators (`<`, `>`, `<=`, `>=`) now `Number` only. String ordering via `String.compare(a, b)` returning `-1`, `0`, or `1`. `==`/`!=` still work on strings.

**10. ~~`Any` type appears in stdlib but isn't declared (S11)~~ RESOLVED**

Added `Unknown` as a safe top type (S2.2) — any value assignable to it, no operations without `typeof` narrowing. No `Any` type exists. Stdlib signatures updated to use `Unknown`. Post-v0.1 note added: generics may replace most `Unknown` uses.

**11. ~~No `Map`/`Set` types~~ RESOLVED**

Added `Map<K, V>` and `Set<T>` as compound types (S2.2). Deep equality for keys/values, insertion order maintained, full method surface, iterable via `for...of`. Transpile to JS `Map`/`Set` with equality helper for non-primitives.

**12. ~~Catch annotation is unsound (S9)~~ RESOLVED**

Typed catch blocks now use runtime structural matching — block only executes if thrown value matches the annotated type. Multiple catch blocks checked in order (Java-style). Union types supported (`catch (e: HttpError | ValueError)`). Bare `catch (e)` as catch-all. Transpiles to generated type-guard functions.

**13. ~~`val` vs `Object.freeze` overlap (S4, S11)~~ RESOLVED**

`val` now freezes the value (shallow) in addition to making the binding immutable. Clean mental model: `val` = immutable, `let` = mutable. `Object.freeze()` remains for explicit freezing of `let`-bound values or deep-freezing nested structures.

---

### Minor Issues

- ~~**Whitespace enforcement (S1)**~~ **RESOLVED** — Clarified: whitespace rule applies to binary operators only. Bracket access (`a[0]`, `a[i]`) requires no inner spaces.
- ~~**`console.log` is the only output (S1)**~~ **RESOLVED** — Added `console.error` for stderr. No `console.warn` (redundant in CLI context).
- ~~**Shebang uses `#` comments (S1)**~~ **RESOLVED** — Clarified: `#` only starts a comment outside of quoted strings. Added example.
- ~~**HM inference on a language with mutation (S3)**~~ **RESOLVED** — Clarified: local inference only (per-function). Function signatures are explicit type boundaries. No global constraint solving.
  * HM inference locality - I guess that would be a logical choice.
    Are there any deviations from that in other languages, besides JS?
  * The landscape splits clearly:
    * Global inference (full HM):
      * Haskell — infers types across an entire module without annotations. Powerful, but leads to notoriously cryptic
        error messages ("type error in line 47 caused by a mistake in line 12")
      * OCaml/ML — same approach. Change one function and get type errors in distant, unrelated code
    * Local inference (function boundaries are explicit):
      * Rust — local only. Function signatures must be annotated. Deliberate choice after studying Haskell's error message problems
      * Kotlin — local only. Parameters annotated, return types inferred for expression bodies
      * Swift — same as Kotlin
      * TypeScript — local only. Parameters need annotations, return types inferred

    The modern consensus is strongly toward local inference. The tradeoff:
    * Global: less annotation, but worse errors and "spooky action at a distance"
    * Local: function signatures are explicit (self-documenting), errors point to the right place, faster compilation

    For GPJ's "interpreter halts on ambiguity" philosophy, local inference is the natural fit — function signatures act as type boundaries, and errors never propagate across them.
---

### Summary

The strongest decisions: unified `None`, no implicit coercion, no `var`/hoisting, mandatory whitespace, structural typing, method-detachment prevention. These genuinely fix JS pain points.

The weakest decisions: ~`None != None` (will cause more bugs than it prevents), no operator precedence (too strict for the ergonomic cost), 128-char string comparison limit (arbitrary runtime trap), and the catch-annotation soundness hole.~

The biggest implementation risk for the transpiler is the `__gpj_eq` runtime helper — structural equality means you're no longer "nearly direct" JS. Plan for a small runtime library from day one.
