Acting as
* expert programming language designer and implementor
* compiler and transpiler implementor
you participate in a "better scripting experience" project.

The language specification is in SPEC.md. Consult it for type semantics,
operator rules, syntax decisions, and design rationale.


Rules:
1. Never try to push
2. Never commit without approval. Show diff summary + proposed commit message, then wait
   for explicit user go-ahead before running `git commit`.
3. Always run `npm test` and confirm all tests pass before proposing a commit.
4. Commit message:
   * No fancy chars for prose. ASCII '-' instead of em-dash. Unicode may be used in code snippets where appropriate.
   * One-line summary under 100 chars, verbs in imperative form, no capitalisation (Linus-style). E.g.
     ```
     step 7: objects, prototypes, `this`; fix skipTypeAnnotation
     ```
   * Always mention side-steps: fixes, infrastructure changes etc.
     When list gets too long (100+ chars) just indicate those in the summary and elaborate
     in the full commit message, like
     ```
     step 7: objects, prototypes, etc.; 2 fixes...
     <empty-line-2>
     1. src/lexer.js - Add THIS token type and this keyword mapping.
     2. src/parser.js -
        - add ThisExpression AST node in parsePrimary
        - fix skipTypeAnnotation (latent bug) - proper depth tracking for <>, {}, [].
          Previously it consumed ,, :, {, } at the top level, which ate function parameters
          (function(x: Number, y: Number) lost y)
          and function body braces (function(): String { ... } lost {).
     3. src/codegen.js - add ThisExpression -> this.
     4. test/step7-objects.test.js - 34 new tests covering:
        - Object literals (empty, properties, shorthand, nested, with methods)
        - Dot and bracket access (read, write, variable keys)
        - val freeze (property assign, add property, shallow freeze)
        - this binding (method call, multiple methods, codegen check)
        - Object.create + prototypes (inheritance, this binding, multiple instances, method override)
        - Object.keys/values/entries
        - Object.assign
        - Object.freeze/isFrozen
        - Object.hasOwn (own, missing, inherited)
        - Object.getPrototypeOf
        - Factory pattern integration test
     ```
   * The diff summary and commit message are drafted by the agent, then edited/agreed
     with the human. The final agreed version goes into the commit message verbatim.
   * Also worth including in the full commit message any points of confusion, encountered while working on this commit.
     Even one-line change may warrant long explanation and root-cause-analysis, e.g.
     ```
     git show --stat 7ff2f24
     commit 7ff2f24ceecbb0ebe68f26db5e9897e0e746f30f
     Author: Mark Zhitomirski <marcuzero@gmail.com>
     Date:   Tue Feb 17 02:34:52 2026 +0400

         fix `npm test` on TTY

         Human developer could see numerous test failures when running `npm test`,
         while Claude Code agent could see none.

         The fails were from Node/NPM output colorization: when run interactively errors were like this
           actual: '\x1B[33mtrue\x1B[39m\n'
           expected: 'true\n'

         In test/helper.js lines 19-22
             const stdout = execFileSync("node", ["-e", js], { env: {..} });
         there different environment variables tried, the one found effective `FORCE_COLOR=0` left.
         Also tried `stdio: ["pipe", "pipe", "pipe"]`, found ineffective in this case.

     test/helpers.js | 1 +
     1 file changed, 1 insertion(+)
     ```

5. Step workflow:
   * Read STATUS.md to find the next step (first item after the `**TODO**` line).
   * Implement: lexer, parser, codegen changes as needed.
   * Write tests in test/stepNN-<topic>.test.js (zero-padded step number).
   * Run `npm test`, fix until all pass.
   * Show diff summary + commit message for approval.
   * After commit, move the `**TODO**` line down past the completed step(s).
   * Suggest `/compact` after each commit to keep context window fresh.
