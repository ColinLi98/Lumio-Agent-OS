#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RELAY_SCRIPT="$REPO_ROOT/openclaw-relay/main.py"
OPENCLAW_SUBMODULE_DIR="${OPENCLAW_SUBMODULE_DIR:-$REPO_ROOT/third_party/openclaw}"
OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR:-$REPO_ROOT/.openclaw/workspace}"

if [[ ! -f "$RELAY_SCRIPT" ]]; then
  echo "[openclaw-relay] ERROR: relay script not found: $RELAY_SCRIPT" >&2
  exit 1
fi

if [[ ! -f "$OPENCLAW_SUBMODULE_DIR/openclaw.mjs" ]]; then
  echo "[openclaw-relay] WARNING: embedded OpenClaw not found at $OPENCLAW_SUBMODULE_DIR" >&2
  echo "[openclaw-relay] Run scripts/openclaw/bootstrap-embedded.sh first." >&2
fi

mkdir -p "$OPENCLAW_WORKSPACE_DIR"

if [[ -z "${GEMINI_API_KEY:-}" && -z "${LUMI_GEMINI_API_KEY:-}" && -z "${GOOGLE_API_KEY:-}" ]]; then
  echo "[openclaw-relay] WARNING: Gemini key is not set; relay will rely on OpenClaw CLI only." >&2
fi

echo "[openclaw-relay] Starting relay with OPENCLAW_SUBMODULE_DIR=$OPENCLAW_SUBMODULE_DIR"
echo "[openclaw-relay] OpenClaw workspace: $OPENCLAW_WORKSPACE_DIR"
exec env \
  OPENCLAW_SUBMODULE_DIR="$OPENCLAW_SUBMODULE_DIR" \
  OPENCLAW_WORKSPACE_DIR="$OPENCLAW_WORKSPACE_DIR" \
  python3 "$RELAY_SCRIPT"
