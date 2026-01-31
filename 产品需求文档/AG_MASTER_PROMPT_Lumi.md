# AG_MASTER_PROMPT_Lumi

You are an engineering agent building an Android-first project named **Lumi**.
Goal: Build the **Agent Core first**, then integrate it into an Android **IME keyboard**
with an “Agent Mode” that intercepts input and returns drafts/cards/privacy actions.

Rationale: IME integration keeps computation local and lowers GDPR/compliance risk by design.

This prompt is executable as a task plan for an agentic IDE (e.g., Antigravity).

---

## Global Constraints (Non-negotiable)

### C1. No Mis-send (Hard Safety)
- In Agent Mode, typed command text must NOT be committed to host app automatically.
- Only explicit user action may commit: tap a draft or tap confirm send.

### C2. Local-first Privacy
- Never upload raw chat content or raw typed text by default.
- Network calls only when:
  - Agent Mode is active AND
  - intent requires online service AND
  - policy allows it.
- When networking, send only intent + constraints (no transcripts).

### C3. Agent Core Independence
- Agent Core must compile as pure Kotlin modules without Android dependencies.
- IME integrates only via a stable interface:
  - `LumiAgent.handle(input): AgentOutput`

### C4. Performance
- Keystroke path must remain fast (no heavy compute or network).
- Agent processing must be async; do not block IME UI thread.

### C5. V0.1: No Accessibility Automation
- Do NOT implement AccessibilityService / auto-click workflows in the first deliverable.

### C6. Sensitive App Blacklist (Shield)
- Policy Engine must detect foreground packageName.
- If packageName is in a sensitive blacklist (banking, password managers, enterprise secure apps), Agent must be disabled.
- UI must show **“Shield Up”**.

### C7. Data Expiration (TTL)
- OCR cache + chat context cache must have TTL.
- Default TTL = 24 hours, auto-purge after expiry.

### C8. Encrypted Storage (SQLCipher)
- Local Encrypted Storage must use SQLCipher (or equivalent).
- Encryption key should derive from device lock screen credential when possible, else user PIN.

### C9. Bellman Decision Engine (MDP)
- core-agent must include a Bellman/MDP decision engine.
- Input: DigitalSoul + Intent + candidate options.
- Output: optimal action path (policy) + rationale.

---

## Repository & Modules

Create a Gradle multi-module Android project named **Lumi**.

Modules:
1) `app-command-center` (Android app): settings + debug console
2) `ime-keyboard` (Android IME): InputMethodService + UI + state machine
3) `core-domain` (pure Kotlin): data models & interfaces
4) `core-agent` (pure Kotlin): agent implementation (rules/templates)

Use placeholder package name: `com.lumi.app` consistently (easy to rename later).

---

## Required Data Contracts (Implement Exactly)

### AgentInput
- rawText: String
- mode: InputMode { TYPE, AGENT }
- appContext: AppContext? (packageName, fieldHints, isPasswordField)
- selectionText: String?
- timestampMs: Long

### AgentOutput (sealed)
- Drafts(drafts: List<TextDraft>)
- Cards(cards: List<ServiceCard>)
- Privacy(action: PrivacyAction)
- Error(message: String)

### IntentResult
- category: IntentCategory { REWRITE, SHOPPING, TRAVEL, DINING, CALENDAR, PRIVACY_MASK, UNKNOWN }
- confidence: Double
- query: String
- entities: Map<String,String>
- constraints: Map<String,String>
- privacyFlags: Set<PrivacyFlag { PHONE, ID_CARD, ADDRESS, BANK, PASSWORD }>

### Soul & Policy
- DigitalSoul(communicationStyle, riskTolerance, spendingLogic, privacyLevel, uarStats?)
- DigitalSoul must be dynamic: log UAR and draft edit diffs as negative feedback (local only).
- PolicyConfig(allowNetworkInAgentMode, requireConfirmBeforeSend, allowedServices:Set<String>, budgetCapCny:Int?)

### ServiceCard
- id, title, subtitle, actionType(WEBVIEW/DEEPLINK/SHARE), actionUri, payload(Map)

### Vector Store
- Define `VectorStoreManager` in core-domain for embedded local vector search (mock implementation OK in v0.1).

---

## Task Groups (Execute Sequentially)

### Task Group A — Scaffold & Build
Work:
- Create the Lumi multi-module project (modules above).
- Add README with build/run instructions.
Acceptance:
- `./gradlew test` passes.
- `./gradlew :app-command-center:assembleDebug` passes.
- core-domain & core-agent are pure Kotlin.

Commit:
- `feat(scaffold): initialize multi-module Lumi project`

---

