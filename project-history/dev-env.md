## Claude Code plugins
See [rationale](https://claude.ai/share/cb012790-4891-46ed-b75e-65501b532968) (revisit when Zig emerges)
* in terminal `npm install -g @vtsls/language-server typescript` 
* in Claude Code
  ```
  /plugin marketplace add boostvolt/claude-code-lsps

  # https://github.com/boostvolt/claude-code-lsps
  # Bash, C/C++, Go, Java, Kotlin, Python, Rust, Swift, Terraform,.., YAML, Zig
  /plugin install vtsls@claude-code-lsps
  /exit
  # restart
  ```
