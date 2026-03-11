#!/usr/bin/env bash
set -euo pipefail

ADB="${ADB:-/Users/lili/android-sdk/platform-tools/adb}"
PKG="${PKG:-com.lumi.keyboard.engineering}"
ACTIVITY="${ACTIVITY:-com.lumi.keyboard.MainActivity}"
WAIT_SECONDS="${WAIT_SECONDS:-16}"
WAIT_AFTER_REQUIREMENTS_SECONDS="${WAIT_AFTER_REQUIREMENTS_SECONDS:-24}"
AUTO_SUBMIT_REQUIREMENTS="${AUTO_SUBMIT_REQUIREMENTS:-1}"
RESET_APP_PROCESS="${RESET_APP_PROCESS:-1}"
SUBMIT_MODE="${SUBMIT_MODE:-auto}"
USER_CONFIRMS_ON_DEVICE="${USER_CONFIRMS_ON_DEVICE:-1}"
USER_CONFIRM_TIMEOUT_SECONDS="${USER_CONFIRM_TIMEOUT_SECONDS:-180}"
USER_CONFIRM_POLL_SECONDS="${USER_CONFIRM_POLL_SECONDS:-3}"
OUT_DIR="${OUT_DIR:-/tmp/lumi-real-submit-$(date +%Y%m%d-%H%M%S)}"
QUERY="${QUERY:-}"

mkdir -p "$OUT_DIR"

ensure_lumi_foreground() {
  local top
  top="$("$ADB" shell dumpsys activity activities 2>/dev/null | rg -n 'mResumedActivity|topResumedActivity|ResumedActivity' | head -n 1 || true)"
  if [[ "$top" != *"$PKG/$ACTIVITY"* && "$top" != *"$PKG"* ]]; then
    "$ADB" shell am start -W -n "$PKG/$ACTIVITY" >/dev/null 2>&1 || true
    sleep 2
  fi
}

extract_trace_id() {
  local xml_file="${1:-}"
  if [[ -z "$xml_file" || ! -f "$xml_file" ]]; then
    return 0
  fi
  rg -o "[Tt]race:\\s*[0-9a-fA-F-]{8,36}" "$xml_file" \
    | sed -E 's/^[Tt]race:[[:space:]]*//' \
    | tr '[:upper:]' '[:lower:]' \
    | awk '{ print length($0) " " $0 }' \
    | sort -rn \
    | head -n 1 \
    | cut -d' ' -f2- \
    || true
}

guarded_wait() {
  local total="${1:-0}"
  local remaining="$total"
  while (( remaining > 0 )); do
    ensure_lumi_foreground
    local step=5
    if (( remaining < step )); then
      step="$remaining"
    fi
    sleep "$step"
    remaining=$((remaining - step))
  done
}

to_adb_text() {
  printf '%s' "${1:-}" | sed \
    -e 's/ /%s/g' \
    -e 's/;/\\;/g' \
    -e 's/&/\\&/g' \
    -e 's/|/\\|/g' \
    -e 's/(/\\(/g' \
    -e 's/)/\\)/g' \
    -e 's/</\\</g' \
    -e 's/>/\\>/g'
}

clear_and_fill_input() {
  local x="${1:-0}"
  local y="${2:-0}"
  local raw="${3:-}"
  local adb_text
  adb_text="$(to_adb_text "$raw")"
  "$ADB" shell input tap "$x" "$y" >/dev/null 2>&1 || true
  sleep 1
  "$ADB" shell input keycombination 113 29 >/dev/null 2>&1 || true
  "$ADB" shell input keyevent KEYCODE_DEL >/dev/null 2>&1 || true
  "$ADB" shell input keyevent KEYCODE_MOVE_END >/dev/null 2>&1 || true
  for _ in $(seq 1 16); do
    "$ADB" shell input keyevent KEYCODE_DEL >/dev/null 2>&1 || true
  done
  "$ADB" shell input text "$adb_text" >/dev/null 2>&1 || true
}

wait_for_device_user_submit() {
  local timeout="${1:-$USER_CONFIRM_TIMEOUT_SECONDS}"
  local poll="${2:-$USER_CONFIRM_POLL_SECONDS}"
  local start_ts now
  start_ts="$(date +%s)"
  local probe_xml="$OUT_DIR/manual_wait.xml"

  while true; do
    ensure_lumi_foreground
    "$ADB" shell uiautomator dump /sdcard/lumi-manual-wait.xml >/dev/null 2>&1 || true
    "$ADB" shell cat /sdcard/lumi-manual-wait.xml > "$probe_xml" || true

    local current_trace
    current_trace="$(extract_trace_id "$probe_xml")"
    if [[ -n "$PRE_TRACE" && -n "$current_trace" && "$current_trace" != "$PRE_TRACE" ]]; then
      cp "$probe_xml" "$OUT_DIR/after_input.xml"
      return 0
    fi
    if [[ -z "$PRE_TRACE" ]] && rg -qi 'Task queued|Request is being processed|Status:\s*running|Status:\s*waiting|Complete requirements|Missing requirements|waiting user|Error Code:' "$probe_xml"; then
      cp "$probe_xml" "$OUT_DIR/after_input.xml"
      return 0
    fi

    now="$(date +%s)"
    if (( now - start_ts >= timeout )); then
      cp "$probe_xml" "$OUT_DIR/after_input.xml"
      return 1
    fi
    sleep "$poll"
  done
}

