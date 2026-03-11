#!/bin/bash
set -e

echo "╔══════════════════════════════════════╗"
echo "║  Lumi Keyboard Build & Deploy Script  ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Setup environment
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_SDK_ROOT="/Users/lili/android-sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"

cd "$(dirname "$0")"
echo "📂 Project: $(pwd)"
echo "☕ Java: $("$JAVA_HOME"/bin/java -version 2>&1 | head -1)"
echo ""

# Step 1: Build
echo "🔨 [1/3] Building APK (assembleDebug)..."
./gradlew assembleDebug --no-daemon 2>&1
echo ""
echo "✅ BUILD SUCCESSFUL"

# Step 2: Install
APK="app/build/outputs/apk/debug/app-debug.apk"
if [ ! -f "$APK" ]; then
    echo "❌ APK not found at: $APK"
    exit 1
fi

echo "📱 [2/3] Installing APK..."
ADB="$ANDROID_SDK_ROOT/platform-tools/adb"
DEVICE=$($ADB devices | grep -v "List" | grep "device" | awk '{print $1}' | head -1)

if [ -z "$DEVICE" ]; then
    echo "⚠️  No device connected. Skipping install."
    echo "   Connect your device and run: adb install -r $APK"
else
    echo "   Device: $DEVICE"
    $ADB -s "$DEVICE" install -r "$APK"
    echo "✅ INSTALL SUCCESSFUL"

    # Step 3: Launch
    echo "🚀 [3/3] Launching app..."
    $ADB -s "$DEVICE" shell am start -n com.lumi.keyboard/.MainActivity
    echo "✅ APP LAUNCHED"
fi

echo ""
echo "═══════════════════════════════════"
echo "  ✨ Done! $(date)"
echo "═══════════════════════════════════"
