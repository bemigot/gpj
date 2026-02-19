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

To inspect the generated JavaScript, set `GPJ_PRESERVE_OUT=1` — the compiled
`.mjs` file is kept instead of being deleted after execution:

```
GPJ_PRESERVE_OUT=1 ./example/process-demo.gpj
# gpj: compiled output preserved at: /tmp/gpj-XXXX/out.mjs
```

Or add `bin/` to your `PATH` and use the shebang:

```
export PATH=$PWD/bin:$PATH

./example/gh-ci-stat.gpj

Project: github.com/bemigot/gpj
branch:  main
commit:  e727012
Status:  completed
Conclusion: success

by: github.com/mz0
created: 2026-02-19T14:06:24Z
started: 2026-02-19T14:06:24Z
updated: 2026-02-19T14:06:41Z
```
