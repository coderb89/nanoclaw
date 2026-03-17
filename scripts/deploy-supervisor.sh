#!/usr/bin/env bash
# deploy-supervisor.sh
# Checks for new commits on GitHub main vs locally deployed version.
# If a new commit is found, tests it in a sandbox and reports via Discord.
# Does NOT touch the live instance — approval is required separately.

set -euo pipefail

REPO="coderb89/nanoclaw"
LIVE_DIR="${HOME}/nanoclaw"
SANDBOX_DIR="/tmp/nanoclaw-sandbox-test"
DEPLOY_READY_FILE="/tmp/nanoclaw-deploy-ready"
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1483222175488934161/EBOML6v05ZdQrFAfHZqJCmh7nC_H_h2jedWdGc-vHmQXOa4VPr04v_dYlgjUh1AdxgJL"

# ── 1. Determine current deployed commit ────────────────────────────────────
if [ ! -d "${LIVE_DIR}/.git" ]; then
  echo "[deploy-supervisor] Live directory ${LIVE_DIR} is not a git repo. Exiting." >&2
  exit 1
fi

LOCAL_SHA=$(git -C "${LIVE_DIR}" rev-parse HEAD)

# ── 2. Fetch latest commit SHA from GitHub ───────────────────────────────────
REMOTE_SHA=$(gh api "repos/${REPO}/commits/main" --jq '.sha')

if [ -z "${REMOTE_SHA}" ]; then
  echo "[deploy-supervisor] Could not fetch remote SHA. Exiting." >&2
  exit 1
fi

# ── 3. Compare ───────────────────────────────────────────────────────────────
if [ "${LOCAL_SHA}" = "${REMOTE_SHA}" ]; then
  # No new commit — exit silently
  exit 0
fi

SHORT_SHA="${REMOTE_SHA:0:7}"
COMMIT_MSG=$(gh api "repos/${REPO}/commits/main" --jq '.commit.message' | head -n 1)

echo "[deploy-supervisor] New commit detected: ${SHORT_SHA} — ${COMMIT_MSG}"

# ── 4. Set up sandbox ────────────────────────────────────────────────────────
rm -rf "${SANDBOX_DIR}"
git clone "https://github.com/${REPO}.git" "${SANDBOX_DIR}"

# ── 5. Run sandbox build ─────────────────────────────────────────────────────
BUILD_LOG=$(mktemp)
BUILD_STATUS=0

(cd "${SANDBOX_DIR}" && npm install && npm run build) >"${BUILD_LOG}" 2>&1 || BUILD_STATUS=$?

# ── 6. Report result via Discord ─────────────────────────────────────────────
if [ "${BUILD_STATUS}" -ne 0 ]; then
  # Build FAILED — report and exit without touching live instance
  FAIL_LOG_SNIPPET=$(tail -n 30 "${BUILD_LOG}" | sed 's/"/\\"/g' | tr '\n' ' ')
  PAYLOAD=$(printf '{"content": "🚨 **DEPLOY FAILED — Nanoclaw**\n━━━━━━━━━━━━━━━━━━━━━━━━\n📦 Commit: `%s` — %s\n❌ Sandbox build: FAILED\n\n```\n%s\n```\n━━━━━━━━━━━━━━━━━━━━━━━━\nLive instance unchanged."}' \
    "${SHORT_SHA}" "${COMMIT_MSG}" "${FAIL_LOG_SNIPPET}")

  curl -s -X POST "${DISCORD_WEBHOOK}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}" >/dev/null

  rm -f "${BUILD_LOG}"
  echo "[deploy-supervisor] Build failed. Reported to Discord. Live instance untouched." >&2
  exit 1
fi

# Build PASSED — post approval request and create ready-file
PAYLOAD=$(printf '{"content": "🔱 **DEPLOY REPORT — Nanoclaw Update Ready**\n━━━━━━━━━━━━━━━━━━━━━━━━\n📦 New commit: `%s` — %s\n✅ Sandbox build: PASSED\n\nReady to deploy to live instance.\nReply with: `deploy nanoclaw`\nTo skip: ignore this message\n━━━━━━━━━━━━━━━━━━━━━━━━"}' \
  "${SHORT_SHA}" "${COMMIT_MSG}")

curl -s -X POST "${DISCORD_WEBHOOK}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}" >/dev/null

# Write commit SHA to ready-file so deploy-apply.sh knows what to deploy
echo "${REMOTE_SHA}" > "${DEPLOY_READY_FILE}"

rm -f "${BUILD_LOG}"
echo "[deploy-supervisor] Build passed. Approval requested. SHA written to ${DEPLOY_READY_FILE}."
