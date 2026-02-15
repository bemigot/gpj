# GPJ Draft-0 Review Notes

**Reviewed:** 2026-02-15 20:51:33

---

## Review of GPJ Draft-0

Overall this is a well-motivated design — it picks clear, defensible positions on most JS footguns. Below are the issues I see, grouped by severity.

---

### Contradictions & Spec Bugs

**1. `None != None` breaks basic programming patterns (S2.3)**

This is the single most controversial decision. If `None != None`, then:
- `switch` with a `None` case (S2.3) can never match, since `switch` uses `==` comparison
- You can't test `x == None` to detect absence — you say so yourself ("use with caution"), but then what *do* you use? `typeof x == "None"` works, but it's verbose and counter-intuitive for a value check
- Structural equality (S8) of `{a: None}` and `{a: None}` would be `false`, since the property values aren't `==`
- Arrays containing `None` can never be meaningfully compared

You're importing IEEE 754 NaN semantics onto a sentinel value, which is a different problem domain. NaN means "computation failed, result is garbage." `None` means "intentionally absent." These deserve different equality semantics. **Recommendation:** make `None == None` true. If you want "unknown/missing" NaN-like semantics, that's a separate type.

**2. Import syntax contradicts "named exports only" (S10)**

```
import foo from "./utils";
```

In ES modules, this syntax means "import the default export." You say there are no default exports, only named ones — but then this bare `import foo` has no curly braces to indicate which named export `foo` refers to. Is `foo` expected to match by name? What if `utils.gpj` exports `foo` and `bar` — does `import bar from "./utils"` grab the `bar` export? What if the name doesn't match any export? This needs explicit rules. The ES module mental model will confuse every JS developer who reads this.

**3. `Object.entries` return type is wrong (S11)**

```
Object.entries(obj): Array<Array<Any>>
```

This should be `Array<[String, Any]>` or a tuple type. As written, `entries[0][0]` has type `Any` when it's always a `String`. You don't have tuples yet — this is a sign you might need them, or at least a `Pair<K, V>` alias.

---

### Implementation Concerns (Transpiler-to-JS)

**4. "No operator precedence" generates awful JS (S8)**

Your transpiler must emit JS, which *has* precedence. `(1 + 2) + 3` transpiles fine, but you're forcing users to write it. The real question: does the transpiler emit the parens verbatim (safe, ugly) or strip unnecessary ones (needs its own precedence logic — the thing you're trying to avoid)? Either way this is implementable, but consider: `a + b + c` is the #1 most common multi-operator expression in real code, and forbidding it will generate enormous friction. **Consider:** allowing chaining of the *same* operator (left-associative), which is unambiguous and covers 90% of cases.

**5. Structural equality on objects is expensive at runtime (S8)**

`==` on objects does a recursive own-property comparison. This transpiles to a runtime helper function, not a JS `===`. Every `==` in emitted JS where either side could be an object needs a wrapper: `__gpj_eq(a, b)`. This has performance implications and means your "maps nearly directly to JS" claim weakens. You need to spec: is this deep or shallow? You say "own properties only" but those property values could themselves be objects — do you recurse? If yes, the circular reference detection you mention requires a `Set` or similar at runtime.

**6. Detached method detection at parse time (S7)**

```
let fn = v.length;  # ERROR
```

This requires the parser/type-checker to distinguish property access (reading a value) from method extraction based on whether the result is called. What about:

```
let obj = {fn: v.length};  # Error?
someFunc(v.length);         # Passing a method ref — error?
[v.length];                 # Storing in array?
```

The rule "a method can only be invoked via dot-call" means you need to track whether any expression of function type originated from a dot-access and was not immediately called. This is doable but more complex than it sounds — it's a *flow* property, not a syntactic one.

**7. `_` privacy enforcement scope is unclear (S7)**

"Functions defined in the same object literal" — but `Object.create(Counter)` produces a new object. When `count()` runs on a child object, is `this._n` allowed because `count` was *defined* in the Counter literal? What about:

