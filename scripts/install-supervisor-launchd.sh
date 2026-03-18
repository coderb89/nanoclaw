#!/bin/bash
# One-time setup: installs the deploy supervisor launchd plist
set -e

NANOCLAW_DIR="$HOME/nanoclaw"
PLIST_SRC="$NANOCLAW_DIR/launchd/com.nanoclaw.deploysupervisor.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.nanoclaw.deploysupervisor.plist"

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN not set. Export it first:"
    echo "   export GITHUB_TOKEN=your_pat_here"
    exit 1
fi

# Replace placeholder in plist with actual token
sed "s/REPLACE_WITH_GITHUB_PAT/$GITHUB_TOKEN/g" "$PLIST_SRC" > "$PLIST_DST"

# Load it
launchctl load "$PLIST_DST"
echo "✅ Deploy supervisor installed and running (every 10 minutes)"
echo "   Logs: $NANOCLAW_DIR/logs/deploy-supervisor.log"
