#!/usr/bin/env bash
# Watch all Demarch repos for changes and regenerate the diagram.
# Tracks the last-seen commit SHAs — only regenerates when something changed.
#
# Install as cron (every 5 minutes):
#   echo '*/5 * * * * /root/projects/Demarch/interverse/interchart/scripts/watch-and-deploy.sh' | crontab -
#
# Or run as systemd timer for more control.
set -euo pipefail

DEMARCH_ROOT="/root/projects/Demarch"
INTERCHART_DIR="$DEMARCH_ROOT/interverse/interchart"
STATE_FILE="$INTERCHART_DIR/.last-scan-state"

# Build a fingerprint of all repo HEADs
fingerprint=""
for dir in "$DEMARCH_ROOT"/interverse/*/ "$DEMARCH_ROOT"/os/*/ "$DEMARCH_ROOT"/core/*/; do
  [ -d "$dir/.git" ] || continue
  sha=$(git -C "$dir" rev-parse HEAD 2>/dev/null || echo "unknown")
  fingerprint="${fingerprint}${sha}"
done

# Compare with last run
current_hash=$(echo "$fingerprint" | sha256sum | cut -d' ' -f1)
if [ -f "$STATE_FILE" ] && [ "$(cat "$STATE_FILE")" = "$current_hash" ]; then
  exit 0
fi

# Something changed — regenerate
bash "$INTERCHART_DIR/scripts/regenerate-and-deploy.sh" "$DEMARCH_ROOT"
echo "$current_hash" > "$STATE_FILE"
