# Standard library modules

GPJ ships three built-in modules. Import them by bare name — no path prefix.

---

## `http` module

```gpj
import get from "http";

val r = get("https://api.example.com/data");
console.log(r.ok);       # true / false
console.log(r.status);   # 200, 404, ...
console.log(r.text());   # body as String
console.log(r.json());   # body parsed as Object/Array
```

`get` is **synchronous** — it blocks until the response arrives. Throws on
network error (unreachable host, DNS failure, etc.).

An optional second argument is forwarded to `fetch` unchanged:

```gpj
val r = get("https://api.example.com/data", {
  headers: { "Authorization": f"Bearer {token}" },
});
```

Namespace import also works:

```gpj
import * as http from "http";
val r = http.get("https://example.com/");
```

For a complete working program using `http.get`, see `example/gh-ci-stat.gpj`.

---

## `process` module

```gpj
import env, args, exit  from "process";

console.log(env.HOME);     # demo: /example/process-demo.gpj
console.log(args.length);  # argv array length
exit(0);                   # terminate with given exit code
```

`env` is the environment variables object (`process.env`).
`args` is the full argument vector (`process.argv`).
`exit(code)` terminates the process immediately.

Namespace import:

```gpj
import * as proc from "process";
console.log(proc.env.PATH);
proc.exit(1);
```

---

## `fs` module

All operations are **synchronous** and throw on error (file not found,
permission denied, etc.).

```gpj
import readFile, writeFile, exists, readDir, makeDir, removeFile from "fs";

writeFile("/tmp/note.txt", "hello");
console.log(readFile("/tmp/note.txt"));    # hello

console.log(exists("/tmp/note.txt"));      # true
console.log(exists("/tmp/nope.txt"));      # false

val names = readDir("/tmp");               # Array of entry names (not full paths)

makeDir("/tmp/a/b/c");                     # creates nested dirs; no-op if already exists
removeFile("/tmp/note.txt");
```

Namespace import:

```gpj
import * as fs from "fs";
fs.writeFile("/tmp/x.txt", "data");
console.log(fs.readFile("/tmp/x.txt"));
```

### Notes

- `readFile` / `writeFile` use UTF-8 encoding. **FIXME**
- `readDir` returns entry **names** (not full paths); prepend the directory
  yourself: `f"{dir}/{name}"`.
- `makeDir` is recursive — it creates all intermediate directories and does
  not error if the target already exists.
- `removeFile` removes a single file. To remove a directory tree, use the
  `fs` module's underlying Node APIs directly (not yet exposed in GPJ stdlib).
