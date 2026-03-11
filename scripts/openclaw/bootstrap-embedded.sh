#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OPENCLAW_DIR="$REPO_ROOT/third_party/openclaw"

echo "[openclaw-bootstrap] Repo root: $REPO_ROOT"
echo "[openclaw-bootstrap] Initializing submodule..."
git -C "$REPO_ROOT" submodule update --init --recursive third_party/openclaw

if ! command -v node >/dev/null 2>&1; then
  echo "[openclaw-bootstrap] ERROR: node is required (Node >= 22)." >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[openclaw-bootstrap] ERROR: pnpm is required to build OpenClaw from source." >&2
  echo "[openclaw-bootstrap] Install: npm i -g pnpm" >&2
  exit 1
fi

echo "[openclaw-bootstrap] OpenClaw commit: $(git -C "$OPENCLAW_DIR" rev-parse --short HEAD)"
echo "[openclaw-bootstrap] Installing OpenClaw dependencies..."
pnpm -C "$OPENCLAW_DIR" install

echo "[openclaw-bootstrap] Building OpenClaw..."
pnpm -C "$OPENCLAW_DIR" build

echo "[openclaw-bootstrap] Done."
echo "[openclaw-bootstrap] Next: run scripts/openclaw/start-embedded-relay.sh"
