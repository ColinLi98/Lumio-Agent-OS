#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://lumi-agent-simulator.vercel.app}"
RUNS="${RUNS:-10}"
MIN_SUCCESS_RATE="${MIN_SUCCESS_RATE:-1.0}"
TIMEOUT="${TIMEOUT:-120}"
SLEEP_SECONDS="${SLEEP_SECONDS:-1}"
THINKING="${THINKING:-low}"
QUERY="${QUERY:-Plan a London to Jersey round trip next week with concrete options and real links.}"
HEALTH_MODEL_PREFIXES="${HEALTH_MODEL_PREFIXES:-gemini,gpt}"
MODEL_PREFIXES="${MODEL_PREFIXES:-gemini,gpt}"
ALLOWED_SOURCES="${ALLOWED_SOURCES:-cloud-gemini,cloud-openai-fallback}"

if ! command -v curl >/dev/null 2>&1; then
  echo "[verify] FAIL: curl is required"
  exit 2
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[verify] FAIL: python3 is required"
  exit 2
fi

if [[ "$RUNS" -lt 1 ]]; then
  echo "[verify] FAIL: RUNS must be >= 1"
  exit 2
fi

echo "[verify] base_url=$BASE_URL"
echo "[verify] runs=$RUNS min_success_rate=$MIN_SUCCESS_RATE timeout=${TIMEOUT}s thinking=$THINKING"

TMP_DIR="$(mktemp -d /tmp/openclaw-verify-XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

health_body="$TMP_DIR/health.json"
health_code="$(curl -sS --max-time "$TIMEOUT" -o "$health_body" -w "%{http_code}" "$BASE_URL/api/openclaw/health" || true)"

if [[ "$health_code" != "200" ]]; then
  echo "[verify] FAIL: health endpoint not ready (http=$health_code)"
  echo "[verify] health_body=$(cat "$health_body" 2>/dev/null || true)"
  exit 1
fi

HEALTH_MODEL_PREFIXES="$HEALTH_MODEL_PREFIXES" python3 - "$health_body" <<'PY'
import json, sys
import os
path = sys.argv[1]
try:
    data = json.load(open(path, "r", encoding="utf-8"))
except Exception as e:
    print(f"[verify] FAIL: health payload is not valid JSON: {e}")
    sys.exit(1)

ok = bool(data.get("ok"))
status = str(data.get("status", "")).strip()
service = str(data.get("service", "")).strip()
model = str(data.get("model", "")).strip()
allowed_prefixes = [p.strip().lower() for p in os.environ.get("HEALTH_MODEL_PREFIXES", "gemini,gpt").split(",") if p.strip()]

if not ok:
    print(f"[verify] FAIL: health ok=false status={status or 'n/a'}")
    sys.exit(1)
if service != "openclaw-relay":
    print(f"[verify] FAIL: unexpected service={service or 'n/a'}")
    sys.exit(1)
if not any(model.lower().startswith(prefix) for prefix in allowed_prefixes):
    print(f"[verify] FAIL: unexpected model={model or 'n/a'}")
    sys.exit(1)

print(f"[verify] health_ok service={service} model={model} status={status or 'n/a'}")
PY

success_count=0
declare -a failed_runs=()
declare -a latencies=()

for i in $(seq 1 "$RUNS"); do
  req_file="$TMP_DIR/chat_req_$i.json"
  body_file="$TMP_DIR/chat_body_$i.json"
  echo "{\"query\":\"${QUERY//\"/\\\"}\",\"thinking\":\"$THINKING\"}" > "$req_file"

  metrics_file="$TMP_DIR/chat_metrics_$i.txt"
  metrics="$(curl -sS --max-time "$TIMEOUT" \
    -H "content-type: application/json" \
    -X POST "$BASE_URL/api/openclaw/chat" \
    --data @"$req_file" \
    -o "$body_file" \
    -w "%{http_code} %{time_total}" || true)"
  code="${metrics%% *}"
  time_total="${metrics##* }"

  latencies+=("$time_total")

  if [[ "$code" != "200" ]]; then
    failed_runs+=("#$i http=$code")
    echo "[verify] run=$i FAIL http=$code latency=${time_total}s"
    sleep "$SLEEP_SECONDS"
    continue
  fi

  check_output="$(MODEL_PREFIXES="$MODEL_PREFIXES" ALLOWED_SOURCES="$ALLOWED_SOURCES" python3 - "$body_file" <<'PY'
import json, sys
import os
path = sys.argv[1]
try:
    data = json.load(open(path, "r", encoding="utf-8"))
except Exception as e:
    print(f"FAIL invalid_json {e}")
    sys.exit(0)

success = bool(data.get("success"))
trace_id = str(data.get("trace_id", "")).strip()
reply = str(data.get("reply", "")).strip()
model = str(data.get("model", "")).strip()
source = str(data.get("source", "")).strip()
error = str(data.get("error", "")).strip()
allowed_model_prefixes = [p.strip().lower() for p in os.environ.get("MODEL_PREFIXES", "gemini,gpt").split(",") if p.strip()]
allowed_sources = {s.strip() for s in os.environ.get("ALLOWED_SOURCES", "cloud-gemini,cloud-openai-fallback").split(",") if s.strip()}

if not success:
    print(f"FAIL success_false {error or 'unknown_error'}")
elif not trace_id:
    print("FAIL missing_trace_id")
elif not reply:
    print("FAIL empty_reply")
elif not any(model.lower().startswith(prefix) for prefix in allowed_model_prefixes):
    print(f"FAIL unexpected_model {model or 'n/a'}")
elif source and source not in allowed_sources:
    print(f"FAIL unexpected_source {source}")
else:
    print(f"PASS trace={trace_id} model={model} source={source or 'n/a'} reply_len={len(reply)}")
PY
)"

  if [[ "$check_output" == PASS* ]]; then
    success_count=$((success_count + 1))
    echo "[verify] run=$i PASS latency=${time_total}s ${check_output#PASS }"
  else
    failed_runs+=("#$i ${check_output#FAIL }")
    echo "[verify] run=$i FAIL latency=${time_total}s ${check_output#FAIL }"
  fi

  sleep "$SLEEP_SECONDS"
done

success_rate="$(python3 - <<PY
runs = int("$RUNS")
ok = int("$success_count")
print(f"{ok/runs:.4f}")
PY
)"

avg_latency="$(python3 - <<PY
vals = [float(x) for x in """${latencies[*]}""".split() if x.strip()]
if not vals:
    print("0.000")
else:
    print(f"{sum(vals)/len(vals):.3f}")
PY
)"

echo "[verify] summary success=$success_count/$RUNS success_rate=$success_rate avg_latency_s=$avg_latency"
if [[ "${#failed_runs[@]}" -gt 0 ]]; then
  printf '[verify] failed_runs=%s\n' "${failed_runs[*]}"
fi

pass_gate="$(python3 - <<PY
rate = float("$success_rate")
threshold = float("$MIN_SUCCESS_RATE")
print("yes" if rate >= threshold else "no")
PY
)"

if [[ "$pass_gate" != "yes" ]]; then
  echo "[verify] FAIL: success_rate ${success_rate} < required ${MIN_SUCCESS_RATE}"
  exit 1
fi

echo "[verify] PASS: OpenClaw release gate passed"
