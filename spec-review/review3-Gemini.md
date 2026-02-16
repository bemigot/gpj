This **GPJ** proposal is a fascinating exercise in "opinionated distillation." You’ve essentially taken a scalpel to JavaScript’s 30 years of baggage and kept only the organs that actually work, while grafting on safety features from languages like Swift, Rust, and Python.

As an AI that has to "read" a lot of messy code, I have some thoughts on where this hits the mark and where it might face friction in a general scripting context.

---

### The "Big Wins" (What JS should have been)

* **The Unified `None`:** Eliminating the `null` vs. `undefined` duality is perhaps the single greatest gift you could give a developer. It removes an entire category of "logic-by-accident."
* **Deep Equality by Default (`==`):** This is a bold and welcome move. In scripting, we almost always care about the *value* of the data, not the memory address. Making `==` recursive by default aligns the language with human intuition rather than pointer logic.
* **`val` and Shallow Freezing:** Implementing `val` as a shallow freeze is a clever middle ground. It provides "immutability-lite" that prevents the most common bug in JS: accidentally mutating an object passed into a function.
* **Structural Catch Blocks:** This is a sophisticated advancement. JS's `catch (e)` is notoriously "blind." Allowing the runtime to dispatch errors based on their shape (`HttpError` vs. `ValueError`) makes error handling feel first-class.

---

### The "Controversial" Choices (The Friction Points)

#### 1. No Operator Precedence

> "Expressions combining different binary operators must be explicitly parenthesized."

This is your most radical departure. While it eliminates the "precedence table" mental tax, it might make mathematical scripting feel verbose.

* **The Friction:** Writing `let x = (a * b) + c;` is fine, but complex formulas will look like Lisp with more characters.
* **The Upside:** It forces clarity. No one has to remember if `<<` binds tighter than `&`.

#### 2. Parser-Enforced Whitespace

Enforcing spaces around operators and inside braces at the **parser level** (rather than the linter) is a "Big Brother" move that would make Pythonistas proud but might frustrate "quick and dirty" scripters.

* **The REPL Problem:** In an interactive REPL, being rejected for `1+1` instead of `1 + 1` can feel like a "pedantry tax." Have you considered allowing the REPL to be more relaxed than the script runner?

#### 3. The `this` Binding Rule

> "Methods must be called immediately when accessed."

This is a brilliant "simple fix" for the most confusing part of JS. By banning the detachment of methods from their objects (`let fn = v.length`), you've killed the need for `.bind(this)` or "the self-pattern" entirely. It's a syntactic solution to a semantic nightmare.

---

### Comparison: GPJ vs. PureScript

Since you asked about PureScript earlier, here is how GPJ sits in relation to it:

| Feature          | PureScript                         | GPJ                                 |
|------------------|------------------------------------|-------------------------------------|
| **Philosophy**   | Mathematical Purity (Haskell-lite) | Pragmatic Refinement (JS-Corrected) |
| **Objects**      | Row Polymorphism (Complex)         | Structural Typing (Intuitive)       |
| **Side Effects** | Explicitly tracked in types        | Implicit (like standard JS)         |
| **Equality**     | Type-class based (`eq`)            | **Deep Equality by default**        |

GPJ is much more "approachable" than PureScript. You’ve kept the **mental model of JavaScript** (imperative, object-oriented, prototype-based) but added the **guardrails of a modern static language.**

---

### Questions for the Author

1. **The "None" Coalesce:** Since you have `None`, will you provide a "null-coalescing" operator (like `??` in JS) to handle defaults easily, or does the lack of implicit coercion forbid that?
2. **Circular References:** You mentioned `==` throws an error on circular references. In scripting (like processing complex JSON-like graphs), this is common. Why not return `false` or use a "seen" set during the deep-equal pass instead of halting?
3. **The `_` Private Rule:** If I use `Object.assign` to mix properties into an object, does the "lexical literal" rule effectively break my ability to keep those properties private?

**Would you like me to take a crack at writing a sample "Filesystem Utility" script in GPJ to see how the syntax holds up in a real-world scenario?**

## On JSON and circular references
* Tell me about circular references in JSON: where do they come from, and why they are useful?
  How they are dealt with naturally?

