# Connector Platform Minimum Closure

## Scope lock
- additive and backward-compatible only
- service-layer plus bounded connector API surface only
- no connector swamp
- no vendor matrix promises
- no weakening of local-first safety behavior

## Frozen pilot connector boundary
- transport path remains the Launch 06 HashiCorp Vault-backed outbound `HTTPS_WEBHOOK`
- the connector platform is now frozen to exactly two adapters:
  - `generic_https_webhook`
  - `advisor_crm_compliance_handoff`
- the business adapter is not a new vendor integration:
  - it maps the frozen advisor workflow handoff package onto the same bounded webhook transport

## Completed outputs
- Added a bounded connector platform contract in `services/agent-kernel/contracts.ts` for:
  - adapter definitions
  - connector health summaries
  - dispatch summaries
  - generic webhook dispatch input
  - advisor CRM/compliance handoff dispatch input
- Added `services/agent-kernel/connectorPlatform.ts` as the minimal platform seam over the existing vault-backed webhook runtime with:
  - frozen adapter registration
  - adapter-specific payload preparation
  - health inspection
  - retry / timeout / rate-limit / dead-letter handling
  - durable adapter metadata on delivery records
- Kept the generic webhook route on the frozen pilot transport while routing it through the connector platform:
  - `POST /api/agent-kernel/connectors/webhook/deliver`
- Added bounded platform/business routes:
  - `GET|POST /api/agent-kernel/connectors/platform/health`
  - `POST /api/agent-kernel/connectors/business/advisor-crm-compliance-handoff`
- Preserved backward compatibility for existing webhook delivery responses:
  - legacy `delivery`, `credential_health`, and `route_eligible` fields still exist
  - additive `adapter`, `connector_delivery`, `connector_health`, and `attempts` fields now expose platform truth
- Added minimum connector-platform conformance coverage for:
  - frozen adapter-set/health reporting
  - rate-limit enforcement and durable adapter metadata
  - timeout retry and dead-letter behavior
  - business payload transformation onto the frozen pilot handoff path

## Definition of done
- new connectors follow a defined platform contract and are testable against it
- one generic webhook path and one real business connector path operate through the same bounded platform boundary
- retry / timeout / rate-limit / dead-letter behavior is durable and auditable
- local-first safety semantics remain intact

## Explicitly deferred
- native vendor-specific connector expansion beyond the frozen webhook transport
- connector SDK/productization beyond the bounded pilot adapter contract
- self-serve connector onboarding and broad operator UX expansion
- broader provider/connector matrix rollout and any connector work from Launch 08 onward

## Validation
- `npm run -s typecheck`
- `npx vitest run tests/agentKernel.connectorPlatform.test.ts`
- `npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/agentKernel.events.test.ts tests/agentKernel.observability.test.ts tests/agentKernel.metricsExport.test.ts tests/agentKernel.ledgerProjection.test.ts`
- Android / host-side commands not run because this step did not touch Android or host runtime files
