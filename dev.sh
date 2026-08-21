#!/bin/bash
# Dev with egress proxy (mirrors the proven test-eve setup):
#   1. `eve dev` standalone on :6100 with the gateway-loader (proxy allowlist
#      + gateway UA rewrite) — no in-process relay to break.
#   2. `next dev` on :3000 reverse-proxying /eve/* to it via rewrites.
# Production (`next build && next start`) uses withEve same-origin instead.
set -e
cd "$(dirname "$0")"

export EVE_EGRESS_PROXY="${EVE_EGRESS_PROXY:-http://127.0.0.1:10808}"
export NODE_OPTIONS="--import ./gateway-loader.mjs"
export EVE_DEV_ORIGIN=http://127.0.0.1:6100

# OpenRouter egress endpoint: Caddy tunnels openrouter.ai through xray.
export OPENROUTER_BASE="${OPENROUTER_BASE:-http://127.0.0.1:8787/api/v1}"
ORP_PID=""
if ! curl -s -m 2 -o /dev/null http://127.0.0.1:8787/healthz 2>/dev/null; then
  caddy run --config scripts/openrouter.Caddyfile --adapter caddyfile &
  ORP_PID=$!
fi

# eve standalone dev server (agent)
PORT=6100 npx eve dev --port 6100 --host 127.0.0.1 &
EVE_PID=$!
trap "kill $EVE_PID $ORP_PID 2>/dev/null || true" EXIT

# wait for the agent
for i in $(seq 1 60); do
  curl -sS -m 2 -o /dev/null "http://127.0.0.1:6100/eve/v1/health" && break
  sleep 2
done
echo "[dev.sh] agent ready on :6100 — starting Next on :3000"

npx next dev