* The problem with circular references is that they are perfectly natural in memory but an absolute nightmare for serialization. Since your **GPJ** proposal currently halts with an error upon detecting them during deep equality checks, understanding why developers "tolerate" them is key to deciding if you want to keep that strict behavior.

---

### 1. Where do they come from?

Circular references occur when an object refers to itself, either directly or through a chain of other objects.

* **Bidirectional Relationships:** The most common source. In a Document Object Model (DOM), a `parent` node has a list of `children`, and each `child` has a `parent` property pointing back to the parent.
* **Graph Data Structures:** Any non-hierarchical data (like a social network or a map of flight paths) inherently uses cycles. If User A follows User B, and User B follows User A, you have a cycle.
* **Self-Referencing State:** Occasionally, an object might have a "default" or "current" property that points back to itself to simplify logic (e.g., a state machine where a "Home" state transitions to "Home").

---

### 2. Why are they useful?

If cycles are such a pain for JSON, why not just ban them in memory? Because they solve two major problems:

* **O(1) Back-Navigation:** Without a circular reference, if you are looking at a "Child" object, you have no way to know who its "Parent" is without searching the entire tree. A `parent` pointer makes navigation instant.
* **Data Integrity:** They allow you to maintain a "single source of truth." Instead of copying a parent's data into every child (which leads to "stale" data if the parent changes), every child simply points to the exact same parent object in memory.

---

### 3. How are they "naturally" dealt with?

Since standard JSON (`JSON.stringify`) simply gives up and throws an error when it hits a cycle, developers use a few standard "natural" workarounds:

#### The "ID" Normalization (Database Style)

Instead of storing the actual object, you store its ID.

* **Structure:** `{ id: 1, parentId: 5 }`.
* **Pros:** Perfectly serializable and works in almost every language.
* **Cons:** You lose the ability to do "dot-access" (`child.parent.name`) and must perform a lookup in a separate Map or array.

#### The "Decycle" Pattern (Crockford’s Solution)

Douglas Crockford (the father of JSON) proposed a "decycle" function that replaces circular references with a special path string or object.

* **Original:** `parent.child.parent = parent;`
* **Decycled:** `{"name": "Parent", "child": {"parent": {"$ref": "$"}}}`
* **Utility:** This allows you to "flatten" the object into JSON and "recycle" it back into a circular live object later.

#### The "WeakMap" Traversal

When writing custom logic—like your GPJ `==` operator—the standard way to handle cycles without crashing is to maintain a `Seen` list (usually a `WeakMap` for performance).

1. Before comparing an object, check if it's in the `Seen` list.
2. If yes, you’ve hit a cycle; return `true` (if the paths match) or skip it.
3. If no, add it to the list and continue.

---

### The GPJ case

In your **GPJ Spec**, you noted:

> "Circular references are detected at runtime and cause an error."

While this is "safe," it might make GPJ difficult for complex data processing. If a user tries to compare two nodes in a graph, the language will crash rather than just telling them "No, these are different."

**Would you like to see how you could modify your GPJ equality logic to support circular references without crashing?**

* > yes, please. And tell me where it differs from Decycle Pattern

* To handle circular references in your **GPJ** equality logic without crashing, you move from a simple recursive call to a **"Stateful Traversal."** In the context of your transpiler, which maps nearly directly to JS, the `==` operator would trigger a generated helper function. Instead of simply checking properties, this helper maintains a "stack" or a "seen map" of pairs it is currently comparing.

### 1. The GPJ Safe Equality Logic

If you were to refine your spec to support cycles, the logic would change from "halt on error" to "assume truth on re-encounter."

**The logic works like this:**

1. **Check Identity:** If `a` and `b` are the same reference, return `true`.
2. **Check Primitives:** Use strict equality for numbers, strings, etc.
3. **Check the "Seen" Registry:** Before diving into an object's properties, look at a registry of pairs `(a, b)` currently being compared.
4. **The "Assume True" Shortcut:** If the pair `(a, b)` is already in the registry, return `true`. This isn't because you know they are equal yet, but because you are already in the middle of proving it. If any *other* property fails, the whole thing will still return `false`.
5. **Recursive Step:** Add `(a, b)` to the registry, then compare all "own properties".

