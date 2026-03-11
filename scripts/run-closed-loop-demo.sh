#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${OUT_DIR:-/tmp/lumi-closed-loop-demo-$(date +%Y%m%d-%H%M%S)}"
LIVE_OUT="$OUT_DIR/live-api"
DEPLOYMENT_URL="${DEPLOYMENT_URL:-https://lumi-agent-simulator.vercel.app}"
SUPER_QUERY="${SUPER_QUERY:-请并行协作完成: 1) 比较北京到上海明天机票 2) 推荐2家浦东商务酒店 3) 输出可执行决策清单并说明证据}"
CHAT_QUERY="${CHAT_QUERY:-please parallel multi-agent plan beijing to shanghai flight tomorrow and pudong hotel with evidence and checklist}"
WAIT_SECONDS="${WAIT_SECONDS:-50}"

mkdir -p "$OUT_DIR" "$LIVE_OUT"

echo "[1/5] Real cloud API demo (no mock)"
OUT_DIR="$LIVE_OUT" bash "$ROOT_DIR/scripts/run-live-demo.sh" \
  --no-adb \
  --deployment="$DEPLOYMENT_URL" \
  --super-query="$SUPER_QUERY" \
  > "$OUT_DIR/live_demo.log"

echo "[2/5] Avatar baseline capture"
adb shell am start -n com.lumi.keyboard/.MainActivity -a android.intent.action.VIEW -d 'lumi://avatar' >/dev/null
sleep 3
adb shell uiautomator dump /sdcard/lumi-avatar-before-loop.xml >/dev/null 2>&1
adb shell cat /sdcard/lumi-avatar-before-loop.xml > "$OUT_DIR/avatar_before.xml"

echo "[3/5] Run one real chat request in app"
adb shell am start -n com.lumi.keyboard/.MainActivity >/dev/null
sleep 2

