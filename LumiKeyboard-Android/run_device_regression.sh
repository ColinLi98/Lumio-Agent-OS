#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$PROJECT_DIR/.." && pwd)"
DEFAULT_JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
DEFAULT_ADB_BIN="/Users/lili/android-sdk/platform-tools/adb"
DEFAULT_APP_ID="com.lumi.keyboard.engineering"
DEFAULT_ACTIVITY="com.lumi.keyboard.MainActivity"

JAVA_HOME="${JAVA_HOME:-$DEFAULT_JAVA_HOME}"
ADB_BIN="${ADB_BIN:-$DEFAULT_ADB_BIN}"
APP_ID="${APP_ID:-$DEFAULT_APP_ID}"
MAIN_ACTIVITY="${MAIN_ACTIVITY:-$DEFAULT_ACTIVITY}"
GRADLE_USER_HOME="${GRADLE_USER_HOME:-$PROJECT_DIR/.gradle-home}"
RUN_CONNECTED_TESTS=true
DEVICE_SERIAL="${DEVICE_SERIAL:-}"

usage() {
  cat <<'EOF'
Usage: ./run_device_regression.sh [--skip-connected-tests]

Environment overrides:
  DEVICE_SERIAL     target adb serial (optional)
  JAVA_HOME         JBR path (default: Android Studio JBR)
  ADB_BIN           adb executable path (default: /Users/lili/android-sdk/platform-tools/adb)
  APP_ID            app package id (default: com.lumi.keyboard.engineering)
  MAIN_ACTIVITY     fully qualified main activity (default: com.lumi.keyboard.MainActivity)
  GRADLE_USER_HOME  gradle user home (default: ./ .gradle-home)
EOF
}

for arg in "$@"; do
  case "$arg" in
    --skip-connected-tests)
      RUN_CONNECTED_TESTS=false
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -x "$ADB_BIN" ]]; then
  echo "ADB not found or not executable: $ADB_BIN" >&2
  exit 1
fi

if [[ ! -x "$JAVA_HOME/bin/java" ]]; then
  echo "JAVA_HOME is invalid: $JAVA_HOME" >&2
  exit 1
fi

export JAVA_HOME
export GRADLE_USER_HOME
export PATH="$JAVA_HOME/bin:$PATH"

cd "$PROJECT_DIR"

echo "== Lumi Android Device Regression =="
echo "Project: $PROJECT_DIR"
echo "Java: $("$JAVA_HOME/bin/java" -version 2>&1 | head -n 1)"
echo "Gradle home: $GRADLE_USER_HOME"

if [[ -z "$DEVICE_SERIAL" ]]; then
  DEVICE_SERIAL="$("$ADB_BIN" devices | awk 'NR>1 && $2=="device" {print $1; exit}')"
fi

if [[ -z "$DEVICE_SERIAL" ]]; then
  echo "No connected Android device found." >&2
  "$ADB_BIN" devices -l || true
  exit 1
fi

echo "Target device: $DEVICE_SERIAL"

echo ""
echo "[1/5] Prepare OpenClaw relay tunnel"
"$ADB_BIN" -s "$DEVICE_SERIAL" reverse tcp:8902 tcp:8902 >/dev/null || true

if [[ "$RUN_CONNECTED_TESTS" == "true" ]]; then
  OPENCLAW_HEALTH="$("$ADB_BIN" -s "$DEVICE_SERIAL" shell 'curl -sS -m 6 http://127.0.0.1:8902/health 2>/dev/null || toybox wget -qO- http://127.0.0.1:8902/health 2>/dev/null' || true)"
  if [[ "$OPENCLAW_HEALTH" == *'"status":"ok"'* || "$OPENCLAW_HEALTH" == *'"status": "ok"'* ]]; then
    echo "OpenClaw health check passed: $OPENCLAW_HEALTH"
  else
    echo "OpenClaw health check failed. Ensure relay is running and ADB reverse is active." >&2
    echo "Try: $REPO_ROOT/scripts/openclaw/start-embedded-relay.sh" >&2
    echo "Raw response: ${OPENCLAW_HEALTH:-<empty>}" >&2
    exit 1
  fi
else
  echo "Skip OpenClaw health precheck because connected tests are skipped."
fi

echo ""
echo "[2/5] Install debug build on device"
./gradlew --no-daemon :app:installDebug

if [[ "$RUN_CONNECTED_TESTS" == "true" ]]; then
  echo ""
  echo "[3/5] Run connected Android tests"
  ./gradlew --no-daemon :app:connectedDebugAndroidTest
else
  echo ""
  echo "[3/5] Skip connected Android tests (--skip-connected-tests)"
fi

echo ""
echo "[4/5] Launch app"
"$ADB_BIN" -s "$DEVICE_SERIAL" shell am start -n "$APP_ID/$MAIN_ACTIVITY" >/dev/null

echo ""
echo "[5/5] Verify foreground activity"
RESUMED_LINE="$("$ADB_BIN" -s "$DEVICE_SERIAL" shell dumpsys activity activities \
  | grep -m1 -E 'topResumedActivity|ResumedActivity|mResumedActivity' || true)"
echo "${RESUMED_LINE:-No resumed activity line found}"

if [[ "$RESUMED_LINE" == *"$APP_ID/$MAIN_ACTIVITY"* ]]; then
  echo ""
  echo "SUCCESS: App is installed, tested, and in foreground."
else
  echo ""
  echo "WARNING: App launched, but foreground verification did not match $APP_ID/$MAIN_ACTIVITY." >&2
fi
