#!/usr/bin/env bash
# Regenerate the interchart HTML and publish it through gsvdotcom at /interchart/.
# Uses a git worktree for the gsvdotcom repo so it never disturbs the main working tree.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INTERCHART_DIR="$(dirname "$SCRIPT_DIR")"
SYLVESTE_ROOT="${1:-$(cd "$INTERCHART_DIR/../.." && pwd)}"
GSVDOTCOM_ROOT="${2:-${GSVDOTCOM_ROOT:-$HOME/projects/gsvdotcom}}"
TARGET_REL="public/interchart/embed/index.html"
LIVE_URL="https://generalsystemsventures.com/interchart/"
LOCK_FILE="${TMPDIR:-/tmp}/interchart-publish-${UID:-unknown}.lock"

if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    echo "interchart: publish already in progress ($LOCK_FILE)"
    exit 0
  fi
fi

if [ ! -d "$SYLVESTE_ROOT/interverse" ]; then
  echo "interchart: Sylveste root not found at $SYLVESTE_ROOT" >&2
  exit 1
fi

if ! git -C "$GSVDOTCOM_ROOT" rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "interchart: gsvdotcom checkout not found at $GSVDOTCOM_ROOT" >&2
  exit 1
fi

REMOTE_URL=$(git -C "$GSVDOTCOM_ROOT" remote get-url origin 2>/dev/null || true)
case "$REMOTE_URL" in
  *gsvdotcom*) ;;
  *)
    echo "interchart: expected gsvdotcom origin, found '${REMOTE_URL:-<missing>}'" >&2
    exit 1
    ;;
esac

echo "interchart: source=$SYLVESTE_ROOT target=$GSVDOTCOM_ROOT/$TARGET_REL"

canonical_publish_hash() {
  node -e "const fs=require('fs'); const crypto=require('crypto'); let text=fs.readFileSync(process.argv[1], 'utf8'); text=text.replace(/(\"generated\"\s*:\s*\")[^\"]+(\")/, '\$1__CANONICALIZED__\$2'); process.stdout.write(crypto.createHash('sha256').update(text).digest('hex'));" "$1"
}

# Generate to a temp file while refreshing the checked-in scan cache.
TMPHTML=$(mktemp)
trap 'rm -f "$TMPHTML"' EXIT

bash "$SCRIPT_DIR/generate.sh" "$SYLVESTE_ROOT" "$TMPHTML"

SCAN_CACHE="$INTERCHART_DIR/data/scan.json"
NODE_COUNT=$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); console.log(j.stats.nodes);" "$SCAN_CACHE")
EDGE_COUNT=$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); console.log(j.stats.edges);" "$SCAN_CACHE")

# Publish via a temporary worktree on gsvdotcom/main.
WORKTREE_DIR=$(mktemp -d)
trap 'rm -f "$TMPHTML"; git -C "$GSVDOTCOM_ROOT" worktree remove --force "$WORKTREE_DIR" 2>/dev/null; rm -rf "$WORKTREE_DIR"' EXIT

git -C "$GSVDOTCOM_ROOT" fetch --quiet origin main
git -C "$GSVDOTCOM_ROOT" worktree add --quiet --detach "$WORKTREE_DIR" origin/main

# No-op if the published target is unchanged relative to origin/main.
if [ -f "$WORKTREE_DIR/$TARGET_REL" ]; then
  OLD_HASH=$(canonical_publish_hash "$WORKTREE_DIR/$TARGET_REL")
  NEW_HASH=$(canonical_publish_hash "$TMPHTML")
  if [ "$OLD_HASH" = "$NEW_HASH" ]; then
    echo "interchart: no changes for $LIVE_URL"
    exit 0
  fi
fi

mkdir -p "$(dirname "$WORKTREE_DIR/$TARGET_REL")"
cp -f "$TMPHTML" "$WORKTREE_DIR/$TARGET_REL"
git -C "$WORKTREE_DIR" add "$TARGET_REL"
if git -C "$WORKTREE_DIR" diff --cached --quiet; then
  echo "interchart: no changes to publish"
  exit 0
fi
git -C "$WORKTREE_DIR" commit -m "chore: regenerate interchart ($NODE_COUNT nodes, $EDGE_COUNT edges)"
git -C "$WORKTREE_DIR" push origin HEAD:main

echo "interchart: published to $LIVE_URL ($NODE_COUNT nodes, $EDGE_COUNT edges)"
