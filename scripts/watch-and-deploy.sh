#!/usr/bin/env bash
# Watch the Sylveste repo for changes and republish interchart into gsvdotcom.
# Tracks the last-seen commit SHAs — only republishes when something changed.
#
# Install as cron (every 5 minutes) from the interchart repo root:
#   echo "*/5 * * * * $(pwd)/scripts/watch-and-deploy.sh" | crontab -
#
# Or run as systemd timer for more control.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INTERCHART_DIR="$(dirname "$SCRIPT_DIR")"
SYLVESTE_ROOT="${1:-$(cd "$INTERCHART_DIR/../.." && pwd)}"
GSVDOTCOM_ROOT="${2:-${GSVDOTCOM_ROOT:-$HOME/projects/gsvdotcom}}"
STATE_FILE="$INTERCHART_DIR/.last-scan-state"

# Build a fingerprint of all repo HEADs
fingerprint=""
for dir in "$SYLVESTE_ROOT"/interverse/*/ "$SYLVESTE_ROOT"/os/*/ "$SYLVESTE_ROOT"/core/*/; do
  [ -d "$dir/.git" ] || continue
  sha=$(git -C "$dir" rev-parse HEAD 2>/dev/null || echo "unknown")
  fingerprint="${fingerprint}${sha}"
done

# Compare with last run
current_hash=$(echo "$fingerprint" | sha256sum | cut -d' ' -f1)
if [ -f "$STATE_FILE" ] && [ "$(cat "$STATE_FILE")" = "$current_hash" ]; then
  exit 0
fi

# Something changed — regenerate and republish
bash "$INTERCHART_DIR/scripts/regenerate-and-deploy.sh" "$SYLVESTE_ROOT" "$GSVDOTCOM_ROOT"
echo "$current_hash" > "$STATE_FILE"