"$ADB" start-server >/dev/null
"$ADB" wait-for-device
"$ADB" shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true
"$ADB" shell wm dismiss-keyguard >/dev/null 2>&1 || true
if [[ "$RESET_APP_PROCESS" == "1" ]]; then
  "$ADB" shell am force-stop "$PKG" >/dev/null 2>&1 || true
  sleep 1
fi
"$ADB" shell am start -W -n "$PKG/$ACTIVITY" >/dev/null
sleep 2
ensure_lumi_foreground

"$ADB" shell uiautomator dump /sdcard/lumi-submit-before.xml >/dev/null
"$ADB" shell cat /sdcard/lumi-submit-before.xml > "$OUT_DIR/before.xml"
PRE_TRACE="$(extract_trace_id "$OUT_DIR/before.xml")"

python3 - "$OUT_DIR/before.xml" "$OUT_DIR/coords.txt" <<'PY'
import re
import sys

xml = open(sys.argv[1], encoding="utf8").read()

def parse_nodes(source: str):
    nodes = []
    for attrs in re.findall(r"<node ([^>]+)>", source):
        item = {}
        for key, value in re.findall(r'([a-zA-Z\-]+)="([^"]*)"', attrs):
            item[key] = value
        nodes.append(item)
    return nodes

def center_from_bounds(bounds: str):
    m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds or "")
    if not m:
        return None
    return ((int(m.group(1)) + int(m.group(3))) // 2, (int(m.group(2)) + int(m.group(4))) // 2)

nodes = parse_nodes(xml)

def center_for_any(labels, default):
    lowered = {label.lower() for label in labels}
    for node in nodes:
        text = (node.get("text") or "").strip().lower()
        desc = (node.get("content-desc") or "").strip().lower()
        if text in lowered or desc in lowered:
            pt = center_from_bounds(node.get("bounds", ""))
            if pt:
                return pt
    return default

goals = center_for_any(["Goals"], (220, 1000))
work = center_for_any(["Work"], (1450, 1000))
chip = center_for_any(["Rewrite this message in a more professional tone"], (300, 720))
goal_input = center_for_any(["Describe your goal in one sentence", "Goal Input"], (420, 560))
chat_input = center_for_any(["Enter a chat request..."], (420, 560))
submit = center_for_any(["Run Plan", "Running...", "Submit to App internal backend"], (1480, 794))
input_box = goal_input if goal_input != (420, 560) else chat_input
open(sys.argv[2], "w").write(
    f"{goals[0]},{goals[1]},{work[0]},{work[1]},{chip[0]},{chip[1]},{input_box[0]},{input_box[1]},{submit[0]},{submit[1]}\n"
)
PY

COORDS="$(cat "$OUT_DIR/coords.txt")"
GOALS_X="$(echo "$COORDS" | cut -d, -f1)"
GOALS_Y="$(echo "$COORDS" | cut -d, -f2)"
WORK_X="$(echo "$COORDS" | cut -d, -f3)"
WORK_Y="$(echo "$COORDS" | cut -d, -f4)"
CHIP_X="$(echo "$COORDS" | cut -d, -f5)"
CHIP_Y="$(echo "$COORDS" | cut -d, -f6)"
INPUT_X="$(echo "$COORDS" | cut -d, -f7)"
INPUT_Y="$(echo "$COORDS" | cut -d, -f8)"
SUBMIT_X="$(echo "$COORDS" | cut -d, -f9)"
SUBMIT_Y="$(echo "$COORDS" | cut -d, -f10)"

query_has_constraints() {
  if [[ -z "$QUERY" ]]; then
    return 1
  fi
  local normalized
  normalized="$(printf '%s' "$QUERY" | tr '[:upper:]' '[:lower:]')"
  local explicit_hits=0
  if printf '%s' "$normalized" | rg -q '(budget|预算)\s*[:=]\s*[^;\n]+'; then
    explicit_hits=$((explicit_hits + 1))
  elif printf '%s' "$normalized" | rg -q '(budget|预算)\s+[£$€]?\s*[0-9]'; then
    explicit_hits=$((explicit_hits + 1))
  fi
  if printf '%s' "$normalized" | rg -q '(deadline|时限|期限)\s*[:=]\s*[^;\n]+'; then
    explicit_hits=$((explicit_hits + 1))
  fi
  if printf '%s' "$normalized" | rg -q '(acceptance(\s+criteria)?|验收标准|验收)\s*[:=]\s*[^;\n]+'; then
    explicit_hits=$((explicit_hits + 1))
  fi
  if printf '%s' "$normalized" | rg -q '(user[_\s-]*confirmation[_\s-]*token|confirmation(\s+token)?|确认令牌|token)\s*[:=]\s*[^;\n]+'; then
    explicit_hits=$((explicit_hits + 1))
  fi
  if (( explicit_hits >= 2 )); then
    return 0
  fi
  return 1
}

resolve_submit_mode() {
  local requested
  requested="$(printf '%s' "$SUBMIT_MODE" | tr '[:upper:]' '[:lower:]')"
  case "$requested" in
    goal|command)
      printf '%s' "$requested"
      return 0
      ;;
    auto|"")
      if [[ "$USER_CONFIRMS_ON_DEVICE" == "1" && -z "$QUERY" ]]; then
        printf 'goal'
        return 0
      fi
      if query_has_constraints; then
        printf 'goal'
      else
        printf 'command'
      fi
      return 0
      ;;
    *)
      printf 'goal'
      return 0
      ;;
  esac
}

