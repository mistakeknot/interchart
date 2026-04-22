# Testing

No test framework — verify manually:

```bash
# Scanner produces valid JSON with expected counts
node scripts/scan.js "$(cd ../.. && pwd)" 2>/dev/null | \
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const j=JSON.parse(d);
    console.log('Nodes:', j.stats.nodes, 'Edges:', j.stats.edges, 'Overlaps:', j.stats.overlaps);
    console.log('Types:', Object.keys(j.stats.byType).join(', '));
  })"

# Generate HTML and check file exists
bash scripts/generate.sh "$(cd ../.. && pwd)" /tmp/test-ecosystem.html
ls -la /tmp/test-ecosystem.html

# Verify variable ordering (no use-before-define)
node scripts/scan.js "$(cd ../.. && pwd)" 2>/dev/null | \
  bash scripts/generate.sh "$(cd ../.. && pwd)" /tmp/test.html && \
  echo "Generation succeeded"

# Verify publish preflight without dirtying gsvdotcom
bash -n scripts/regenerate-and-deploy.sh
git -C "${GSVDOTCOM_ROOT:-$HOME/projects/gsvdotcom}" rev-parse --show-toplevel
```
