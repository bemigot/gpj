# GPJ

[![Test](https://github.com/bemigot/gpj/actions/workflows/test.yml/badge.svg)](https://github.com/bemigot/gpj/actions/workflows/test.yml)

*JavaScript, done right.*

GPJ is an interpreted, statically-typed language with JavaScript-inspired syntax.
Currently, it transpiles to JavaScript, with targeted deviations where JS got it wrong
— structural equality, no implicit coercion, unified `None`, mandatory whitespace, no operator precedence ambiguity.

See [SPEC.md](SPEC.md) for the full language specification (working draft).

## Status

See [STATUS](STATUS.md) file.

## Running

Requires [Node.js](https://nodejs.org) (LTS v24 recommended).

```
node src/cli.js example/hello.gpj
```

Or add `bin/` to your `PATH` and use the shebang:

```
export PATH=$PWD/bin:$PATH
./example/hello.gpj
```