RESOLVED_SUBMIT_MODE="$(resolve_submit_mode)"

find_goal_input_coords() {
  local xml_out="$1"
  local coords_out="$2"
  "$ADB" shell uiautomator dump /sdcard/lumi-goal-current.xml >/dev/null
  "$ADB" shell cat /sdcard/lumi-goal-current.xml > "$xml_out"
  python3 - "$xml_out" "$coords_out" <<'PY'
import re
import sys

xml = open(sys.argv[1], encoding="utf8").read()
nodes = []
for attrs in re.findall(r"<node ([^>]+)>", xml):
    item = {}
    for key, value in re.findall(r'([a-zA-Z\-]+)="([^"]*)"', attrs):
        item[key] = value
    nodes.append(item)

def center(bounds: str):
    m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds or "")
    if not m:
        return None
    return ((int(m.group(1)) + int(m.group(3))) // 2, (int(m.group(2)) + int(m.group(4))) // 2)

# Prefer the dedicated goal input target to avoid filling top command bars.
for node in nodes:
    desc = (node.get("content-desc") or "").strip().lower()
    if desc == "goal input":
        pt = center(node.get("bounds", ""))
        if pt:
            open(sys.argv[2], "w").write(f"{pt[0]},{pt[1]}\n")
            raise SystemExit(0)

for node in nodes:
    text = (node.get("text") or "").strip().lower()
    if text == "describe your goal in one sentence":
        pt = center(node.get("bounds", ""))
        if pt:
            open(sys.argv[2], "w").write(f"{pt[0]},{pt[1]}\n")
            raise SystemExit(0)

for node in nodes:
    if (node.get("class") or "").strip() == "android.widget.EditText":
        pt = center(node.get("bounds", ""))
        if pt:
            open(sys.argv[2], "w").write(f"{pt[0]},{pt[1]}\n")
            raise SystemExit(0)

open(sys.argv[2], "w").write("")
PY
}

find_command_input_coords() {
  local xml_out="$1"
  local coords_out="$2"
  "$ADB" shell uiautomator dump /sdcard/lumi-command-current.xml >/dev/null
  "$ADB" shell cat /sdcard/lumi-command-current.xml > "$xml_out"
  python3 - "$xml_out" "$coords_out" <<'PY'
import re
import sys

xml = open(sys.argv[1], encoding="utf8").read()
nodes = []
for attrs in re.findall(r"<node ([^>]+)>", xml):
    item = {}
    for key, value in re.findall(r'([a-zA-Z\-]+)="([^"]*)"', attrs):
        item[key] = value
    nodes.append(item)

def center(bounds: str):
    m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds or "")
    if not m:
        return None
    return ((int(m.group(1)) + int(m.group(3))) // 2, (int(m.group(2)) + int(m.group(4))) // 2)

for node in nodes:
    text = (node.get("text") or "").strip().lower()
    desc = (node.get("content-desc") or "").strip().lower()
    if "os command" in text or "os command" in desc:
        pt = center(node.get("bounds", ""))
        if pt:
            open(sys.argv[2], "w").write(f"{pt[0]},{pt[1]}\n")
            raise SystemExit(0)

for node in nodes:
    if (node.get("class") or "").strip() != "android.widget.EditText":
        continue
    pt = center(node.get("bounds", ""))
    if not pt:
        continue
    if pt[1] <= 900:
        open(sys.argv[2], "w").write(f"{pt[0]},{pt[1]}\n")
        raise SystemExit(0)

open(sys.argv[2], "w").write("")
PY
}

find_command_run_coords() {
  local xml_out="$1"
  local coords_out="$2"
  "$ADB" shell uiautomator dump /sdcard/lumi-command-run.xml >/dev/null
  "$ADB" shell cat /sdcard/lumi-command-run.xml > "$xml_out"
  python3 - "$xml_out" "$coords_out" <<'PY'
import re
import sys

xml = open(sys.argv[1], encoding="utf8").read()
nodes = []
for attrs in re.findall(r"<node ([^>]+)>", xml):
    item = {}
    for key, value in re.findall(r'([a-zA-Z\-]+)="([^"]*)"', attrs):
        item[key] = value
    nodes.append(item)

def center(bounds: str):
    m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds or "")
    if not m:
        return None
    return ((int(m.group(1)) + int(m.group(3))) // 2, (int(m.group(2)) + int(m.group(4))) // 2)

candidates = []
for node in nodes:
    text = (node.get("text") or "").strip().lower()
    desc = (node.get("content-desc") or "").strip().lower()
    if text == "run" or desc == "run":
        pt = center(node.get("bounds", ""))
        if pt:
            candidates.append(pt)

top_right = [pt for pt in candidates if pt[1] <= 420]
if top_right:
    top_right.sort(key=lambda p: (-p[0], p[1]))
    pt = top_right[0]
    open(sys.argv[2], "w").write(f"{pt[0]},{pt[1]}\n")
    raise SystemExit(0)

if candidates:
    candidates.sort(key=lambda p: (p[1], -p[0]))
    pt = candidates[0]
    open(sys.argv[2], "w").write(f"{pt[0]},{pt[1]}\n")
    raise SystemExit(0)

open(sys.argv[2], "w").write("")
PY
}

