#!/bin/bash
# Start eve dev with the GLM-5.2 promo UA fix (+optional proxy).
cd "$(dirname "$0")"
AI_GATEWAY_API_KEY="${AI_GATEWAY_API_KEY:?set AI_GATEWAY_API_KEY first (see .env)}" \
HTTPS_PROXY="${HTTPS_PROXY:-}" \
NODE_OPTIONS="--import ./gateway-loader.mjs" \
npm exec -- eve dev
