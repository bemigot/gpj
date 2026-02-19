# GPJ implementation notes

## Compilation-execution lifecycle

Running a `.gpj` script is a two-phase operation: **compile** (GPJ source → JS text)
then **execute** (spawn Node on the generated file).

```
bin/gpj script.gpj
    │
    └─► node src/cli.js script.gpj
              │
              ├─ fs.readFileSync(script.gpj)        source text
              │
              ├─ lex()         src/lexer.js          token stream
              ├─ parse()       src/parser.js         AST
              ├─ typecheck()   src/typechecker.js    compile-time type errors (exit 1 on failure)
              └─ generate()    src/codegen.js        JS text (ESM)
                      │
                      ├─ write to  /tmp/gpj-XXXX/out.mjs
                      │
                      └─ execFileSync("node", ["/tmp/gpj-XXXX/out.mjs"])
                                │
                                └─ (after node exits) rm -rf /tmp/gpj-XXXX/
```

### Entry points

| File | Role |
|---|---|
| `bin/gpj` | thin POSIX shell shim; resolves the project root and execs `node src/cli.js "$@"` |
| `src/cli.js` | full runner: read source, compile, write tmpfile, run Node, clean up |

### Compilation stages

| Stage | Source file | Input → Output |
|---|---|---|
| Lexer | `src/lexer.js` | source text → token array |
| Parser | `src/parser.js` | tokens → AST |
| Type checker | `src/typechecker.js` | AST → (errors or nothing) |
| Code generator | `src/codegen.js` | AST → JS (ESM) string |

The generated JS always starts with a **runtime preamble** inlined by `codegen.js`:

- `GPJ_STRING_SRC` — patches `String.prototype.at/indexOf/split`; adds `String.compare`
- `GPJ_EQ_SRC` — `__gpj_eq` deep structural equality (always included; needed by array indexOf)
- `GPJ_ARRAY_SRC` — patches `Array.prototype.pop/shift/find/findIndex/indexOf/sort` (always included)
- `GPJ_JSON_SRC` — `JSON.decycle` / `JSON.encycle` for circular structures (always included)
- `GPJ_ADD_SRC` — `__gpj_add`: type-safe `+`, included when `+` or `+=` appears
- `GPJ_ARITH_SRC` — `__gpj_arith`: type-safe arithmetic, included when `-` `*` `/` `%` `**` appear
- `GPJ_TYPEOF_SRC` — `__gpj_typeof`, included when `typeof` or typed-catch appear
- `GPJ_STRUCT_SRC` — `__gpj_isStruct`, included when typed-catch appear

## Where user-imported modules go

### Stdlib (bare name imports)

```
import * as http from "http";
```

Codegen rewrites bare names to an **absolute `file://` URL** pointing to the installed
stdlib directory:

```js
import * as http from "file:///path/to/gpj/src/stdlib/http.js";
```

Stdlib files live in `src/stdlib/` and are plain Node ESM modules.
They are **not** transpiled — they are loaded directly by Node from the source tree.

### Relative user module imports

```
import helper from "./mylib";
```

Codegen appends `.js` and leaves the path relative:

```js
import { helper } from "./mylib.js";
```

Node resolves this relative to the **tmpfile** (`/tmp/gpj-XXXX/out.mjs`), so it looks
for `/tmp/gpj-XXXX/mylib.js`, which does not exist unless the user placed a pre-compiled
`.js` file alongside their source.

**Current limitation:** multi-file GPJ programs (main + local modules) are not yet
handled by the CLI runner.  The test suite works around this in `test/helpers.js`
by transpiling all participating files into the same temp directory before running.

## Inspecting generated code — `GPJ_PRESERVE_OUT`

By default the temp directory is deleted after Node exits.
Set the environment variable `GPJ_PRESERVE_OUT` to any non-empty value to skip
cleanup and print the path:

```
GPJ_PRESERVE_OUT=1 ./example/process-demo.gpj
```

The runner will print (to stderr):

```
gpj: compiled output preserved at: /tmp/gpj-XXXX/out.mjs
```

The generated `.mjs` is plain JavaScript and can be read or re-run with Node directly:

```
node /tmp/gpj-XXXX/out.mjs
```
