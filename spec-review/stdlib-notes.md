# Stdlib Implementation Notes

Notes on standard library API design extracted from spec review (review3-Gemini).
These are implementation-level decisions, not language spec changes.

## 1. JSON module

### `JSON.decycle(obj: Unknown): Unknown`

Returns a tree-structured copy where circular references are replaced with
`{ $ref: "path.string" }` objects. Does not mutate the original.

### `JSON.recycle(obj: Unknown): Unknown`

Reciprocal of `decycle`. Walks the tree, resolves `$ref` path strings back into
live references, restoring the original circular structure. Mutates in place.

### `JSON.stringify` behavior

`JSON.stringify` should throw on circular references (matching JS behavior).
The caller is responsible for calling `JSON.decycle` first when serializing graphs.

Reference implementations: `spec-review/review3-Gemini.md` (decycle, recycle functions).

## 2. Object module

### `Object.deepFreeze(obj: Unknown): Unknown`

Recursively applies `Object.freeze` to the object and all reachable nested objects.
Uses a `Set` to track visited nodes, handling circular references safely.
Returns the same object (now frozen).

Reference implementation: `spec-review/review3-Gemini.md` (deepFreeze function).

## 3. Array — API design principles

GPJ's no-coercion, no-ambiguity philosophy affects Array method signatures:

### `Array.pop(): T | None`

Returns `None` on empty array instead of JS's `undefined`.

### `Array.shift(): T | None`

Same principle as `pop`.

### `Array.find(predicate): T | None`

Returns `None` instead of `undefined` when no element matches.

### `Array.indexOf(value): Number | None`

Returns `None` instead of `-1` when the value is not found.
Uses deep equality (`==`), not reference equality.

### `Array.sort(comparator: (a: T, b: T) => Number): Array<T>`

Comparator is **mandatory**. JS's default sort coerces elements to strings,
which produces `[1, 10, 2]` — exactly the kind of implicit behavior GPJ rejects.

```gpj
let nums = [3, 1, 2];
nums.sort((a, b) => a - b);           # explicit: ascending numeric
nums.sort();                           # ERROR — comparator required
```

### `Array.isArray(value: Unknown): Boolean`

Note: with `typeof` now returning `"Array"` for arrays (spec §3.1),
`Array.isArray` may be redundant. `typeof x == "Array"` is the idiomatic check.
Keep `Array.isArray` as a convenience alias if desired.

## 4. String — API design principles

### `String.at(index: Number): String | None`

Returns `None` for out-of-bounds index instead of `undefined`.
Returns a single-codepoint `String` (GPJ has no `char` type).

### `String.indexOf(search: String): Number | None`

Returns `None` instead of `-1` when not found.

### `String.split(separator: String): Array<String>`

Standard split. Separator is required (no implicit split-every-character).

### `String.compare(a: String, b: String): Number`

Static method. Returns `-1`, `0`, or `1`. This is the only way to order strings —
`<`/`>` operators are `Number`-only (spec §8).

## 5. General principle

Where JS stdlib methods return `undefined` for "not found" or "empty", GPJ returns `None`.
Where JS methods return `-1` as a sentinel, GPJ returns `None`.
Where JS methods have implicit default behavior (sort without comparator, split without
separator), GPJ requires the argument explicitly.

This aligns with the spec's core rule: *"When the interpreter cannot unambiguously
determine the type or meaning of an instruction, it halts with a diagnostic —
it never guesses."*
