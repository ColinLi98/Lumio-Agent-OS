# Lumi Agent OS Product Blueprint

## Product Position
Lumi is an **Agent Operation System**, not a single-purpose app.

- Primary value: complete user intent across apps, websites, services, and markets.
- Core differentiators:
- `Digital Twin` for user-specific planning and validation.
- `LIX Market` for trading any legal capability needed to fulfill intent.

## Final Product Goal
Given one user intent, Lumi should:

1. Understand intent and missing constraints.
2. Run cloud reasoning and task decomposition.
3. Assign sub-agents and select best skills dynamically.
4. Execute with real, clickable actions across platforms.
5. Validate outcomes against user constraints and twin fit.
6. Return concrete, executable delivery with evidence.

## LIX Scope (Universal Intent Market)
LIX can trade any legal object required to satisfy human intent:

- Agents
- Skills / toolchains
- Human services
- Physical goods
- Hybrid delivery packages

Example:
User intent: `Budget £800, buy an iPhone`.
Lumi should publish this intent to LIX, scout supplier platforms/agents, compare legal offers, and return executable transaction actions.

## System Rules

1. No hardcoded domain routing in UI.
2. Cloud decides routing/decomposition dynamically.
3. If constraints are missing, ask user directly; do not assume.
4. `SUCCESS` requires verifiable evidence.
5. External spend/contract actions require confirmation token.
6. High-risk domains remain decision-support-only.
7. No empty response: always return `reason + next_action`.

## Runtime Chain
`Intent Intake -> Clarify -> Cloud Reasoning -> Task Graph -> Sub-Agent Skill Selection -> Execute -> Validate -> Deliver`

If internal capability is insufficient:
`Escalate to LIX -> Scout suppliers/agents -> Negotiate -> Validate -> Deliver`

## UX Implications

- Goals surface: collect intent and constraints only.
- Work surface: show execution graph, selected skills, gate status, evidence, and next action.
- LIX surface: show intent publication, supplier matching, offer comparison, and executable links.
- Activity surface: full trace and replay.

## Near-Term Acceptance Criteria

1. UI copy reflects "OS" narrative (not single app/tool narrative).
2. Goal submission uses cloud-dynamic routing only.
3. LIX custom request supports universal legal intent trading language.
4. Work output includes decomposition + skill selection trace.
5. Real responses include executable links and non-empty fallback.
