REPO="bemigot/gpj"
curl -s "https://api.github.com/repos/${repo}/actions/runs?per_page=1" \
  | grep -E '"(status|conclusion)"'