---

### 2. How this differs from the Decycle Pattern

While both deal with circularity, they serve entirely different purposes in a language's lifecycle.

| Feature           | GPJ Safe Equality (`==`)                                     | Decycle Pattern                                                                    |
|-------------------|--------------------------------------------------------------|------------------------------------------------------------------------------------|
| **Primary Goal**  | Comparison/Validation.                                       | Serialization/Storage.                                                             |
| **Action**        | Navigates the graph to find a "Truth" value.                 | Transforms a graph into a tree (JSON-compatible).                                  |
| **Data Mutation** | **None.** The objects remain exactly as they were in memory. | **High.** It replaces references with "pointer" strings like `{"$ref": "$"}`.      |
| **Recovery**      | Instant. The function returns a `Boolean`.                   | Requires a "Recycle" step to turn the JSON back into a live circular object.       |
| **Runtime Cost**  | Transient. The "Seen" map is discarded after the comparison. | Persistent. The resulting JSON string is what gets saved or sent over the network. |

### 3. Why the "Assume True" logic works

It feels counter-intuitive to return `true` just because you've seen something before. However, in **GPJ**, which relies on structural equality, you only reach that "seen" check if you are already deep inside a recursive loop.

If you have:

* `Object A` which points to itself.
* `Object B` which points to itself.

When `==` compares `A` and `B`, it checks their values. Then it sees `A.self` and `B.self`. It asks, "Are these equal?" Since it's already busy comparing `A` and `B`, it says "Assuming yes for now" and continues. If there were a *different* property—say `A.name = "Alpha"` and `B.name = "Beta"`—the equality check would have already failed and returned `false` before the cycle even mattered.

### 4. Refining your SPEC.md

If you wanted to update Section 8 of your proposal, you might change the wording to:

> "For objects and arrays, `==` performs deep recursive comparison. Circular references are tracked during traversal; if a pair of objects is encountered a second time within the same comparison stack, they are considered equal for that branch to prevent infinite recursion."

**Would you like me to write a GPJ implementation of a `decycle` function that follows your new structural rules?**

* do please

* Here is how you would implement a `decycle` function in **GPJ**. This implementation leverages your proposal's unique features: **structural typing**, **Map with deep equality**, and **explicit None**.

### 1. GPJ Implementation of `decycle`

This function transforms a circular object into a tree by replacing repeating references with a path string.

```gpj
# GPJ doesn't have a standard 'any' - we use Unknown for the generic object
function decycle(root: Unknown): Unknown {
  val paths: Map<Object, String> = Map.of();

  function deref(obj: Unknown, path: String): Unknown {
    # Narrowing: only objects can have circular references
    if (typeof obj != "Object") {
      return obj;
    }

    # If we've seen this object before, return the path string
    if (paths.has(obj)) {
      return { $ref: paths.get(obj) };
    }

    # Record the path to this object
    paths.set(obj, path);

    # Create a new version of the object/array to avoid mutating the original
    if (Array.isArray(obj)) {
      let nuArr: Array<Unknown> = [];
      for (let i = 0; i < obj.length; i = i + 1) {
        nuArr.push(deref(obj[i], path + "[" + String(i) + "]"));
      }
      return nuArr;
    } else {
      let nuObj: { [key: String]: Unknown } = {};
      val keys = Object.keys(obj);
      for (let key of keys) {
        nuObj[key] = deref(obj[key], path + "." + key);
      }
      return nuObj;
    }
  }

  return deref(root, "$");
}

```

---

### 2. Why this differs from the "Safe Equality" Logic

While both handle cycles, they represent two different philosophies of "Better JavaScript":

| Feature                | GPJ Safe Equality (`==`)                       | The Decycle Pattern                                           |
|------------------------|------------------------------------------------|---------------------------------------------------------------|
| **Philosophy**         | **Intelligent Traversal**                      | **Data Transformation**                                       |
| **Nature**             | Built-in language protocol.                    | User-land utility function.                                   |
| **Output**             | A `Boolean` (Yes/No).                          | A new, serialized `Object` tree.                              |
| **Reference Identity** | Considers `(A, B)` pairs to find a match.      | Considers the object's unique memory address to find a cycle. |
| **Use Case**           | Logic gates (e.g., `if (state == prevState)`). | Storage and Networking (e.g., `JSON.stringify`).              |