```
let helper = function() { return this._n; };
let Counter = {
    _n: 0,
    getValue: helper  # defined outside the literal
};
```

This needs a precise definition. "Same object literal" is a syntactic criterion applied at parse time, but `this` is a runtime binding. The transpiler would need to tag each function with its "home object" and check `_` access against that tag.

---

### Design Gaps

**8. No destructuring is a serious usability cost (S12)**

You list it as "deferred," but without it:
- No `let {x, y} = point;`
- No `let [first, ...rest] = arr;`
- No parameter destructuring `function f({x, y}) { ... }`

Combined with no `for...in`, working with objects becomes tedious. `Object.entries()` returns arrays you can't unpack. This should be prioritized.

**9. String comparison limited to < 128 chars is arbitrary (S8)**

Why 128? What happens at 129 — runtime error or type error? This is invisible to the type system (string length isn't tracked), so it must be a runtime check. This means `<` on strings becomes a runtime-checked operation that can throw, which is surprising. **Recommendation:** either allow all string comparison or disallow it entirely and provide a `compare()` function.

**10. `Any` type appears in stdlib but isn't declared (S11)**

`Object.values()` returns `Array<Any>`, `Object.entries()` returns `Array<Array<Any>>`. But `Any` never appears in your type system (S2-3). Is it a real type? Can users write it? If so, it's a massive escape hatch that undermines "no implicit coercion." If not, these stdlib functions need different signatures (generics, which is Open Question #1).

**11. No `Map`/`Set` types**

Objects-as-dictionaries is a JS antipattern you're inheriting. With structural equality on objects, you have the foundation for proper `Map<K, V>` and `Set<T>` — consider adding them.

**12. Catch annotation is unsound (S9)**

```
catch (e: HttpError) {
    console.log(e.code);  # 404
}
```

This is a *lie* to the type system. The annotation isn't checked — any `{message: String}` could be thrown. If someone throws `{message: "oops"}` and you catch it as `HttpError`, `e.code` is `None` at runtime but `Number` according to the type checker. This is a soundness hole. Either: (a) make catch annotations unchecked and warn about it, (b) emit a runtime type-guard, or (c) require `typeof`-style narrowing inside the catch body.

**13. `val` vs `Object.freeze` overlap (S4, S11)**

You have `val` for immutable bindings and `Object.freeze` for immutable values — but no way to declare a deeply immutable value. Consider whether `val` on an object should automatically freeze it, or introduce a `frozen` keyword/modifier.

---

### Minor Issues

- **Whitespace enforcement (S1):** "spaces mandatory around binary operators" — does this apply inside array index brackets? `a[i + 1]` requires spaces, fine. But `a[i]` has no binary operator — does `a[ i ]` require the inner spaces? Clarify.
- **`console.log` is the only output (S1):** No `console.error`, `console.warn`? For a language with `try`/`catch`, stderr matters.
- **Shebang uses `#` comments (S1):** Good, but `#` inside strings needs explicit escaping rules. `"price: $5 # discount"` — is `# discount` a comment?
- **HM inference on a language with mutation (S3):** HM-style inference assumes immutability. With `let` bindings that can be reassigned to different values (same type), inference works, but you should clarify that inference is *local* (per-function) and doesn't attempt global constraint solving.

---

### Summary

The strongest decisions: unified `None`, no implicit coercion, no `var`/hoisting, mandatory whitespace, structural typing, method-detachment prevention. These genuinely fix JS pain points.

The weakest decisions: `None != None` (will cause more bugs than it prevents), no operator precedence (too strict for the ergonomic cost), 128-char string comparison limit (arbitrary runtime trap), and the catch-annotation soundness hole.

The biggest implementation risk for the transpiler is the `__gpj_eq` runtime helper — structural equality means you're no longer "nearly direct" JS. Plan for a small runtime library from day one.
