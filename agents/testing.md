# Testing

No test framework — verify manually:

```bash
# Scanner produces valid JSON with expected counts
node scripts/scan.js /root/projects/Demarch 2>/dev/null | \
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const j=JSON.parse(d);
    console.log('Nodes:', j.stats.nodes, 'Edges:', j.stats.edges, 'Overlaps:', j.stats.overlaps);
    console.log('Types:', Object.keys(j.stats.byType).join(', '));
  })"

# Generate HTML and check file exists
bash scripts/generate.sh /root/projects/Demarch /tmp/test-ecosystem.html
ls -la /tmp/test-ecosystem.html

# Verify variable ordering (no use-before-define)
node scripts/scan.js /root/projects/Demarch 2>/dev/null | \
  bash scripts/generate.sh /root/projects/Demarch /tmp/test.html && \
  echo "Generation succeeded"
```