### 3. Impact on your SPEC.md

To make your GPJ proposal robust for scripting, I recommend these slight tweaks to the **Section 8 (Operators)** and **Section 2.2 (Map)**:

* **Update Section 8:** Clarify that `==` handles cycles via a "visit registry" during the deep recursive comparison. This ensures that comparing two complex DOM-like structures doesn't crash the script.
* **Update Section 2.2:** Since you mentioned `Map` uses deep equality for keys, ensure you specify that using a circular object *as a key* is supported via the same "safe traversal" logic.

**Would you like me to draft a "Recycle" function for GPJ that can take these `$ref` strings and turn them back into live circular objects?**

* **>** just to clarify: Recycle function is a reciprocal to decycle() above? If so, go ahead

* Yes, **Recycle** is the exact reciprocal to `decycle()`. While `decycle` flattens a graph into a tree for serialization, `recycle` takes that tree and "restores the wiring" by turning `$ref` strings back into live memory pointers.

In **GPJ**, this is an excellent test of your **`Unknown`** type and **type narrowing** rules.

---

### 1. GPJ Implementation of `recycle`

This function walks the tree, finds every object with a `$ref` property, and replaces it with a pointer to the actual object at that path.

```gpj
function recycle(root: Unknown): Unknown {
  # Internal helper to resolve the path strings (e.g., "$.user.profile")
  function getByPath(target: Unknown, path: String): Unknown {
    let parts = path.split("."); # Assume String.split is in stdlib
    let current = target;

    # Skip the "$" root symbol
    for (let i = 1; i < parts.length; i = i + 1) {
      if (typeof current == "Object") {
        current = current[parts[i]];
      }
    }
    return current;
  }

  function walk(obj: Unknown): Unknown {
    # Narrowing: We only care about objects/arrays
    if (typeof obj != "Object" || obj == None) {
      return obj;
    }

    # Check for the $ref signature
    # GPJ structural typing allows checking property existence
    if (Object.hasOwn(obj, "$ref")) {
      # Cast/Narrow to access the String property
      let path = obj["$ref"];
      if (typeof path == "String") {
        return getByPath(root, path);
      }
    }

    # Recursively process Arrays or Objects
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i = i + 1) {
        obj[i] = walk(obj[i]);
      }
    } else {
      val keys = Object.keys(obj); # Use Object.keys as per Spec
      for (let key of keys) {
        obj[key] = walk(obj[key]);
      }
    }
    return obj;
  }

  return walk(root);
}
```

---

### 2. How this validates your GPJ Design

Implementing these two functions highlights several strengths and "sharp edges" in your current draft:

* **The Power of `Unknown`:** Your spec's requirement to narrow `Unknown` before use prevents the `recycle` function from accidentally trying to walk a `Number` or `Boolean`.
* **Method Call Rule:** The rule that methods must be called immediately (`obj.method()`) works perfectly here for `Object.keys(obj)` and `Object.hasOwn(obj, key)`.
* **The `val` vs `let` Constraint:** Note that `recycle` **requires** `let` (mutable) bindings or objects. If you pass a `val` (frozen) object into a recycler, it will fail because you cannot "wire up" the references after the object is created.

### 3. A Minor Conflict in your Spec?

In **Section 4**, you mention that `val` shallow-freezes a value. This creates a "bootstrapping" problem for circular references:

1. To have a circular reference, you usually need to create the object first, then set its property to itself.
2. If you use `val`, the object is frozen immediately upon assignment.
3. **Result:** You cannot easily create circular structures using `val`. They almost exclusively require `let`.

**Would you like me to suggest a "Builder Pattern" for GPJ that allows you to create circular references that become immutable `val` objects only after they are fully wired up?**

* **>** do please

* To solve the "freezing problem" in **GPJ**, you need a way to build complex, self-referential data structures without violating the rule that **`val`** bindings are immutable and frozen.

The **Builder Pattern** (or a "deferred freeze") allows you to maintain the integrity of your type system while still supporting the "true nature" of graph-based data.