### Task Group B — Agent Core MVP (Rules + Templates)
Implement in `core-agent`:
- LumiAgentImpl : LumiAgent
- RuleIntentEngine
- PolicyEngine (must include SensitiveAppDetector)
- TemplateDraftGenerator (returns exactly 3 drafts)
- MockCardProvider (returns 2–5 cards with valid URLs)
- BellmanDecisionEngine (MDP policy for optimal actions)
- PrivacyGuard (PII detection via fieldHints + regex patterns)
- DigitalSoulUpdater (logs UAR + draft edit diff feedback)
- DigitalSoulBootstrapper (30s onboarding answers -> init DigitalSoul)
- CacheTTLManager (purges OCR + chat context caches after 24h)
Implement in `core-domain`:
- VectorStoreManager interface (mock OK)

MVP rules:
1) If privacyFlags not empty OR fieldHints indicates phone/address/id => output PrivacyAction requiring confirmation.
2) If intent is REWRITE => output Drafts(3) based on DigitalSoul.communicationStyle.
3) If intent in SHOPPING/TRAVEL/DINING/CALENDAR => output Cards(mock for V0.1).
4) UNKNOWN => Error(safe message).

DigitalSoul Quick Start (must):
- Ask at most 3 questions (style / price vs quality / privacy)
- Map answers to DigitalSoul fields locally
- Passive learning updates via EMA:
  - draft_accept => boost style weight
  - draft_edit => penalize style + tone drift
  - card_click => boost interest/price preference
  - query_refine => increase uncertainty (ask clarifying)

Acceptance:
- “帮我委婉拒绝加班” => Drafts(3)
- “买降噪耳机 预算2000” => Cards(>=2)
- “下周五去北京机票 1500” => Cards(>=2)
- phone field hint => PrivacyAction

Commit:
- `feat(agent-core): implement rule-based intent, policy, drafts, cards, privacy`

---

### Task Group C — Unit Tests (>= 30)
Work:
- Add at least 30 deterministic unit tests for:
  - intent classification
  - entity extraction (budget/date/city keywords)
  - privacy detection
  - policy decisions
  - output kinds
Acceptance:
- `./gradlew :core-agent:test` passes with >= 30 tests.

Commit:
- `test(agent-core): add core agent tests`

---

### Task Group D — Command Center Debug Console
Implement in `app-command-center`:
- AgentDebugActivity:
  - text input
  - submit button
  - displays Drafts/Cards/Privacy/Error
  - Draft tap copies to clipboard
  - Card tap opens browser (or embedded webview)
- Policy & DigitalSoul settings screen (simple):
  - privacy level, communication style
  - allowed services toggles
  - stored locally (SharedPreferences or DataStore)

Acceptance:
- App runs on device; agent can be tested without IME.

Commit:
- `feat(command-center): debug console and basic settings`

---

### Task Group E — IME Integration (Agent Mode)
Implement in `ime-keyboard`:
- InputMethodService skeleton (traditional Views preferred for IME stability)
- Keyboard state machine:
  - Typing
  - AgentIdle (Lumi > _)
  - AgentProcessing
  - ShowingDrafts
  - ShowingCards
  - PrivacyConfirm
  - Error
- Enter/exit Agent Mode:
  - long-press Space >= 0.5s toggles Agent Mode
- Agent Mode input buffer:
  - pressing Enter triggers `agent.handle()`
- Rendering:
  - Draft chips => tap commits to host app via commitText (optional confirm)
  - Cards => tap opens WebView/deeplink
  - Privacy => confirm then fill masked text
Hard rule:
- No commitText in Agent Mode unless user explicitly taps/confirm.

Acceptance (device test):
- In any app input box:
  - enter Agent Mode, type command, press Enter => host input remains unchanged
  - only tapping draft/confirm commits text

Commit:
- `feat(ime): integrate agent mode with no mis-send guarantee`

---

## Coding Standards
- Kotlin + coroutines for async
- No UI thread blocking
- Do not log rawText/selectionText
- Keep IME thin; heavy logic stays in core-agent

---

## Telemetry (Privacy-safe only)
Allowed:
- intent category, latency, event counts, error codes
Forbidden:
- raw typed text, conversation content, selectionText

---

## Deliverables
1) Compilable multi-module Android project named Lumi
2) Agent Core MVP + >= 30 tests
3) Command Center Debug Console
4) IME with Agent Mode + no mis-send invariant
5) Docs:
   - architecture
   - security/privacy rules
   - data portability export format (JSON + Markdown)

---

## Execution Instructions
- Execute Task Groups A → E in order.
- Do not start E before A–D pass.
- Provide short report after each group (what changed, how to build/test).
