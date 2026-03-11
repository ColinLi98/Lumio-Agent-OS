#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$REPO_ROOT/LumiKeyboard-Android"
RUN_ANDROID_DEVICE_REGRESSION="${RUN_ANDROID_DEVICE_REGRESSION:-0}"

tracked_generated_paths() {
  (
    cd "$REPO_ROOT"
    git ls-files \
      'LumiKeyboard-Android/.gradle/**' \
      'LumiKeyboard-Android/**/build/**' \
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

echo "== Lumi Release Baseline =="
echo "Repo: $REPO_ROOT"

tracked_noise="$(tracked_generated_paths)"
if [[ -n "$tracked_noise" ]]; then
  echo "Release baseline is blocked: generated artifacts are still tracked in Git." >&2
  echo "$tracked_noise" | sed -n '1,80p' >&2
  exit 1
fi

run_step "Web typecheck" npm --prefix "$REPO_ROOT" run typecheck
run_step "Web unit tests" npm --prefix "$REPO_ROOT" run test:unit

run_step "Android assembleDebug" "$ANDROID_DIR/gradlew" -p "$ANDROID_DIR" :app-backend-host:assembleDebug
run_step \
  "Android core-agent regression tests" \
  "$ANDROID_DIR/gradlew" -p "$ANDROID_DIR" \
  :core-agent:test \
  --tests com.lumi.coreagent.orchestrator.SkillSelectionEngineTest \
  --tests com.lumi.coreagent.orchestrator.DynamicStatePersistenceTest \
  --tests com.lumi.coreagent.orchestrator.AgentOrchestratorTest \
  --tests com.lumi.coreagent.bellman.BellmanSolverTest \
  --tests com.lumi.coreagent.bellman.BellmanBridgeTest
run_step \
  "Android app-backend-host unit tests" \
  "$ANDROID_DIR/gradlew" -p "$ANDROID_DIR" \
  :app-backend-host:testDebugUnitTest \
  --tests com.lumi.keyboard.ui.components.UserInteractionHubPromptBuilderTest \
  --tests com.lumi.keyboard.ui.model.RoleTraceFormatterTest \
  --tests com.lumi.keyboard.ui.model.ExecutionReceiptFormatterTest \
  --tests com.lumi.keyboard.ui.model.GovernanceSummaryFormatterTest

if [[ "$RUN_ANDROID_DEVICE_REGRESSION" == "1" ]]; then
  run_step \
    "Android device regression" \
    "$ANDROID_DIR/run_device_regression.sh"
else
  echo
  echo "==> Android device regression"
  echo "Skipped. Set RUN_ANDROID_DEVICE_REGRESSION=1 to require connected-device validation."
fi

echo
echo "Release baseline passed."