### 1. The GPJ Builder Pattern

In this pattern, you use a temporary `let` binding to wire up your circular references
and then "commit" the structure to a `val` binding, which triggers the shallow freeze.

```
# 1. Create mutable 'let' bindings for the construction phase
let parent = { name: "Root", child: None };
let child = { name: "Leaf", parent: None };

# 2. Wire the circular references
parent.child = child;
child.parent = parent;

# 3. "Commit" to an immutable 'val'
# In GPJ, assigning a mutable object to a 'val' binding
# shallow-freezes the value.
val immutableRoot = parent;

immutableRoot.name = "New Name"; # ERROR: value is frozen
```

---

### 2. Handling Deep Circularity with `Object.freeze()`

Since your spec states that `val` and `Object.freeze()` are **shallow**, a circular structure presents a unique challenge: even if `parent` is frozen, `parent.child` is technically a different object that remains mutable unless it was also explicitly frozen or bound to a `val`.

To create a truly "safe" circular script, you would likely want a utility for **Deep Freeze** that understands cycles:

```typescript
function deepFreeze(root: Unknown): Unknown {
  val seen: Set<Object> = Set.of(); //# GPJ Sets use deep equality

  function freeze(obj: Unknown): None {
    if (typeof obj != "Object" || obj == None || Object.isFrozen(obj)) {
      return None;
    }

    if (seen.has(obj)) {
      return None;
    }

    seen.add(obj);

    # Freeze the current level
    Object.freeze(obj);

    # Recursively freeze properties
    for (let key of Object.keys(obj)) {
      freeze(obj[key]);
    }
  }

  freeze(root);
  return root;
}
```

---

### 3. Philosophical Alignment with GPJ

This approach preserves your "No Ambiguity" principle:

* **Explicit State Transition:** An object isn't "magically" immutable; it becomes so either by being bound to a `val` or via an explicit `Object.freeze()` call.
* **Safety via Set:** By using your built-in `Set` (which handles objects based on equality) to track visited nodes, the `deepFreeze` function avoids the infinite loops that would otherwise plague a "Better JavaScript".
* **Structural Integrity:** Since `==` in GPJ is structural and recursive, two different circular "frozen" graphs can still be compared for equality accurately, even if they were built at different times.

### Summary of the "Reciprocal" Workflow

1. **`decycle()`**: Convert your circular graph into a serializable tree.
2. **`JSON.stringify()`**: Turn that tree into a string for a file or network.
3. **`JSON.parse()`**: Turn the string back into a tree.
4. **`recycle()`**: Re-wire the `$ref` strings back into circular memory references.
5. **`deepFreeze()`**: Seal the entire structure into a `val` to ensure it remains a "constant" for the rest of your script.

**Would you like me to help refine the "Module" section of your spec to define how these standard utilities (like `decycle` or `deepFreeze`) should be exported?**

* **>** Yes, please give me the revised parts of the Specification
* To accommodate the "true nature" of JavaScript while providing the safety of a modern scripting language, here are the revised sections for your **GPJ Language Proposal**. These changes integrate the logic for circular references, deep equality, and standard utility patterns.

---

## Revised Section 8: Operators

**Equality:** `==`, `!=` perform **structural, deep recursive comparison** for all types. For objects, arrays, and tuples, the interpreter compares own properties and values recursively.

* **Circular Reference Handling:** During an equality check, the interpreter maintains a registry of object pairs currently being compared. If the same pair `(a, b)` is encountered again within the same comparison stack, they are treated as equal for that branch to prevent infinite recursion.
* **Prototype Identity:** While `==` is structural, the prototype of an object can be compared explicitly using `Object.getPrototypeOf(a) == Object.getPrototypeOf(b)`.
* **Optimization:** If the type checker proves both operands are primitives, `==` emits as a strict reference check (JS `===`).

**No Operator Precedence:** Expressions combining different binary operators MUST be explicitly parenthesized. Chaining the same operator is allowed (except for comparison operators) and is left-associative.

---

## Revised Section 10: Modules & Standard Utilities

GPJ uses named exports and explicit imports. To support robust data handling, the following utilities are exported from the core `Object` and `JSON` modules.

### 10.1 Serialization Patterns

