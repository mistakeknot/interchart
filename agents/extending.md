# Adding New Components

## New Plugin Appears

The scanner auto-discovers plugins in `plugins/*/`. Just add the plugin with a `.claude-plugin/plugin.json` manifest and regenerate. Skills, agents, MCP servers, and hooks are all discovered from the manifest and `hooks/hooks.json`.

## New Node Type

1. Add scan logic in `scan.js` (create nodes with `addNode()`)
2. Add color to `TYPE_COLORS` in `templates/ecosystem.html`
3. Add size to `TYPE_SIZES`
4. Add label to `TYPE_LABELS`

## New Edge Type

1. Add creation logic in `scan.js` (create edges with `addEdge()`)
2. Add CSS class `.link.<type>` in the template `<style>` block

## New Overlap Domain

Add a rule to `OVERLAP_DOMAIN_RULES` in `scan.js`:
```js
{ domain: 'my-domain', weight: 1.0, patterns: [/\bkeyword\b/i] }
```

Or add a forced group to `FORCED_OVERLAP_GROUPS`:
```js
{ domain: 'my-stack', boost: 1.0, ids: ['plugin-a', 'plugin-b', 'plugin-c'] }
```
