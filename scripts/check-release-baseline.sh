#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

tracked_generated_paths() {
  (
    cd "$REPO_ROOT"
    git ls-files \
      'test-results/**' \
      'playwright-report/**' \
      'coverage/**'
  )
}

run_step() {
  local label="$1"
  shift
  echo
  echo "==> $label"
  "$@"
}

echo "== Lumio Release Baseline =="
echo "Repo: $REPO_ROOT"

tracked_noise="$(tracked_generated_paths)"
if [[ -n "$tracked_noise" ]]; then
  echo "Release baseline is blocked: generated artifacts are still tracked in Git." >&2
  echo "$tracked_noise" | sed -n '1,80p' >&2
  exit 1
fi

run_step "Web build" npm --prefix "$REPO_ROOT" run build
run_step \
  "B-end unit tests" \
  npm --prefix "$REPO_ROOT" run test:unit -- \
  tests/services/surfaceBranding.test.ts \
  tests/components/EnterprisePlatformView.test.ts \
  tests/components/StandaloneTrialJoinView.test.ts \
  tests/components/EnterpriseShellPanels.test.ts \
  tests/platformContract.test.ts

echo
echo "Release baseline passed."
