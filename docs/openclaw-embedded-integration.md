# OpenClaw Embedded Integration (Lumi)

## Why this integration mode

Lumi keeps a stable product API (`/api/openclaw/chat`, `/api/openclaw/health`) while embedding upstream OpenClaw source as a pinned dependency.  
This gives:

- reproducible OpenClaw versioning in-repo
- no developer-specific `~/.openclaw/...` runtime path dependency
- controlled fallback behavior (`OpenClaw CLI -> Gemini direct`)

## What is integrated

- Upstream OpenClaw source as submodule:
  - `third_party/openclaw`
- Lumi relay moved in-repo:
  - `openclaw-relay/main.py`
  - `openclaw-relay/bellman_optimizer.py`

The relay now resolves OpenClaw CLI in this order:

1. `OPENCLAW_BIN` override
2. embedded `node third_party/openclaw/openclaw.mjs`
3. global `openclaw` in `PATH`

## Bootstrap

```bash
scripts/openclaw/bootstrap-embedded.sh
```

## Start local relay

```bash
export GEMINI_API_KEY="<your-key>"
scripts/openclaw/start-embedded-relay.sh
```

Health check:

```bash
curl -sS http://127.0.0.1:8902/health
```

## Android local run path

`LumiKeyboard-Android/build_and_test.sh` now starts relay from:

- `openclaw-relay/main.py`

and injects:

- `OPENCLAW_SUBMODULE_DIR=$REPO_ROOT/third_party/openclaw`

## Environment variables

- `GEMINI_API_KEY` / `LUMI_GEMINI_API_KEY` / `GOOGLE_API_KEY`
- `OPENCLAW_GEMINI_MODEL` (default: `gemini-3.1-pro-preview`)
- `OPENCLAW_SUBMODULE_DIR` (optional override)
- `OPENCLAW_WORKSPACE_DIR` (default: `<repo>/.openclaw/workspace`)
- `OPENCLAW_BIN` (optional CLI command override)
- `OPENCLAW_NODE_BIN` (default: `node`)
- `OPENCLAW_GATEWAY_URL` (health probe URL, default `http://localhost:18789`)
