#!/usr/bin/env bash
# deploy-apply.sh
# Applies a pre-approved Nanoclaw deploy.
# Only runs when /tmp/nanoclaw-deploy-ready exists (written by deploy-supervisor.sh).
# Triggered after user approves via "deploy nanoclaw".

set -euo pipefail

LIVE_DIR="${HOME}/nanoclaw"
DEPLOY_READY_FILE="/tmp/nanoclaw-deploy-ready"
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1483222175488934161/EBOML6v05ZdQrFAfHZqJCmh7nC_H_h2jedWdGc-vHmQXOa4VPr04v_dYlgjUh1AdxgJL"

# ── 1. Check for pending deploy ───────────────────────────────────────────────
if [ ! -f "${DEPLOY_READY_FILE}" ]; then
  echo "[deploy-apply] No pending deploy found (${DEPLOY_READY_FILE} does not exist). Exiting."
  exit 0
fi

APPROVED_SHA=$(cat "${DEPLOY_READY_FILE}")
SHORT_SHA="${APPROVED_SHA:0:7}"

echo "[deploy-apply] Applying deploy for commit ${SHORT_SHA}..."

# ── 2. Pull latest and build in live directory ────────────────────────────────
BUILD_LOG=$(mktemp)
BUILD_STATUS=0

(cd "${LIVE_DIR}" && git pull && npm run build) >"${BUILD_LOG}" 2>&1 || BUILD_STATUS=$?

if [ "${BUILD_STATUS}" -ne 0 ]; then
  FAIL_LOG_SNIPPET=$(tail -n 30 "${BUILD_LOG}" | sed 's/"/\\"/g' | tr '\n' ' ')
  PAYLOAD=$(printf '{"content": "🚨 **DEPLOY APPLY FAILED — Nanoclaw**\n━━━━━━━━━━━━━━━━━━━━━━━━\n📦 Commit: `%s`\n❌ Live build: FAILED\n\n```\n%s\n```\n━━━━━━━━━━━━━━━━━━━━━━━━\nManual intervention may be required."}' \
    "${SHORT_SHA}" "${FAIL_LOG_SNIPPET}")

  curl -s -X POST "${DISCORD_WEBHOOK}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}" >/dev/null

  rm -f "${BUILD_LOG}"
  echo "[deploy-apply] Live build failed. Reported to Discord." >&2
  exit 1
fi

# ── 3. Restart Nanoclaw via launchctl ─────────────────────────────────────────
RESTART_STATUS=0
launchctl kickstart -k "gui/$(id -u)/com.nanoclaw" || RESTART_STATUS=$?

if [ "${RESTART_STATUS}" -ne 0 ]; then
  PAYLOAD=$(printf '{"content": "⚠️ **DEPLOY WARNING — Nanoclaw**\n━━━━━━━━━━━━━━━━━━━━━━━━\n📦 Commit: `%s`\n✅ Build: PASSED\n⚠️ Restart: FAILED (launchctl returned %s)\n\nManual restart may be required.\n━━━━━━━━━━━━━━━━━━━━━━━━"}' \
    "${SHORT_SHA}" "${RESTART_STATUS}")

  curl -s -X POST "${DISCORD_WEBHOOK}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}" >/dev/null

  rm -f "${BUILD_LOG}" "${DEPLOY_READY_FILE}"
  echo "[deploy-apply] Build passed but restart failed. Reported to Discord." >&2
  exit 1
fi

# ── 4. Success ────────────────────────────────────────────────────────────────
PAYLOAD=$(printf '{"content": "✅ **DEPLOY SUCCESS — Nanoclaw**\n━━━━━━━━━━━━━━━━━━━━━━━━\n📦 Deployed commit: `%s`\n✅ Build: PASSED\n🔄 Service restarted successfully\n━━━━━━━━━━━━━━━━━━━━━━━━"}' \
  "${SHORT_SHA}")

curl -s -X POST "${DISCORD_WEBHOOK}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}" >/dev/null

rm -f "${BUILD_LOG}" "${DEPLOY_READY_FILE}"
echo "[deploy-apply] Deploy complete. Commit ${SHORT_SHA} is now live."