Standard practice for circular data involves "decycling" before storage.

* **`JSON.decycle(obj: Unknown): Unknown`**: Returns a tree-structured copy of an object where circular references are replaced with `{ "$ref": "path.to.obj" }`.
* **`JSON.recycle(obj: Unknown): Unknown`**: The reciprocal of `decycle`; restores circular references by resolving `$ref` strings back into memory pointers.

### 10.2 Immutability Patterns

Because `val` bindings provide shallow freezing, deep immutability for graphs requires a recursive approach.

* **`Object.deepFreeze(obj: Unknown): Unknown`**: Recursively applies `Object.freeze` to the object and all its properties. It uses a `Set` to track visited objects and safely handle circularity.

---

## Revised Section 4: Declarations (Note on Circularity)

`val` makes the binding immutable and **shallow-freezes** the value.

* **Note on Bootstrapping:** To create a circular structure that is also immutable, the structure must be wired using `let` bindings first. Once the references are established, the structure can be "committed" to immutability by assigning the root to a `val` or calling `Object.deepFreeze()`.

```gpj
let node = { value: 1, self: None };
node.self = node; # Wiring circularity
val frozenNode = node; # Now immutable and frozen

```

---

## Updated Section 11: Standard Library (Additions)

* **Object**:
* `Object.deepFreeze(obj)` — Recursively freezes an object graph.
* `Object.isFrozen(obj): Boolean` — Returns `true` if the object is frozen.


* **JSON**:
* `JSON.parse(s: String): Unknown` — Standard parsing.
* `JSON.stringify(obj: Unknown): String` — Fails on circular references; use `decycle` first.
* `JSON.decycle(obj)` — Prepares circular graphs for stringification.
* `JSON.recycle(obj)` — Restores circularity after parsing.



**Would you like me to draft a sample "GPJ Test Suite" that demonstrates these circular equality and serialization rules in action?**

* **>** go ahead
* Here is a sample **GPJ Test Suite** designed to exercise the new circularity logic, serialization patterns, and deep equality rules. This script demonstrates how the language handles the "true nature" of objects while maintaining strict type safety.

```typescript
#!/bin/env gpj
# GPJ Test Suite: Circularity, Equality, and Serialization

import * as JSON from "JSON";
import * as Object from "Object";

# 1. Setup a circular graph using 'let' for bootstrapping
let user = { name: "Alice", friend: None };
let friend = { name: "Bob", friend: user };
user.friend = friend;

# 2. Test Deep Equality with Cycles
# Create an identical but distinct graph
let user2 = { name: "Alice", friend: None };
let friend2 = { name: "Bob", friend: user2 };
user2.friend = friend2;

# This should be true due to recursive structural comparison
# and the visit registry preventing infinite loops.
if (user == user2) {
    console.log("Test 1 Passed: Structural equality handles cycles.");
}

# 3. Test Serialization via Decycle
# JSON.stringify(user) would fail here; we must decycle first.
val tree = JSON.decycle(user);
val jsonString = JSON.stringify(tree);

console.log("Serialized JSON:", jsonString);

# 4. Test Round-trip via Recycle
let parsed = JSON.parse(jsonString);
let restored = JSON.recycle(parsed);

# Verify the restored object is structurally equal to the original
if (restored == user) {
    console.log("Test 2 Passed: Round-trip serialization successful.");
}

# 5. Test Immutability and Deep Freeze
Object.deepFreeze(user);

try {
    user.name = "Malice";
} catch (e) {
    # Any object with a 'message: String' is a valid Error.
    console.log("Test 3 Passed: Caught mutation on frozen circular graph:", e.message);
}

# 6. Test Type Narrowing on Unknown
function process(input: Unknown) {
    if (typeof input == "Object") {
        # input is now narrowed to Object; we can check keys
        console.log("Object keys:", Object.keys(input));
    }
}

process(user);

```

### Analysis of the Test Results

* **Recursive Equality:** Unlike standard JavaScript where `user == user2` would be `false` (reference check), GPJ correctly identifies them as the same "data".
* **Safety Guards:** The `try/catch` block demonstrates that `Object.deepFreeze` correctly traversed the cycle and protected both `Alice` and `Bob` from mutation.
* **Explicit Serialization:** By requiring `JSON.decycle`, GPJ avoids the "Magic/Hidden" behavior of other languages, making the data transformation explicit to the scripter.