SUBMITTED_BY_IME=0
if [[ "$USER_CONFIRMS_ON_DEVICE" == "1" ]]; then
  if [[ "$RESOLVED_SUBMIT_MODE" == "command" ]]; then
    "$ADB" shell input tap "$WORK_X" "$WORK_Y" >/dev/null 2>&1 || true
    sleep 1
    ensure_lumi_foreground
    if [[ -n "$QUERY" ]]; then
      find_command_input_coords "$OUT_DIR/command_input.xml" "$OUT_DIR/command_input_coords.txt"
      if [[ -s "$OUT_DIR/command_input_coords.txt" ]]; then
        INPUT_X="$(cut -d, -f1 "$OUT_DIR/command_input_coords.txt")"
        INPUT_Y="$(cut -d, -f2 "$OUT_DIR/command_input_coords.txt")"
        clear_and_fill_input "$INPUT_X" "$INPUT_Y" "$QUERY"
      fi
    fi
  else
    "$ADB" shell input tap "$GOALS_X" "$GOALS_Y" >/dev/null 2>&1 || true
    sleep 1
    ensure_lumi_foreground
    if [[ -n "$QUERY" ]]; then
      find_goal_input_coords "$OUT_DIR/goal_input.xml" "$OUT_DIR/goal_input_coords.txt"
      if [[ -s "$OUT_DIR/goal_input_coords.txt" ]]; then
        INPUT_X="$(cut -d, -f1 "$OUT_DIR/goal_input_coords.txt")"
        INPUT_Y="$(cut -d, -f2 "$OUT_DIR/goal_input_coords.txt")"
        clear_and_fill_input "$INPUT_X" "$INPUT_Y" "$QUERY"
      fi
    fi
  fi
  sleep 1
  ensure_lumi_foreground
  "$ADB" shell uiautomator dump /sdcard/lumi-submit-after-input.xml >/dev/null 2>&1 || true
  "$ADB" shell cat /sdcard/lumi-submit-after-input.xml > "$OUT_DIR/after_input.xml" || true
  echo "Manual device input required:"
  echo "Mode: ${RESOLVED_SUBMIT_MODE}. Surface prepared and ready for your final confirmation."
  if [[ -n "$QUERY" ]]; then
    echo "Prefilled request preview: ${QUERY:0:160}"
  fi
  echo "1) On device, confirm scope and type your request."
  echo "2) Submit from device (Enter or Run button)."
  echo "3) Script will auto-detect submit signal within ${USER_CONFIRM_TIMEOUT_SECONDS}s."
  if ! wait_for_device_user_submit "$USER_CONFIRM_TIMEOUT_SECONDS" "$USER_CONFIRM_POLL_SECONDS"; then
    echo "WARN: no submit signal detected within timeout; continuing with latest UI snapshot." >&2
  fi
  SUBMITTED_BY_IME=1
