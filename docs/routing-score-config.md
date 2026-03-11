# Lumi Routing Score Config

This config controls single-agent vs multi-agent routing thresholds without changing orchestration code.

## Default file

- `/Users/apple/Lumi Agent Simulator/config/routing-score-config.default.json`

## Web runtime override

The web Super Agent reads:

1. `LUMI_ROUTING_SCORE_CONFIG_JSON`
2. `VITE_LUMI_ROUTING_SCORE_CONFIG_JSON`
3. internal defaults

Example:

```bash
export LUMI_ROUTING_SCORE_CONFIG_JSON='{"thresholds":{"crossDomainMin":2,"capabilitiesMin":3,"dependencyMin":2,"riskMin":0.75,"requireEvidenceOnRisk":true},"complexityWeights":{"crossDomain":0.38,"capability":0.22,"dependency":0.4},"riskProfile":{"highRiskScore":0.9,"defaultRiskScore":0.34,"settingsRiskScore":0.28},"explicitMultiAgentKeywords":["并行协作","multi-agent"],"dependencyKeywords":["然后","并且","同时"],"highRiskKeywords":["法律","合同","医疗","投资","转账"]}'
npm run dev
```

## Android runtime override

`app-backend-host` exposes `BuildConfig.LUMI_ROUTING_SCORE_CONFIG_JSON`, injected from:

1. Gradle property `-PlumiRoutingScoreConfigJson=...`
2. env `LUMI_ROUTING_SCORE_CONFIG_JSON`
3. fallback to core defaults

Example:

```bash
./gradlew :app:installDebug -PlumiRoutingScoreConfigJson='{"thresholds":{"crossDomainMin":2,"capabilitiesMin":3,"dependencyMin":2,"riskMin":0.75,"requireEvidenceOnRisk":true},"complexityWeights":{"crossDomain":0.38,"capability":0.22,"dependency":0.4},"riskProfile":{"highRiskScore":0.9,"defaultRiskScore":0.34,"settingsRiskScore":0.28},"explicitMultiAgentKeywords":["并行协作","multi-agent"],"dependencyKeywords":["然后","并且","同时"],"highRiskKeywords":["法律","合同","医疗","投资","转账"]}'
```

## Expected behavior

- Updating scores only changes config input.
- `core-agent` and web `superAgentService` keep orchestration logic unchanged.
- Reason codes and routing mode should shift according to thresholds.
