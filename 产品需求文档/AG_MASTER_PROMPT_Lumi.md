# AG_MASTER_PROMPT_Lumi

You are an engineering agent building an Android-first project named **Lumi**.
Goal: Build the **Agent Core first**, then integrate it into an Android **IME keyboard**
with an “Agent Mode” that intercepts input and returns drafts/cards/privacy actions.

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
- SoulMatrix(communicationStyle, riskTolerance, spendingLogic, privacyLevel)
- PolicyConfig(allowNetworkInAgentMode, requireConfirmBeforeSend, allowedServices:Set<String>, budgetCapCny:Int?)

### ServiceCard
- id, title, subtitle, actionType(WEBVIEW/DEEPLINK/SHARE), actionUri, payload(Map)

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
- PolicyEngine
- TemplateDraftGenerator (returns exactly 3 drafts)
- MockCardProvider (returns 2–5 cards with valid URLs)
- PrivacyGuard (PII detection via fieldHints + regex patterns)

MVP rules:
1) If privacyFlags not empty OR fieldHints indicates phone/address/id => output PrivacyAction requiring confirmation.
2) If intent is REWRITE => output Drafts(3) based on SoulMatrix.communicationStyle.
3) If intent in SHOPPING/TRAVEL/DINING/CALENDAR => output Cards(mock for V0.1).
4) UNKNOWN => Error(safe message).

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
- Policy & Soul settings screen (simple):
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

---

## Execution Instructions
- Execute Task Groups A → E in order.
- Do not start E before A–D pass.
- Provide short report after each group (what changed, how to build/test).
