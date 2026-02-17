## Claude Code plugins
See [rationale](https://claude.ai/share/cb012790-4891-46ed-b75e-65501b532968) - also for Zig, Rust, etc.
* in terminal
  * ensure user-private "global" package directory
    ```bash
    NPM_PREFIX="${HOME}/.npm/packages"
    mkdir -p $NPM_PREFIX
    npm config set prefix $NPM_PREFIX
    ```
  * `npm install -g @vtsls/language-server typescript`
  * do something to add NPM-installed binaries (`tsc`, `tsserver`, `vtsls`)to `PATH`
    either `export PATH=$NPM_PREFIX/bin:$PATH`,
    or ensure `MY_BIN="$HOME/.local/bin"` is in PATH, and add symlinks there
    ```
    if echo ":$PATH:" |grep -q ":$MY_BIN:" ; then
       for lnk in "$NPM_PREFIX"/bin/*; do
           name=$(basename "$lnk")
           newlnk="$MY_BIN/$name"
           if [ -L "$newlnk" ] || [ -e "$newlnk" ]; then
               echo "$newlnk already exists. Examine and replace as needed"
           else
              ln -s "$lnk" "$newlnk" && echo "create OK $newlnk"
           fi
       done
    else
       echo "MY_BIN=\"$MY_BIN\" not found in PATH"
    fi
    ```
* in Claude Code
  ```
  /plugin marketplace add boostvolt/claude-code-lsps

  # https://github.com/boostvolt/claude-code-lsps
  # Bash, C/C++, Go, Java, Kotlin, Python, Rust, Swift, Terraform,.., YAML, Zig
  /plugin install vtsls@claude-code-lsps
  /exit
  # restart
  ```