Here's a draft of "Standard Library" reference sheet for the `String` and `Array` methods
to ensure they match this high-safety, no-coercion philosophy

This consolidated specification incorporates our discussions on circularity, structural equality, and the refined standard library. This version serves as the baseline for **GPJ v0.0.1**.

# GPJ Language Specification v0.0.1

## 1. Core Philosophy

GPJ (General Purpose JavaScript) is designed for scripting with three pillars: **Explicit Logic**, **Structural Integrity**, and **Zero Ambiguity**. It distills JavaScript's prototype-based nature into a strictly-evaluated, statically-checked environment.

---

## 2. Type System & Values

### 2.1 Unified Absence

There is no `null` or `undefined`. The single value **`None`** represents the absence of a value.

### 2.2 Equality and Circularity

* **`==` and `!=**`: Perform **deep structural comparison**.
* **Cycle Handling**: The interpreter tracks visited object-pairs during comparison. If a cycle is detected (the same pair is encountered again), the branch is treated as equal to prevent infinite recursion.
* **Identity**: To check if two variables point to the same memory address, use `Object.is(a, b)`.

### 2.3 Object Prototypes

Objects are created via literals or `Object.create(proto)`. Structural types are inferred. Private properties are denoted by a leading underscore (e.g., `_secret`), making them lexically invisible outside the defining module.

---

## 3. Declarations & Immutability

* **`let`**: Mutable binding.
* **`val`**: Immutable binding. Assigning an object to a `val` performs a **shallow freeze**.
* **Bootstrapping Graphs**: Circular references must be wired using `let`. Once established, use `Object.deepFreeze(root)` to secure the entire graph.

---

## 4. Syntax & Formatting (Parser-Enforced)

To ensure readability, the parser rejects code that lacks standardized whitespace:

* Mandatory spaces around binary operators: `a + b`, not `a+b`.
* Mandatory spaces inside braces: `{ name: "Alice" }`.
* **No Operator Precedence**: Different operators in one expression must be parenthesized: `(a * b) + c`.

---

## 5. Revised Standard Library

### 5.1 The JSON Module

To handle JavaScript's "true nature" (graphs) in a tree-based format (JSON):

* **`JSON.decycle(obj)`**: Replaces circular references with path strings: `{ "$ref": "$.friend" }`.
* **`JSON.recycle(tree)`**: Restores a decycled object into a live circular graph.
* **`JSON.stringify(obj)`**: Throws an error if cycles are present; enforces the use of `decycle`.

### 5.2 Arrays & Strings

Methods return **`None`** instead of failing silently or returning magic numbers like `-1`.

* **`Array.pop()`**: Returns `T | None`.
* **`Array.sort(comparator)`**: Comparator is **mandatory**. No default string-casting.
* **`String.at(index)`**: Returns `String | None`.

### 5.3 The Object Module

* **`Object.deepFreeze(obj)`**: A cycle-aware recursive freeze utility.
* **`Object.keys(obj)`**: Returns an array of own-property keys.

---

## 6. Error Handling

Structural `try/catch` allows matching errors by shape rather than just identity:

```gpj
try {
    val data = fs.readFile("config.json");
} catch (e: { code: "ENOENT" }) {
    console.log("File missing.");
} catch (e) {
    console.log("Unknown error: " + e.message);
}

```

---

## 7. Deliberate Omissions (The "Clean-up")

* **No Implicit Coercion**: `1 + "1"` is a compile-time error. Use `1 + Cast.toNumber("1")`.
* **No `this` context traps**: Methods cannot be detached from their objects. `val fn = obj.func` is invalid; use `val fn = () => obj.func()`.
* **No Hoisting**: Variables and functions must be declared before use.

---

### Implementation Note for the Transpiler

The prototype `gpj` transpiler converts `a == b` into a call to a runtime helper `__gpj_equals(a, b)`, which implements the seen-pair registry for circular safety. `val` is transpiled to a `const` followed by an immediate `Object.freeze()`.

**This concludes the v0.0.1 Specification.**


