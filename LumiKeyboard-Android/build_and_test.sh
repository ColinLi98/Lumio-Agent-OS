#!/bin/bash
# Lumi OpenClaw Build + Deploy Script
# Run this in your terminal (NOT in the IDE sandbox)

set -e

export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_SDK_ROOT="/Users/lili/android-sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== [1/4] Building APK ==="
cd "$PROJECT_DIR"
./gradlew assembleDebug --no-daemon
echo "✅ APK built"

echo ""
echo "=== [2/4] Installing APK ==="
ADB="$ANDROID_SDK_ROOT/platform-tools/adb"
DEVICE=$($ADB devices | grep -w "device" | head -1 | awk '{print $1}')
if [ -z "$DEVICE" ]; then
    echo "❌ No device connected"
    exit 1
fi
$ADB -s "$DEVICE" install -r app/build/outputs/apk/debug/app-debug.apk
echo "✅ APK installed on $DEVICE"

echo ""
echo "=== [3/4] Setting up ADB port forwarding ==="
$ADB -s "$DEVICE" reverse tcp:8902 tcp:8902
echo "✅ Port 8902 forwarded (device → Mac relay service)"

echo ""
echo "=== [4/4] Starting relay service ==="
# Resolve repo root and embedded relay path
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELAY_SCRIPT="$REPO_ROOT/openclaw-relay/main.py"
OPENCLAW_SUBMODULE_DIR="$REPO_ROOT/third_party/openclaw"
OPENCLAW_WORKSPACE_DIR="$REPO_ROOT/.openclaw/workspace"

if [ ! -f "$RELAY_SCRIPT" ]; then
    echo "❌ Relay script not found: $RELAY_SCRIPT"
    exit 1
fi

# Kill existing relay
kill $(lsof -ti:8902) 2>/dev/null || true
sleep 1
mkdir -p "$OPENCLAW_WORKSPACE_DIR"
nohup env OPENCLAW_SUBMODULE_DIR="$OPENCLAW_SUBMODULE_DIR" OPENCLAW_WORKSPACE_DIR="$OPENCLAW_WORKSPACE_DIR" python3 "$RELAY_SCRIPT" > /tmp/openclaw-relay.log 2>&1 &
echo "✅ Relay service started (PID: $!)"

echo ""
echo "🎉 Done! Open Lumi app on your phone and test."
echo "💡 Relay log: tail -f /tmp/openclaw-relay.log"