COORDS_FILE="$OUT_DIR/coords.txt"
node > "$COORDS_FILE" <<'NODE'
const cp = require('child_process');
cp.execSync("adb shell uiautomator dump /sdcard/lumi-chat-structure.xml >/dev/null 2>&1");
const xml = cp.execSync("adb shell cat /sdcard/lumi-chat-structure.xml", { encoding: 'utf8' });
function center(bounds) {
  const m = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!m) return null;
  const x = Math.round((parseInt(m[1], 10) + parseInt(m[3], 10)) / 2);
  const y = Math.round((parseInt(m[2], 10) + parseInt(m[4], 10)) / 2);
  return { x, y };
}
const chatTabMatch = xml.match(/text=\"对话\"[^>]*bounds=\"([^\"]+)\"/);
const inputMatch = xml.match(/text=\"输入问题\\.\\.\\.\"[^>]*bounds=\"([^\"]+)\"/);
const submitMatch = xml.match(/text=\"提交到 App 内部后端\"[^>]*bounds=\"([^\"]+)\"/);
if (!chatTabMatch || !inputMatch || !submitMatch) {
  process.stdout.write("630,1755,420,560,1480,670");
  process.exit(0);
}
const chatCenter = center(chatTabMatch[1]);
const inputCenter = center(inputMatch[1]);
const submitCenter = center(submitMatch[1]);
if (!chatCenter || !inputCenter || !submitCenter) {
  process.stdout.write("630,1755,420,560,1480,670");
  process.exit(0);
}
process.stdout.write(`${chatCenter.x},${chatCenter.y},${inputCenter.x},${inputCenter.y},${submitCenter.x},${submitCenter.y}`);
NODE
COORDS="$(tr -d '\r\n' < "$COORDS_FILE")"

CHAT_X="$(echo "$COORDS" | cut -d',' -f1)"
CHAT_Y="$(echo "$COORDS" | cut -d',' -f2)"
INPUT_X="$(echo "$COORDS" | cut -d',' -f3)"
INPUT_Y="$(echo "$COORDS" | cut -d',' -f4)"
SUBMIT_X="$(echo "$COORDS" | cut -d',' -f5)"
SUBMIT_Y="$(echo "$COORDS" | cut -d',' -f6)"

ADB_TEXT="$(echo "$CHAT_QUERY" | sed 's/ /%s/g')"
adb shell input tap "$CHAT_X" "$CHAT_Y"
sleep 1
adb shell input tap "$INPUT_X" "$INPUT_Y"
sleep 1
adb shell input text "$ADB_TEXT"
sleep 1
adb shell input tap "$SUBMIT_X" "$SUBMIT_Y"
sleep "$WAIT_SECONDS"

adb shell uiautomator dump /sdcard/lumi-chat-after-loop.xml >/dev/null 2>&1
adb shell cat /sdcard/lumi-chat-after-loop.xml > "$OUT_DIR/chat_after.xml"

echo "[4/5] Avatar after capture"
adb shell am start -n com.lumi.keyboard/.MainActivity -a android.intent.action.VIEW -d 'lumi://avatar' >/dev/null
sleep 3
adb shell uiautomator dump /sdcard/lumi-avatar-after-loop.xml >/dev/null 2>&1
adb shell cat /sdcard/lumi-avatar-after-loop.xml > "$OUT_DIR/avatar_after.xml"

echo "[5/5] Build closed-loop summary"
node - <<'NODE' "$OUT_DIR"
const fs = require('fs');
const path = require('path');
const outDir = process.argv[2];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readXmlTexts(file) {
  const xml = fs.readFileSync(file, 'utf8');
  return [...xml.matchAll(/text="([^"]*)"/g)]
    .map((m) => m[1])
    .filter(Boolean)
    .map((s) => s.replace(/&#10;/g, '\n').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&'));
}

function extractTraits(lines) {
  const out = {};
  for (let i = 1; i < lines.length; i += 1) {
    if (/^\d+%$/.test(lines[i])) {
      const key = lines[i - 1].trim();
      if (key && !/^\d+%$/.test(key)) out[key] = parseInt(lines[i], 10);
    }
  }
  return out;
}

const liveSuper = readJson(path.join(outDir, 'live-api', 'super_agent.json'));
const chatTexts = readXmlTexts(path.join(outDir, 'chat_after.xml'));
const beforeTraits = extractTraits(readXmlTexts(path.join(outDir, 'avatar_before.xml')));
const afterTraits = extractTraits(readXmlTexts(path.join(outDir, 'avatar_after.xml')));

const traitKeys = [...new Set([...Object.keys(beforeTraits), ...Object.keys(afterTraits)])];
const traitDiff = traitKeys.map((key) => ({
  trait: key,
  before: beforeTraits[key] ?? null,
  after: afterTraits[key] ?? null,
  delta:
    typeof beforeTraits[key] === 'number' && typeof afterTraits[key] === 'number'
      ? afterTraits[key] - beforeTraits[key]
      : null
}));

const chatTrace = chatTexts.find((line) => line.startsWith('trace:')) || '';
const chatStatus = chatTexts.find((line) => line.startsWith('状态:')) || '';
const answerPreview =
  chatTexts.find((line) => line.startsWith('你好！收到')) ||
  chatTexts.find((line) => line.includes('并行')) ||
  String(liveSuper.answer || '');

const summary = {
  cloud_super_agent: {
    trace_id: liveSuper.trace_id,
    mode: liveSuper.routing_decision?.mode,
    reason_codes: liveSuper.routing_decision?.reason_codes || [],
    scores: liveSuper.routing_decision?.scores || {},
    task_graph: liveSuper.task_graph || {},
    selected_agents: liveSuper.marketplace_selected_agents || [],
    skill_invocations: liveSuper.skill_invocations || [],
    evidence_count: Array.isArray(liveSuper.evidence) ? liveSuper.evidence.length : 0,
    execution_time_ms: liveSuper.executionTimeMs
  },
  app_chat_runtime: {
    trace: chatTrace,
    status: chatStatus,
    answer_preview: answerPreview.slice(0, 300)
  },
  digital_twin_diff: traitDiff
};

const summaryFile = path.join(outDir, 'closed_loop_summary.json');
fs.writeFileSync(summaryFile, `${JSON.stringify(summary, null, 2)}\n`);

const now = new Date().toISOString();
const reportLines = [
  '# Lumi 真实闭环演示报告',
  '',
  `- 生成时间: ${now}`,
  `- 云端 Super Agent Trace: ${summary.cloud_super_agent.trace_id || '-'}`,
  `- 路由模式: ${summary.cloud_super_agent.mode || '-'}`,
  `- App 执行状态: ${summary.app_chat_runtime.status || '-'}`,
  '',
  '## 1) 云端推理与任务拆解',
  '',
  `- reason codes: ${(summary.cloud_super_agent.reason_codes || []).join(' | ') || '-'}`,
  `- complexity/risk/dependency: ${JSON.stringify(summary.cloud_super_agent.scores || {})}`,
  `- task count: ${(summary.cloud_super_agent.task_graph?.tasks || []).length}`,
  ''
];

const tasks = summary.cloud_super_agent.task_graph?.tasks || [];
if (tasks.length > 0) {
  reportLines.push('### 任务图');
  reportLines.push('');
  tasks.forEach((task, idx) => {
    reportLines.push(`${idx + 1}. ${task.title} (${(task.required_capabilities || []).join(', ') || 'general'})`);
  });
  reportLines.push('');
}

reportLines.push('## 2) Agent 分发与 Skills 调用');
reportLines.push('');
const selectedAgents = summary.cloud_super_agent.selected_agents || [];
if (selectedAgents.length === 0) {
  reportLines.push('- 未命中 Agent');
} else {
  selectedAgents.forEach((row, idx) => {
    reportLines.push(`- Agent#${idx + 1}: ${row.task_id} -> ${row.agent_id}`);
  });
}
reportLines.push('');
const skills = summary.cloud_super_agent.skill_invocations || [];
if (skills.length === 0) {
  reportLines.push('- 未记录 Skills 调用');
} else {
  skills.forEach((row, idx) => {
    reportLines.push(
      `- Skill#${idx + 1}: ${row.skill_id} | source=${row.source} | status=${row.status} | latency=${row.latency_ms}ms | evidence=${row.evidence_count}`
    );
  });
}
reportLines.push('');
reportLines.push(`- evidence_count: ${summary.cloud_super_agent.evidence_count}`);
reportLines.push(`- execution_time_ms: ${summary.cloud_super_agent.execution_time_ms}`);
reportLines.push('');

reportLines.push('## 3) App 内结果回流');
reportLines.push('');
reportLines.push(`- trace: ${summary.app_chat_runtime.trace || '-'}`);
reportLines.push(`- status: ${summary.app_chat_runtime.status || '-'}`);
reportLines.push(`- answer_preview: ${(summary.app_chat_runtime.answer_preview || '').replace(/\n/g, ' ').slice(0, 320)}`);
reportLines.push('');

reportLines.push('## 4) 数字分身更新');
reportLines.push('');
reportLines.push('| trait | before | after | delta |');
reportLines.push('|---|---:|---:|---:|');
for (const row of summary.digital_twin_diff || []) {
  const delta = row.delta === null ? '-' : `${row.delta >= 0 ? '+' : ''}${row.delta}`;
  reportLines.push(`| ${row.trait} | ${row.before ?? '-'} | ${row.after ?? '-'} | ${delta} |`);
}
reportLines.push('');

reportLines.push('## 5) 证据文件');
reportLines.push('');
reportLines.push(`- ${path.join(outDir, 'live_demo.log')}`);
reportLines.push(`- ${path.join(outDir, 'live-api', 'discover.json')}`);
reportLines.push(`- ${path.join(outDir, 'live-api', 'manual_execute.json')}`);
reportLines.push(`- ${path.join(outDir, 'live-api', 'super_agent.json')}`);
reportLines.push(`- ${path.join(outDir, 'chat_after.xml')}`);
reportLines.push(`- ${path.join(outDir, 'avatar_before.xml')}`);
reportLines.push(`- ${path.join(outDir, 'avatar_after.xml')}`);
reportLines.push(`- ${summaryFile}`);

const reportFile = path.join(outDir, 'closed_loop_report.md');
fs.writeFileSync(reportFile, `${reportLines.join('\n')}\n`);

console.log('===== CLOSED LOOP DEMO SUMMARY =====');
console.log(`cloud trace: ${summary.cloud_super_agent.trace_id}`);
console.log(`mode: ${summary.cloud_super_agent.mode}`);
console.log(`app status: ${summary.app_chat_runtime.status}`);
for (const row of summary.digital_twin_diff) {
  if (row.delta === null) {
    console.log(`trait: ${row.trait} | before=${row.before} after=${row.after}`);
  } else {
    const sign = row.delta >= 0 ? '+' : '';
    console.log(`trait: ${row.trait} | ${row.before}% -> ${row.after}% (${sign}${row.delta})`);
  }
}
console.log(`saved: ${summaryFile}`);
console.log(`report: ${path.join(outDir, 'closed_loop_report.md')}`);
NODE

echo
echo "Artifacts:"
echo "  $OUT_DIR/live_demo.log"
echo "  $OUT_DIR/live-api/discover.json"
echo "  $OUT_DIR/live-api/manual_execute.json"
echo "  $OUT_DIR/live-api/super_agent.json"
echo "  $OUT_DIR/chat_after.xml"
echo "  $OUT_DIR/avatar_before.xml"
echo "  $OUT_DIR/avatar_after.xml"
echo "  $OUT_DIR/closed_loop_summary.json"
echo "  $OUT_DIR/closed_loop_report.md"
