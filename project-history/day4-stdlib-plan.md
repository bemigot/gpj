### What the target program needs

The JS original uses async `fetch` + `.then()/.catch()`. GPJ has no Promises (SPEC §12 deliberate omission). The equivalent GPJ program will be synchronous:

```gpj
import * as http from "http";

val url = "https://api.github.com/repos/bemigot/gpj/actions/runs?per_page=1";
try {
  val response = http.get(url, { headers: { "User-Agent": "gpj-fetch" } });
  if (!response.ok) {
    throw { message: f"HTTP error! status: {response.status}" };
  }
  val data = response.json();
  val latestRun = data.workflow_runs[0];
  console.log(f"Status: {latestRun.status}");
  console.log(f"Conclusion: {latestRun.conclusion}");
} catch (e) {
  console.error("Error:", e.message);
}
```

Everything except `http.get` already works in GPJ.

### Architecture notes for STAGE 2

**Steps 32-34 (String/Array/JSON):** purely runtime preamble additions — prototype patching, consistent with how `__gpj_eq`, `__gpj_add`, etc. work today. No import machinery needed. `"hello".at(10)` stays as-is in codegen; the preamble ensures it returns `null` (GPJ `None`) instead of JS `undefined`.

**Step 35 (infrastructure):** the tricky one. Two things need to change:
- `codegen.js`: when import source has no `./`/`../` prefix, rewrite to `new URL("../stdlib/<name>.js", import.meta.url).pathname` (or equivalent) so Node resolves to the bundled stdlib
- `cli.js`: currently uses `new Function(js)()` which can't handle `import`. Needs to write a temp `.js` file and spawn Node instead (same as `execGPJModules` in test helpers)

**Step 36 (http):** sync HTTP in Node.js is done cleanly by spawning a child process that runs async `fetch` and prints the result as JSON to stdout. No curl dependency — uses Node's built-in `fetch` (v18+).

**Steps 37-38 (process/fs):** mostly thin re-export wrappers around Node builtins, already sync.

### What I'm not sure about yet

The **codegen rewrite path** for stdlib imports. Options:
1. Embed the stdlib dir's absolute path at build time (fragile if gpj is moved)
2. Use `import.meta.url` relative to codegen.js (correct, but generated code runs in a temp dir so `import.meta.url` refers to the temp file)
3. Resolve at codegen time using Node's `import.meta.url` from within `codegen.js` itself, embed the resolved absolute path — works cleanly

Option 3 is what I'd go with. Want me to start implementing, or discuss the plan further first?

### When to add file-based e2e tests

**Not yet for steps 32-34.** String/Array/JSON preamble patches are tested fine with inline `execGPJ` strings — same pattern as all steps so far. No new infrastructure needed.

**Step 35 is the natural inflection point.** That's when:
- CLI gains "write temp file + spawn Node" mode
- Import rewriting to `src/stdlib/<name>.js` kicks in
- `process.argv` only makes sense when calling a `.gpj` *file*

A file-based test at step 35 would validate the whole new path: `gpj run test/e2e/step35-imports.gpj` → check stdout. `test/helpers.js` already has `execGPJModules` that writes to a temp dir and spawns Node — we can build on that pattern.

**Step 37 (`process`) makes file-based tests mandatory** — `process.argv` returns the script path, which is meaningless in an inline string context.

**`example/gh-ci-stat.gpj` should stay a manual smoke test**, not in the automated suite — it hits the real GitHub API, so it's flaky and requires network access in CI.

So the plan:
- Steps 32-34: inline strings, existing style
- Step 35: first `test/e2e/` file, testing the import infrastructure with a trivial stdlib import (e.g. `process`)
- Steps 36-38: one e2e file per module
