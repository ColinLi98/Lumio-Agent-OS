# Android Investor Function Stage Map (Lumi)

## Sources Checked
- `Lumi_AI_Investor_Pitch.pptx` (EN)
- `Lumi_AI_投资者路演_中文版.pptx` (CN)
- `docs/lumi-prd-v1-engineering-plan.md` (execution baseline)

## Capability Mapping
| Investor Claim (Slides) | Android Current Reality | Stage |
|---|---|---|
| L1 Keyboard Sentinel, `<150ms`, privacy-first | IME Agent Mode, sensitive-app protection, app handoff/backflow are implemented | LIVE |
| Super Agent orchestration + routing/task graph | App backend service + orchestrator return routing/taskGraph/skillInvocations | LIVE |
| LIX intent exchange + 8-stage validation | LIX module supports publish/offer/accept flow with pipeline visibility | LIVE |
| Digital Twin baseline (state vector, consensus, trajectory) | Avatar module displays consensus, aura, trajectory, profile traits | LIVE |
| Destiny Engine (Bellman path + risk + evidence) | Destiny module renders strategy, J-curve, route steps, evidence list | LIVE |
| DTOE deep strategy contract (`next_best_action`, `alternatives`, `audit`) | Not fully mapped in Android destiny UI yet | IN_PROGRESS |
| Twin persistence after app/service restart | State continuity still mainly memory-based | IN_PROGRESS |
| Cross-device twin cloud sync | Flag exists, full sync-observability-fallback loop not closed yet | PLANNED / IN_PROGRESS (by flag) |
| Investor KPI-grade observability consistency | Settings/Home expose DTOE uplift, calibration error, confidence coverage with baseline comparison | LIVE |

## Near-term Build Focus
1. `E-01` DTOE deep strategy contract mapping on Android.
2. `E-02` Dynamic state persistence and recovery.
3. `E-03` Cloud sync loop with conflict handling + fallback telemetry.
4. Continue validating `E-04` DTOE gain dashboard metrics (adoption uplift / calibration error / confidence coverage).

## Demo Guidance (Reality-safe)
1. Lead with LIVE modules: Chat routing, LIX closed loop, Avatar trajectory, Destiny baseline.
2. Explicitly mark DTOE deep contract and cloud sync as roadmap items.
3. Show settings observability for execution credibility.
