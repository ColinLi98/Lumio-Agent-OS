# EPF-12 - Trial Persistence Activation and Deployment Config Closure

## Why EPF-12 is next

EPF-8 through EPF-11 established the B-end enterprise sandbox and shared trial workspace product layer:
- enterprise sandbox home
- guided scenario templates
- shared trial workspace semantics
- participant/session/seat/task/activity truth
- invite / accept / claim / release flows
- clear non-pilot evidence boundary
- explicit persistence visibility in-product

At this point, the next blocker is no longer product comprehension or collaboration semantics.
The next blocker is **deployment-backed persistence closure**.

The product now already tells the truth clearly:
- shared trial flows work
- invite/join/claim flows work
- but persistence is still `MEMORY_ONLY`
- and the exact blocker is missing `AGENT_KERNEL_POSTGRES_URL` or `AGENT_KERNEL_REDIS_URL`

That means the next step must not be another feature expansion.
It must be the closure of the deployment-side persistence path.

## Goal

Turn the shared enterprise sandbox from a browser-origin / memory-backed trial into a truly durable multi-session trial workspace by closing the deployment configuration path.

This milestone should make it possible to:
1. activate real server-backed persistence
2. verify that invite / join / claim / release state survives process restart and cross-instance access
3. expose accurate persistence activation state in product surfaces
4. keep sandbox/trial activity explicitly non-pilot

## Non-goals

Do **not** do the following in EPF-12:
- do not start real pilot activation
- do not promote sandbox activity into `REAL_PILOT`
- do not add new workflow families, connectors, or deployment modes
- do not broaden into full enterprise auth/account rollout
- do not rewrite the orchestrator or broad storage architecture
- do not treat infra config work as an excuse to expand product scope

## In scope

### 1. Deployment config closure
Close the current blocker by supporting and validating one real persistence backend configuration path.

At minimum, support one of:
- `AGENT_KERNEL_POSTGRES_URL`
- `AGENT_KERNEL_REDIS_URL`

This step should make the deployment state move from:
- `MEMORY_ONLY`

to:
- `SERVER_BACKED`

### 2. Runtime persistence truth
Make persistence activation visible as durable truth in product surfaces and service summaries.

Required semantics:
- persistence backend configured or not
- backend type
- activation success or failure
- exact blocker if not active
- cross-instance continuity expectations

### 3. Cross-session / cross-instance continuity checks
Once config is present, validate that the following survive beyond one browser tab:
- workspace summary
- participant roster
- accepted invites
- claimed seats
- released seats
- trial task records
- receipt/handoff summary visibility where already part of trial state

### 4. Persistence failure / fallback visibility
If deployment config is missing or invalid, continue showing:
- `MEMORY_ONLY`
- explicit blocker
- join limitations
- no false claim of shared persistence

If config becomes valid, update visibility to:
- `SERVER_BACKED`
- backend type
- persistence readiness summary

### 5. Documentation and operator readiness
Update the enterprise productization docs to reflect:
- what infra config is required
- what “server-backed trial workspace” means
- what is still not pilot activation
- how to validate persistence closure

## Design principles

1. **Deployment truth must be explicit**
   If persistence is missing, say so clearly.

2. **No fake durability**
   Browser-local continuity must not be described as true server-backed persistence.

3. **Server-backed still does not mean real pilot**
   Even after persistence closure, sandbox/trial remains rehearsal-only.

4. **Smallest useful closure first**
   One real configured backend is enough for this step.

5. **Keep the current product contract stable**
   This should be a deployment/config + bounded productization closure, not a new abstraction spree.

## Suggested milestone breakdown

### EPF-12A - Persistence config activation
- wire and validate one real backend config path
- ensure deployment blocker state is accurate

### EPF-12B - Cross-session/cross-instance continuity validation
- verify invite/join/claim/release/task state survives refresh/restart / separate browser access as supported by the chosen backend

### EPF-12C - Product surface truth
- update shell summaries / status text to clearly reflect server-backed activation
- keep non-pilot labeling intact

### EPF-12D - Docs / tests / status
- update docs and tests
- record exact deferred items still open after persistence closure

## Required tests

Add or update tests for at least:
1. configured backend changes persistence state from `MEMORY_ONLY` to `SERVER_BACKED`
2. invalid/missing backend keeps explicit blocker visibility
3. invite acceptance persists under server-backed mode
4. seat claim/release persists under server-backed mode
5. trial task detail persists under server-backed mode
6. cross-session continuity behaves correctly for the supported backend path
7. sandbox remains non-pilot after persistence activation

## Validation commands

Run and keep green:

```bash
npm run -s typecheck
npx vitest run tests/agentKernel.runtime.test.ts tests/agentKernel.storeAdapters.test.ts tests/agentKernel.api.test.ts tests/components/EnterpriseShellPanels.test.ts tests/components/EnterprisePlatformView.test.ts tests/localRoleLabTaskStore.test.ts
```

Add targeted persistence activation tests if needed, but keep the surface bounded.

## Definition of done

EPF-12 is done when:
1. one real backend config path is supported and validated
2. product truth can show `SERVER_BACKED` instead of `MEMORY_ONLY`
3. invite/join/claim/release/task continuity works across the supported persistence path
4. deployment blocker visibility remains accurate when config is missing
5. sandbox remains explicitly non-pilot
6. docs/status are updated with exact remaining deferred items

## Remaining likely deferred after EPF-12

Still deferred after this step:
- real pilot activation and `REAL_PILOT` evidence
- full enterprise auth/account rollout
- broader operator/admin mutation flows
- Android/C-end track
- richer multi-tenant / self-hosted / hybrid deployment options

## What comes next

After EPF-12, the most natural next step is:
- **EPF-13 - Trial Workspace Invite Identity Tightening and Account-Aware Access Readiness**
