# Draft-0 Review Notes

*Updated 2026-02-15 20:39:00*

## Inconsistencies

**1. RESOLVED — `this` binding is unspecified (§7)**
`this.x` appears in the `length` method (line 155) but the spec never defines `this` binding rules. Call-site? Lexical? Bound to the receiver of a dot-call? Critical to define since there's no `class`, `bind`, or `call`/`apply`.

● This one is probably the hardest.

❯ What are our options here?

● Three main options, each with trade-offs:

  Option A: Call-site binding (JS behavior)
  this is the object left of the dot at call time. v.length() → this is v. Familiar to JS developers, transpiles trivially (it's already what JS does). But it's the source of countless JS
  bugs — this changes depending on how you call the function, not where you define it.

  let v = Vec2.create(3, 4);
  let fn = v.length;  # detach the method
  fn();               # `this` is... undefined? global? bug.

  Option B: Lexical this (always bound to definition context)
  Like arrow functions in JS — this refers to the enclosing scope at definition time. Safe, predictable. But it doesn't work for prototype methods at all: length is defined on Vec2, not on v,
   so this would be Vec2, not the instance. This basically kills prototypal inheritance patterns.

  Option C: Receiver binding (call-site, but with safeguards)
  this is bound to the receiver of a dot-call, like Option A — but GPJ makes detaching a method a type error. You can call v.length() but you cannot do let fn = v.length (extracting a method
  without calling it). This eliminates the entire class of this-detachment bugs while keeping prototype patterns working.

  If you need to pass a method around, you wrap it: let fn = () => v.length();

  ---
  My recommendation: Option C. It's "JS done right" — same intuitive dot-call behavior, but the footgun is removed at the type level. Transpiles to JS naturally (just this), with the safety
  enforced at parse time, not runtime.

❯ Option C.


**2. RESOLVED — Vec2 example has a type hole (§7)**
`Vec2.create` returns `Vec2Instance` which is `{x: Number, y: Number}`, but then line 160 calls `v.length()` — which isn't in `Vec2Instance`. The prototype method `length` is inherited via `Object.create(Vec2)`, but the type system only sees the declared return type. Either:
- `Vec2Instance` needs to include `length` (and `create`), or
- The spec needs to explain how prototype methods interact with structural types.

❯ what other methods besides Object.length() and Object.create(Vec2) does JS Object have?

● Static methods (Object.xxx):

  ┌─────────────────────────────────────────────┬──────────────────────────────────────────────────────────────┐
  │                   Method                    │                           Purpose                            │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ Object.keys(obj)                            │ Own enumerable property names → Array<String>                │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ Object.values(obj)                          │ Own enumerable property values → Array                       │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ Object.entries(obj)                         │ Key-value pairs → Array<[String, any]>                       │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ Object.create(proto)                        │ Create object with given prototype                           │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ Object.assign(target, ...sources)           │ Copy own properties (shallow merge)                          │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ Object.freeze(obj)                          │ Make object immutable                                        │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ Object.isFrozen(obj)                        │ Check if frozen                                              │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ Object.getPrototypeOf(obj)                  │ Get prototype                                                │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ Object.setPrototypeOf(obj, proto)           │ Set prototype (discouraged, slow)                            │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ Object.defineProperty(obj, key, descriptor) │ Define property with getter/setter/writable/enumerable flags │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ Object.getOwnPropertyNames(obj)             │ All own property names (incl. non-enumerable)                │
  ├─────────────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
  │ Object.hasOwn(obj, key)                     │ Own property check (newer, replaces hasOwnProperty)          │
  └─────────────────────────────────────────────┴──────────────────────────────────────────────────────────────┘

  Instance methods (on Object.prototype):

  ┌─────────────────────┬─────────────────────────────────────────────────────────┐
  │       Method        │                         Purpose                         │
  ├─────────────────────┼─────────────────────────────────────────────────────────┤
  │ hasOwnProperty(key) │ Check own property                                      │
  ├─────────────────────┼─────────────────────────────────────────────────────────┤
  │ toString()          │ String representation                                   │
  ├─────────────────────┼─────────────────────────────────────────────────────────┤
  │ valueOf()           │ Primitive value (used by coercion — irrelevant for GPJ) │
  ├─────────────────────┼─────────────────────────────────────────────────────────┤
  │ isPrototypeOf(obj)  │ Check if in prototype chain                             │
  └─────────────────────┴─────────────────────────────────────────────────────────┘

  Note: Object.length isn't really a thing in JS — you might be thinking of Array.length or Object.keys(obj).length. Objects don't have a .length property.

  For GPJ's minimal surface, the useful subset is probably: keys, values, entries, create, assign, freeze, isFrozen, getPrototypeOf, and hasOwn.
