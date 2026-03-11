#!/usr/bin/env bash
set -euo pipefail

DEPLOYMENT_URL="${DEPLOYMENT_URL:-https://lumi-agent-simulator.vercel.app}"
DISCOVER_QUERY="${DISCOVER_QUERY:-帮我找北京到上海明天的机票}"
MANUAL_QUERY="${MANUAL_QUERY:-帮我找北京到上海明天的机票，给出3个可选航班}"
SUPER_QUERY="${SUPER_QUERY:-请给我3条今天高效工作的建议}"
RUN_ADB=0
OUT_DIR="${OUT_DIR:-/tmp/lumi-live-demo-$(date +%Y%m%d-%H%M%S)}"

for arg in "$@"; do
  case "$arg" in
    --adb)
      RUN_ADB=1
      ;;
    --no-adb)
      RUN_ADB=0
      ;;
    --deployment=*)
      DEPLOYMENT_URL="${arg#*=}"
      ;;
    --discover-query=*)
      DISCOVER_QUERY="${arg#*=}"
      ;;
    --manual-query=*)
      MANUAL_QUERY="${arg#*=}"
      ;;
    --super-query=*)
      SUPER_QUERY="${arg#*=}"
      ;;
  esac
done

mkdir -p "$OUT_DIR"

DISCOVER_FILE="$OUT_DIR/discover.json"
MANUAL_FILE="$OUT_DIR/manual_execute.json"
SUPER_FILE="$OUT_DIR/super_agent.json"
ADB_FILE="$OUT_DIR/adb_chat_dump.xml"

echo "[1/4] Discover agents"
npx vercel curl /api/agent-market/discover \
  --deployment "$DEPLOYMENT_URL" \
  -- --request POST \
  --header "content-type: application/json" \
  --data "{\"query\":\"$DISCOVER_QUERY\",\"require_realtime\":true,\"digital_twin_context\":{\"user_id\":\"demo_user\",\"locale\":\"zh-CN\"}}" \
  > "$DISCOVER_FILE"

SELECTED_AGENT_IDS_JSON="$(
  node -e '
    const fs = require("fs");
    const path = process.argv[1];
    const raw = fs.readFileSync(path, "utf8");
    const json = JSON.parse(raw);
    const candidates = Array.isArray(json.candidates) ? json.candidates : [];
    const preferred = ["tool:web_search", "tool:live_search"];
    const ids = [];
    for (const id of preferred) {
      if (candidates.find((c) => c && c.agent_id === id)) ids.push(id);
    }
    for (const c of candidates) {
      const id = String(c?.agent_id || "");
      if (!id || ids.includes(id)) continue;
      ids.push(id);
      if (ids.length >= 2) break;
    }
    if (ids.length === 0) ids.push("tool:web_search");
    if (ids.length === 1) ids.push("tool:live_search");
    process.stdout.write(JSON.stringify(ids.slice(0, 2)));
  ' "$DISCOVER_FILE"
)"

MANUAL_PAYLOAD="$(
  node -e '
    const ids = JSON.parse(process.argv[1]);
    const query = process.argv[2];
    const payload = {
      query,
      locale: "zh-CN",
      domain_hint: "travel",
      max_parallel: 1,
      selected_agent_ids: ids
    };
    process.stdout.write(JSON.stringify(payload));
  ' "$SELECTED_AGENT_IDS_JSON" "$MANUAL_QUERY"
)"

echo "[2/4] Manual execute"
npx vercel curl /api/agent-market/manual-execute \
  --deployment "$DEPLOYMENT_URL" \
  -- --request POST \
  --header "content-type: application/json" \
  --data "$MANUAL_PAYLOAD" \
  > "$MANUAL_FILE"

echo "[3/4] Super agent"
curl -sS --max-time 180 "$DEPLOYMENT_URL/api/super-agent/execute" \
  -H "content-type: application/json" \
  -d "{\"query\":\"$SUPER_QUERY\"}" \
  > "$SUPER_FILE"

if [[ "$RUN_ADB" == "1" ]]; then
  echo "[4/4] ADB chat dump"
  adb shell am start -n com.lumi.keyboard/.MainActivity >/dev/null
  sleep 1
  adb shell uiautomator dump /sdcard/lumi-chat-live-demo.xml >/dev/null 2>&1
  adb shell cat /sdcard/lumi-chat-live-demo.xml > "$ADB_FILE"
else
  echo "[4/4] ADB skipped (pass --adb to enable)"
fi

echo
echo "===== LIVE DEMO SUMMARY ====="
node -e '
  const fs = require("fs");
  const discover = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const manual = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const superAgent = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

  const topCandidates = (discover.candidates || [])
    .slice(0, 3)
    .map((c) => `${c.agent_id}:${c.total_score}`)
    .join(", ");
  console.log(`[discover] trace=${discover.trace_id || "-"} top=${topCandidates || "-"}`);

  const manualRows = (manual.results || []).map((r) =>
    `${r.agent_id} => ${r.success ? "SUCCESS" : "FAIL"} | ${(r.summary || "").slice(0, 90)}${r.error ? ` | error=${r.error}` : ""}`
  );
  console.log(`[manual] trace=${manual.trace_id || "-"} success=${manual.success_count || 0} failed=${manual.failed_count || 0}`);
  for (const row of manualRows) console.log(`  - ${row}`);

  const routing = superAgent.routing_decision || {};
  const skills = (superAgent.skill_invocations || [])
    .slice(0, 6)
    .map((s) => `${s.skill_id}:${s.status}`)
    .join(", ");
  console.log(`[super] success=${superAgent.success} trace=${superAgent.trace_id || "-"} mode=${routing.mode || "-"}`);
  console.log(`[super] reason=${(routing.reason_codes || []).join("|") || "-"}`);
  console.log(`[super] skills=${skills || "-"}`);
  console.log(`[super] answer=${String(superAgent.answer || "").slice(0, 220).replace(/\n/g, " ")}...`);
' "$DISCOVER_FILE" "$MANUAL_FILE" "$SUPER_FILE"

echo
echo "Artifacts:"
echo "  $DISCOVER_FILE"
echo "  $MANUAL_FILE"
echo "  $SUPER_FILE"
if [[ "$RUN_ADB" == "1" ]]; then
  echo "  $ADB_FILE"
fi