else
  if [[ "$RESOLVED_SUBMIT_MODE" == "command" ]]; then
    "$ADB" shell input tap "$WORK_X" "$WORK_Y" >/dev/null 2>&1 || true
    sleep 1
    ensure_lumi_foreground

    find_command_input_coords "$OUT_DIR/command_input.xml" "$OUT_DIR/command_input_coords.txt"
    if [[ -s "$OUT_DIR/command_input_coords.txt" ]]; then
      INPUT_X="$(cut -d, -f1 "$OUT_DIR/command_input_coords.txt")"
      INPUT_Y="$(cut -d, -f2 "$OUT_DIR/command_input_coords.txt")"
    fi

    if [[ -n "$QUERY" ]]; then
      ADB_TEXT="$(printf '%s' "$QUERY" | sed \
        -e 's/ /%s/g' \
        -e 's/;/\\;/g' \
        -e 's/&/\\&/g' \
        -e 's/|/\\|/g' \
        -e 's/(/\\(/g' \
        -e 's/)/\\)/g' \
        -e 's/</\\</g' \
        -e 's/>/\\>/g')"
      "$ADB" shell input tap "$INPUT_X" "$INPUT_Y" >/dev/null 2>&1 || true
      sleep 1
      "$ADB" shell input keycombination 113 29 >/dev/null 2>&1 || true
      "$ADB" shell input keyevent KEYCODE_DEL >/dev/null 2>&1 || true
      "$ADB" shell input keyevent KEYCODE_MOVE_END >/dev/null 2>&1 || true
      for _ in $(seq 1 16); do
        "$ADB" shell input keyevent KEYCODE_DEL >/dev/null 2>&1 || true
      done
      "$ADB" shell input text "$ADB_TEXT" >/dev/null 2>&1 || true
    fi

    "$ADB" shell uiautomator dump /sdcard/lumi-submit-after-input.xml >/dev/null
    "$ADB" shell cat /sdcard/lumi-submit-after-input.xml > "$OUT_DIR/after_input.xml"
    find_command_run_coords "$OUT_DIR/command_run.xml" "$OUT_DIR/command_run_coords.txt"
    if [[ -s "$OUT_DIR/command_run_coords.txt" ]]; then
      RUN_X="$(cut -d, -f1 "$OUT_DIR/command_run_coords.txt")"
      RUN_Y="$(cut -d, -f2 "$OUT_DIR/command_run_coords.txt")"
      "$ADB" shell input tap "$RUN_X" "$RUN_Y" >/dev/null 2>&1 || true
    else
      "$ADB" shell input keyevent KEYCODE_ENTER >/dev/null 2>&1 || true
    fi
  else
    "$ADB" shell input tap "$GOALS_X" "$GOALS_Y" >/dev/null 2>&1 || true
    sleep 1
    ensure_lumi_foreground
    find_goal_input_coords "$OUT_DIR/goal_input.xml" "$OUT_DIR/goal_input_coords.txt"
    if [[ -s "$OUT_DIR/goal_input_coords.txt" ]]; then
      INPUT_X="$(cut -d, -f1 "$OUT_DIR/goal_input_coords.txt")"
      INPUT_Y="$(cut -d, -f2 "$OUT_DIR/goal_input_coords.txt")"
    fi
    if [[ -n "$QUERY" ]]; then
      ADB_TEXT="$(printf '%s' "$QUERY" | sed \
        -e 's/ /%s/g' \
        -e 's/;/\\;/g' \
        -e 's/&/\\&/g' \
        -e 's/|/\\|/g' \
        -e 's/(/\\(/g' \
        -e 's/)/\\)/g' \
        -e 's/</\\</g' \
        -e 's/>/\\>/g')"
      "$ADB" shell input tap "$INPUT_X" "$INPUT_Y"
      sleep 1
      # Clear possible previous input to avoid concatenated submissions.
      "$ADB" shell input keycombination 113 29 >/dev/null 2>&1 || true
      "$ADB" shell input keyevent KEYCODE_DEL >/dev/null 2>&1 || true
      "$ADB" shell input keyevent KEYCODE_MOVE_END >/dev/null 2>&1 || true
      # Keep this small; large DEL loops make device runs unstable and slow.
      for _ in $(seq 1 16); do
        "$ADB" shell input keyevent KEYCODE_DEL >/dev/null 2>&1 || true
      done
      "$ADB" shell input text "$ADB_TEXT"
      "$ADB" shell input keyevent KEYCODE_ENTER >/dev/null 2>&1 || true
    else
      "$ADB" shell input tap "$CHIP_X" "$CHIP_Y"
    fi
    sleep 1
    "$ADB" shell uiautomator dump /sdcard/lumi-submit-after-input.xml >/dev/null
    "$ADB" shell cat /sdcard/lumi-submit-after-input.xml > "$OUT_DIR/after_input.xml"

    if rg -F -q 'Surface: Work · Module: Chat' "$OUT_DIR/after_input.xml" \
      || rg -F -q 'OS Capability Surfaces' "$OUT_DIR/after_input.xml"; then
      SUBMITTED_BY_IME=1
    fi

    if [[ -n "$QUERY" ]]; then
      QUERY_PREFIX="$(printf '%s' "$QUERY" | cut -c1-20)"
      if ! rg -F -q "$QUERY_PREFIX" "$OUT_DIR/after_input.xml"; then
        # Retry once if input text was not committed to the field.
        "$ADB" shell input tap "$INPUT_X" "$INPUT_Y" >/dev/null 2>&1 || true
        sleep 1
        "$ADB" shell input text "$ADB_TEXT" >/dev/null 2>&1 || true
        "$ADB" shell input keyevent KEYCODE_ENTER >/dev/null 2>&1 || true
        sleep 1
        "$ADB" shell uiautomator dump /sdcard/lumi-submit-after-input.xml >/dev/null
        "$ADB" shell cat /sdcard/lumi-submit-after-input.xml > "$OUT_DIR/after_input.xml"
        if rg -F -q 'Surface: Work · Module: Chat' "$OUT_DIR/after_input.xml" \
          || rg -F -q 'OS Capability Surfaces' "$OUT_DIR/after_input.xml"; then
          SUBMITTED_BY_IME=1
        fi
      fi
    fi
  fi
fi

find_submit_coords() {
  local xml_out="$1"
  local coords_out="$2"
  "$ADB" shell uiautomator dump /sdcard/lumi-submit-current.xml >/dev/null
  "$ADB" shell cat /sdcard/lumi-submit-current.xml > "$xml_out"
  python3 - "$xml_out" "$coords_out" <<'PY'
import re
import sys

xml = open(sys.argv[1], encoding="utf8").read()
nodes = []
for attrs in re.findall(r"<node ([^>]+)>", xml):
    item = {}
    for key, value in re.findall(r'([a-zA-Z\-]+)="([^"]*)"', attrs):
        item[key] = value
    nodes.append(item)

def center(bounds: str):
    m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds or "")
    if not m:
        return None
    return ((int(m.group(1)) + int(m.group(3))) // 2, (int(m.group(2)) + int(m.group(4))) // 2)

labels = {"run plan", "running...", "submit to app internal backend"}
for node in nodes:
    text = (node.get("text") or "").strip().lower()
    desc = (node.get("content-desc") or "").strip().lower()
    if text in labels or desc in labels:
        pt = center(node.get("bounds", ""))
        if pt:
            open(sys.argv[2], "w").write(f"{pt[0]},{pt[1]}\n")
            raise SystemExit(0)

open(sys.argv[2], "w").write("")
PY
}

