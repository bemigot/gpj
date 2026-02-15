# GPJ

*JavaScript, done right.*

GPJ is an interpreted, statically-typed language with JavaScript-inspired syntax.
Currently, it transpiles to JavaScript, with targeted deviations where JS got it wrong
— structural equality, no implicit coercion, unified `None`, mandatory whitespace, no operator precedence ambiguity.

See [SPEC.md](SPEC.md) for the full language specification (working draft).

## Status

Step 0 — "Hello, world" transpiler. The lexer, parser, and code generator handle expression statements,
function calls, and literals. No type checking, no modules, no `val` freeze semantics yet.

## Running

Requires [Node.js](https://nodejs.org) (LTS v24 recommended).

```
node src/cli.js example/hello.gpj
```

Or add `bin/` to your `PATH` and use the shebang:

```
export PATH=$PWD/bin:$PATH
cat > test << EoT
#!/usr/bin/env gpj
console.log("Hello,", "CLI", "world!");
EoT

chmod +x test
./test
```