focus_work_chat_surface() {
  local xml_out="$1"
  local coords_out="$2"
  "$ADB" shell uiautomator dump /sdcard/lumi-work-focus.xml >/dev/null
  "$ADB" shell cat /sdcard/lumi-work-focus.xml > "$xml_out"
  python3 - "$xml_out" "$coords_out" <<'PY'
import re
import sys

xml = open(sys.argv[1], encoding="utf8").read()
nodes = []
for attrs in re.findall(r"<node ([^>]+)>", xml):
    item = {}
    for key, value in re.findall(r'([a-zA-Z\-]+)="([^"]*)"', attrs):
        item[key] = value
    nodes.append(item)

def center(bounds: str):
    m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", bounds or "")
    if not m:
        return None
    return ((int(m.group(1)) + int(m.group(3))) // 2, (int(m.group(2)) + int(m.group(4))) // 2)

targets = [
    "chat orchestration",
    "cloud reasoner",
    "openclaw exec",
]

for target in targets:
    for node in nodes:
        text = (node.get("text") or "").strip().lower()
        desc = (node.get("content-desc") or "").strip().lower()
        if text == target or desc == target:
            pt = center(node.get("bounds", ""))
            if pt:
                open(sys.argv[2], "w").write(f"{pt[0]},{pt[1]}\n")
                raise SystemExit(0)

open(sys.argv[2], "w").write("")
PY
}

if [[ "$RESOLVED_SUBMIT_MODE" != "command" && "$SUBMITTED_BY_IME" == "0" ]]; then
  "$ADB" shell input keyevent KEYCODE_BACK >/dev/null 2>&1 || true
  sleep 1
  ensure_lumi_foreground
  SUBMITTED=0
  for attempt in 1 2 3; do
    find_submit_coords "$OUT_DIR/pre_submit_${attempt}.xml" "$OUT_DIR/submit_coords.txt"
    if [[ -s "$OUT_DIR/submit_coords.txt" ]]; then
      SUBMIT_X="$(cut -d, -f1 "$OUT_DIR/submit_coords.txt")"
      SUBMIT_Y="$(cut -d, -f2 "$OUT_DIR/submit_coords.txt")"
      "$ADB" shell input tap "$SUBMIT_X" "$SUBMIT_Y"
      SUBMITTED=1
      break
    fi
    "$ADB" shell input swipe 1480 840 1480 520 220 >/dev/null 2>&1 || true
    sleep 1
  done

  if [[ "$SUBMITTED" == "0" ]]; then
    "$ADB" shell input tap "$SUBMIT_X" "$SUBMIT_Y" >/dev/null 2>&1 || true
    sleep 1
    "$ADB" shell input keyevent KEYCODE_ENTER >/dev/null 2>&1 || true
  fi
fi

guarded_wait "$WAIT_SECONDS"
"$ADB" shell input tap "$WORK_X" "$WORK_Y" >/dev/null 2>&1 || true
sleep 1
ensure_lumi_foreground
focus_work_chat_surface "$OUT_DIR/work_focus.xml" "$OUT_DIR/work_focus_coords.txt"
if [[ -s "$OUT_DIR/work_focus_coords.txt" ]]; then
  FOCUS_X="$(cut -d, -f1 "$OUT_DIR/work_focus_coords.txt")"
  FOCUS_Y="$(cut -d, -f2 "$OUT_DIR/work_focus_coords.txt")"
  "$ADB" shell input tap "$FOCUS_X" "$FOCUS_Y" >/dev/null 2>&1 || true
  sleep 1
  ensure_lumi_foreground
fi

"$ADB" shell uiautomator dump /sdcard/lumi-submit-after.xml >/dev/null
"$ADB" shell cat /sdcard/lumi-submit-after.xml > "$OUT_DIR/after.xml"

if [[ "$AUTO_SUBMIT_REQUIREMENTS" == "1" ]]; then
  python3 - "$OUT_DIR/after.xml" "$OUT_DIR/req_submit_coords.txt" <<'PY'
import re
import sys

xml = open(sys.argv[1], encoding="utf8").read()

if 'text="Complete requirements"' not in xml:
    open(sys.argv[2], "w").write("")
    raise SystemExit(0)

def center_for(label: str):
    m = re.search(r'text="%s"[^>]*bounds="([^"]+)"' % re.escape(label), xml)
    if not m:
        return None
    m2 = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", m.group(1))
    if not m2:
        return None
    return (
        (int(m2.group(1)) + int(m2.group(3))) // 2,
        (int(m2.group(2)) + int(m2.group(4))) // 2,
    )

pt = center_for("Submit") or center_for("Submit requirements")
if not pt:
    open(sys.argv[2], "w").write("")
    raise SystemExit(0)
open(sys.argv[2], "w").write(f"{pt[0]},{pt[1]}\n")
PY

  if [[ -s "$OUT_DIR/req_submit_coords.txt" ]]; then
    REQ_SUBMIT_X="$(cut -d, -f1 "$OUT_DIR/req_submit_coords.txt")"
    REQ_SUBMIT_Y="$(cut -d, -f2 "$OUT_DIR/req_submit_coords.txt")"
    "$ADB" shell input tap "$REQ_SUBMIT_X" "$REQ_SUBMIT_Y"
    guarded_wait "$WAIT_AFTER_REQUIREMENTS_SECONDS"
    ensure_lumi_foreground
    "$ADB" shell uiautomator dump /sdcard/lumi-submit-after.xml >/dev/null
    "$ADB" shell cat /sdcard/lumi-submit-after.xml > "$OUT_DIR/after.xml"
  fi
fi

# Capture one additional scrolled viewport so link/action widgets below long answers are visible.
"$ADB" shell input swipe 1480 1460 1480 720 260 >/dev/null 2>&1 || true
sleep 1
"$ADB" shell uiautomator dump /sdcard/lumi-submit-after-links.xml >/dev/null
"$ADB" shell cat /sdcard/lumi-submit-after-links.xml > "$OUT_DIR/after_links.xml"

POST_TRACE="$(extract_trace_id "$OUT_DIR/after.xml")"
TRACE_CHANGED="unknown"
if [[ -n "$PRE_TRACE" && -n "$POST_TRACE" ]]; then
  if [[ "$PRE_TRACE" == "$POST_TRACE" ]]; then
    TRACE_CHANGED="false"
  else
    TRACE_CHANGED="true"
  fi
fi

QUERY_ECHOED="unknown"
if [[ -n "$QUERY" ]]; then
  QUERY_PREFIX="$(printf '%s' "$QUERY" | cut -c1-20)"
  if rg -F -q "$QUERY_PREFIX" "$OUT_DIR/after_input.xml" "$OUT_DIR/after.xml" "$OUT_DIR/after_links.xml"; then
    QUERY_ECHOED="true"
  else
    QUERY_ECHOED="false"
  fi
fi

MANUAL_CONFIRM_FLAG="0"
if [[ "$USER_CONFIRMS_ON_DEVICE" == "1" ]]; then
  MANUAL_CONFIRM_FLAG="1"
fi

node - "$OUT_DIR/after.xml" "$OUT_DIR" "$OUT_DIR/after_input.xml" "$OUT_DIR/after_links.xml" "$QUERY_ECHOED" "$PRE_TRACE" "$POST_TRACE" "$TRACE_CHANGED" "$MANUAL_CONFIRM_FLAG" <<'NODE'
const fs = require("fs");
const xml = fs.readFileSync(process.argv[2], "utf8");
const outDir = process.argv[3];
const inputXmlPath = process.argv[4];
const linksXmlPath = process.argv[5];
const queryEchoedRaw = String(process.argv[6] || "unknown").toLowerCase();
const traceBefore = String(process.argv[7] || "");
const traceAfter = String(process.argv[8] || "");
const traceChangedRaw = String(process.argv[9] || "unknown").toLowerCase();
const manualConfirmModeRaw = String(process.argv[10] || "0").toLowerCase();
const manualConfirmMode = manualConfirmModeRaw === "1" || manualConfirmModeRaw === "true";
const linksXml = fs.existsSync(linksXmlPath) ? fs.readFileSync(linksXmlPath, "utf8") : "";
const decode = (s) => s.replace(/&#10;/g, "\n").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const texts = [...xml.matchAll(/text="([^"]*)"/g), ...linksXml.matchAll(/text="([^"]*)"/g)]
  .map((m) => m[1])
  .filter(Boolean)
  .map(decode);
const uniqueTexts = [...new Set(texts)];

const boilerplate = [
  /^Lumi Agent$/i,
  /^Online$/i,
  /^USER VIEW$/i,
  /^Goal-Centric Hub$/i,
  /^What do you want to achieve\?$/i,
  /^Describe your goal in one sentence$/i,
  /^Run Plan$/i,
  /^Work$/i,
  /^Goals$/i,
  /^Activity$/i,
  /^Chat Orchestration$/i,
  /^Current page: Chat$/i,
  /^Enter a chat request\.\.\.$/i,
  /^Tip:/i,
  /^Submit to App internal backend$/i,
  /^Chat Page Actions$/i,
  /^Home$/i,
  /^Chat$/i,
  /^LIX$/i,
  /^Agent$/i,
  /^Avatar$/i,
  /^Navigation$/i,
  /^Settings$/i,
  /^Final output$/i,
  /^Tap a button to open the external page or app\.$/i,
  /^Chat · Task Track$/i,
  /^Digital Twin Avatar$/i,
  /^Overview \/ cognition \/ editing, local-first by default\.$/i,
  /^Avatar：/i,
  /^Avatar · /i,
  /^Lumi Agent OS · Goal Hub$/i,
];

const isBoilerplate = (t) => boilerplate.some((r) => r.test(t));

const indicators = [
  /Complete requirements/i,
  /Requirements needed before execution/i,
  /Missing requirements/i,
  /Request is being processed/i,
  /Task queued and running/i,
  /Execution status/i,
  /Success/i,
  /Generated/i,
  /Live evidence synced/i,
  /^status:/i,
  /^状态[:：]/,
  /^trace[:：]/i,
  /No results yet\./i,
  /Error Code:/i,
  /budget/i,
  /Budget:/i,
  /Awaiting/i,
  /waiting user/i,
];

const keyLines = uniqueTexts.filter((t) => indicators.some((r) => r.test(t))).slice(0, 40);
const hasRequirementsGate = uniqueTexts.some((t) =>
  /Complete requirements|Requirements needed before execution|Missing requirements/i.test(t)
);
const likelyStillOnGoals =
  uniqueTexts.some((t) => /^What do you want to achieve\?$/i.test(t)) &&
  !uniqueTexts.some((t) => /Final output|Chat · Task Track|Execution status|Complete requirements/i.test(t));

const finalOutputIndex = uniqueTexts.findIndex((t) => /^Final output$/i.test(t));
let finalOutput = null;
if (finalOutputIndex >= 0) {
  finalOutput = uniqueTexts
    .slice(finalOutputIndex + 1)
    .find((t) => t.length > 30 && !isBoilerplate(t)) || null;
}
if (!finalOutput) {
  const preferredHeadings = ["Executable plan", "Structured plan", "Summary"];
  for (const heading of preferredHeadings) {
    const idx = uniqueTexts.findIndex((t) => t.toLowerCase() === heading.toLowerCase());
    if (idx >= 0) {
      finalOutput = uniqueTexts
        .slice(idx + 1)
        .find((t) => t.length > 30 && !isBoilerplate(t)) || null;
      if (finalOutput) break;
    }
  }
}
if (!finalOutput) {
  const hasExecutionContext = uniqueTexts.some((t) =>
    /Final output|Execution status|Gate Status|Next Action|Trace:|waiting user|Complete requirements|Task queued|Request is being processed/i.test(t)
  );
  if (hasExecutionContext) {
    finalOutput = uniqueTexts
      .filter((t) => !isBoilerplate(t))
      .sort((a, b) => b.length - a.length)[0] || null;
  }
}

let inputCapturePreview = null;
if (fs.existsSync(inputXmlPath)) {
  const inputXml = fs.readFileSync(inputXmlPath, "utf8");
  const inputTexts = [...inputXml.matchAll(/text="([^"]*)"/g)]
    .map((m) => m[1])
    .filter(Boolean)
    .map(decode);
  inputCapturePreview = inputTexts
    .filter((t) => !isBoilerplate(t))
    .sort((a, b) => b.length - a.length)[0] || null;
}

if (inputCapturePreview && finalOutput && inputCapturePreview.trim() === finalOutput.trim()) {
  finalOutput = null;
}

const joined = keyLines.join("\n").toLowerCase();
const finalOutputLower = (finalOutput || "").toLowerCase();
const statusSignal = `${joined}\n${finalOutputLower}`;
const hasConstraintGateBlock = /gate status|missing_user_constraints_or_confirmation|missing fields:|awaiting constraints|require constraints/.test(statusSignal);
const hasExecutionSignals = /final output|action steps|next action|gate status|execution status|trace:|waiting user|task queued|request is being processed|complete requirements/.test(statusSignal);
const hasSubmitProgressSignals = /request is being processed|task queued|processing|queued|running|status:\s*running|complete requirements|missing requirements/.test(statusSignal);
let statusGuess =
  hasRequirementsGate ? "waiting_user" :
    likelyStillOnGoals ? "not_submitted" :
    hasConstraintGateBlock ? "waiting_user" :
    /strict gates are blocking escalation|missing fields:/.test(statusSignal) ? "waiting_user" :
    /awaiting|waiting user/.test(statusSignal) ? "waiting_user" :
    /processing|queued|running/.test(statusSignal) ? "running" :
      /error code|failed|failure/.test(statusSignal) ? "error" :
        (finalOutput && finalOutput.length > 80 ? "success" : "unknown");

const queryEchoed = queryEchoedRaw === "true" ? true : queryEchoedRaw === "false" ? false : null;
const traceChanged = traceChangedRaw === "true" ? true : traceChangedRaw === "false" ? false : null;
const submissionValidated = manualConfirmMode
  ? (traceChanged === true || hasSubmitProgressSignals)
  : (queryEchoed !== false) && (traceChanged === true || hasExecutionSignals);
if (!submissionValidated) {
  statusGuess = "not_submitted";
}

const result = {
  timestamp: new Date().toISOString(),
  status_guess: statusGuess,
  submission_validated: submissionValidated,
  query_echoed: queryEchoed,
  trace_before: traceBefore || null,
  trace_after: traceAfter || null,
  trace_changed: traceChanged,
  requirements_gate: hasRequirementsGate,
  likely_still_on_goals: likelyStillOnGoals,
  key_lines: keyLines,
  link_widgets_detected: uniqueTexts.some((t) => /Open links|Quick actions|Show more links|Show fewer links/i.test(t)),
  input_capture_preview: inputCapturePreview,
  final_output_preview: finalOutput,
  total_text_nodes: uniqueTexts.length,
};
fs.writeFileSync(`${outDir}/result.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
NODE

echo "OUT_DIR=$OUT_DIR"
